"""3-pass analysis engine: stats, NLP (TF-IDF + YAKE), and trends.

Pass 1 — Stats: per-channel aggregates and outlier detection.
Pass 2 — NLP: title clustering (KMeans on TF-IDF), keyword extraction (YAKE),
          and title-pattern classification.
Pass 3 — Trends: topic saturation scoring and cross-channel convergence detection.

All results are persisted to the SQLite database via the Database class.
"""

from __future__ import annotations

import math
import re
import statistics
from collections import defaultdict
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import numpy as np
import yake
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score

if TYPE_CHECKING:
    from .database import Database


def _parse_date(date_str: str) -> datetime | None:
    """Parse a date string in YYYY-MM-DD or YYYYMMDD format."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


class Analyzer:
    """3-pass analysis engine operating on the channel_assistant database.

    Parameters
    ----------
    db : Database
        Initialized Database instance.
    outlier_multiplier : float
        Minimum views/median ratio to flag a video as an outlier.
    cluster_min_k, cluster_max_k : int
        Range of K to evaluate when choosing the best number of clusters.
    convergence_window_days : int
        Default window for convergence detection.
    convergence_min_channels : int
        Minimum distinct channels to trigger a convergence signal.
    saturation_decay_lambda : float
        Exponential decay parameter for saturation scoring.
    """

    def __init__(
        self,
        db: Database,
        *,
        outlier_multiplier: float = 2.0,
        cluster_min_k: int = 3,
        cluster_max_k: int = 25,
        convergence_window_days: int = 30,
        convergence_min_channels: int = 3,
        saturation_decay_lambda: float = 0.01,
    ) -> None:
        self.db = db
        self.outlier_multiplier = outlier_multiplier
        self.cluster_min_k = cluster_min_k
        self.cluster_max_k = cluster_max_k
        self.convergence_window_days = convergence_window_days
        self.convergence_min_channels = convergence_min_channels
        self.saturation_decay_lambda = saturation_decay_lambda

        # Populated by cluster_titles(), consumed by trends pass.
        self._labels: np.ndarray | None = None
        self._all_videos: list[dict] | None = None
        self._saved_clusters: list | None = None

    # ------------------------------------------------------------------
    # Pass 1 — Stats
    # ------------------------------------------------------------------

    def compute_channel_stats(self, channel_id: str) -> dict:
        """Compute summary statistics for a single channel.

        Returns dict with: total_videos, avg_views, median_views,
        upload_frequency_days, most_recent_upload.
        """
        videos = self.db.get_videos_by_channel(channel_id)
        total_videos = len(videos)

        if total_videos == 0:
            return {
                "channel_id": channel_id,
                "total_videos": 0,
                "avg_views": 0,
                "median_views": 0,
                "upload_frequency_days": None,
                "most_recent_upload": None,
                "engagement_rate": 0.0,
            }

        valid_views = [v["views"] for v in videos if v["views"] is not None]
        avg_views = int(sum(valid_views) / len(valid_views)) if valid_views else 0
        median_views = int(statistics.median(valid_views)) if valid_views else 0

        # Upload frequency from parsed dates.
        dates: list[tuple[datetime, str]] = []
        for v in videos:
            if v["upload_date"]:
                parsed = _parse_date(v["upload_date"])
                if parsed:
                    dates.append((parsed, v["upload_date"]))

        upload_frequency_days = None
        most_recent_upload = None

        if dates:
            dates.sort(key=lambda x: x[0])
            most_recent_upload = dates[-1][1]
            if len(dates) >= 2:
                total_span = (dates[-1][0] - dates[0][0]).days
                intervals = len(dates) - 1
                upload_frequency_days = round(total_span / intervals, 1)

        # Engagement rate: (likes + comments) / views across all videos.
        total_likes = sum(v["likes"] for v in videos if v["likes"] is not None)
        total_comments = sum(
            v["comment_count"] for v in videos if v["comment_count"] is not None
        )
        total_views = sum(valid_views) if valid_views else 0
        engagement_rate = (
            round((total_likes + total_comments) / total_views, 4)
            if total_views > 0
            else 0.0
        )

        return {
            "channel_id": channel_id,
            "total_videos": total_videos,
            "avg_views": avg_views,
            "median_views": median_views,
            "upload_frequency_days": upload_frequency_days,
            "most_recent_upload": most_recent_upload,
            "engagement_rate": engagement_rate,
        }

    def detect_outliers(self, channel_id: str) -> list[dict]:
        """Detect videos whose views exceed outlier_multiplier * median.

        Returns list of dicts sorted by multiplier descending.
        """
        videos = self.db.get_videos_by_channel(channel_id)
        valid_views = [v["views"] for v in videos if v["views"] is not None]
        if not valid_views:
            return []

        median = statistics.median(valid_views)
        if median == 0:
            return []

        outliers = []
        for v in videos:
            if v["views"] is None:
                continue
            multiplier = round(v["views"] / median, 2)
            if multiplier > self.outlier_multiplier:
                outliers.append(
                    {
                        "video_id": v["video_id"],
                        "title": v["title"],
                        "views": v["views"],
                        "multiplier": multiplier,
                        "upload_date": v["upload_date"],
                    }
                )

        outliers.sort(key=lambda x: x["multiplier"], reverse=True)
        return outliers

    def compute_all_stats(self) -> dict:
        """Run stats + outliers for every channel in the database.

        Returns a summary dict keyed by channel_id.
        """
        channels = self.db.get_all_channels()
        results: dict[str, dict] = {}
        for ch in channels:
            cid = ch["youtube_id"]
            results[cid] = {
                "stats": self.compute_channel_stats(cid),
                "outliers": self.detect_outliers(cid),
            }
        return results

    # ------------------------------------------------------------------
    # Pass 2 — NLP
    # ------------------------------------------------------------------

    def cluster_titles(self) -> list[dict]:
        """Cluster all video titles using TF-IDF + KMeans.

        Evaluates K from cluster_min_k to cluster_max_k, picks the K
        with the highest silhouette score.  Saves clusters and
        video-cluster assignments to the database.

        Returns list of cluster dicts with: label, keywords, video_count, avg_views.
        """
        # Gather all videos across channels.
        channels = self.db.get_all_channels()
        all_videos: list[dict] = []
        for ch in channels:
            rows = self.db.get_videos_by_channel(ch["youtube_id"])
            for r in rows:
                all_videos.append(
                    {
                        "video_id": r["video_id"],
                        "channel_id": r["channel_id"],
                        "title": r["title"],
                        "views": r["views"],
                        "upload_date": r["upload_date"],
                    }
                )

        if len(all_videos) < 2:
            return []

        titles = [v["title"] for v in all_videos]

        # TF-IDF vectorisation.
        vectorizer = TfidfVectorizer(max_features=500, stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(titles)
        feature_names = vectorizer.get_feature_names_out()

        # Determine optimal K via silhouette score.
        max_k = min(self.cluster_max_k, len(all_videos) - 1)
        min_k = min(self.cluster_min_k, max_k)

        best_k = min_k
        best_score = -1.0

        for k in range(min_k, max_k + 1):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(tfidf_matrix)
            if len(set(labels)) < 2:
                continue
            score = silhouette_score(tfidf_matrix, labels)
            if score > best_score:
                best_score = score
                best_k = k

        # Final clustering with best K.
        km_final = KMeans(n_clusters=best_k, random_state=42, n_init=10)
        labels = km_final.fit_predict(tfidf_matrix)

        # Build cluster summaries.
        cluster_dicts: list[dict] = []
        for cluster_idx in range(best_k):
            mask = labels == cluster_idx
            indices = np.where(mask)[0]

            # Top 5 TF-IDF terms for this cluster (by centroid weight).
            centroid = km_final.cluster_centers_[cluster_idx]
            top_term_indices = centroid.argsort()[-5:][::-1]
            top_terms = [feature_names[i] for i in top_term_indices]

            video_count = int(mask.sum())
            cluster_views = [
                all_videos[i]["views"]
                for i in indices
                if all_videos[i]["views"] is not None
            ]
            avg_views = (
                sum(cluster_views) / len(cluster_views) if cluster_views else 0.0
            )

            cluster_dicts.append(
                {
                    "label": top_terms[0],
                    "keywords": ", ".join(top_terms),
                    "video_count": video_count,
                    "avg_views": round(avg_views, 2),
                }
            )

        # Persist clusters.
        self.db.save_clusters(cluster_dicts)

        # Persist video-cluster assignments.
        saved_clusters = self.db.get_clusters()
        # Map label index to cluster_id.  saved_clusters are ordered by
        # saturation_score ASC (all NULL at this point), so insertion-order
        # matches cluster_dicts order (SQLite rowid ASC for NULL values).
        label_to_cluster_id: dict[int, int] = {}
        for idx, sc in enumerate(saved_clusters):
            label_to_cluster_id[idx] = sc["cluster_id"]

        conn = self.db.connect()
        try:
            tfidf_dense = tfidf_matrix.toarray()
            for vid_idx, label_val in enumerate(labels):
                cluster_id = label_to_cluster_id[int(label_val)]
                # Similarity = cosine-like score from centroid distance.
                centroid = km_final.cluster_centers_[int(label_val)]
                similarity = float(
                    np.dot(tfidf_dense[vid_idx], centroid)
                    / (
                        np.linalg.norm(tfidf_dense[vid_idx])
                        * np.linalg.norm(centroid)
                        + 1e-10
                    )
                )
                conn.execute(
                    "INSERT OR REPLACE INTO video_clusters (video_id, cluster_id, similarity) "
                    "VALUES (?, ?, ?)",
                    (all_videos[vid_idx]["video_id"], cluster_id, round(similarity, 4)),
                )
            conn.commit()
        finally:
            conn.close()

        # Cache for trends pass.
        self._labels = labels
        self._all_videos = all_videos
        self._saved_clusters = saved_clusters

        return cluster_dicts

    def extract_keywords(self, max_keywords: int = 30) -> list[dict]:
        """Extract top keywords from all video titles using YAKE.

        For each keyword, counts frequency across titles and distinct channels.
        Saves to DB and returns keyword dicts.
        """
        channels = self.db.get_all_channels()
        all_videos: list[dict] = []
        for ch in channels:
            rows = self.db.get_videos_by_channel(ch["youtube_id"])
            for r in rows:
                all_videos.append(
                    {
                        "title": r["title"],
                        "channel_id": r["channel_id"],
                        "views": r["views"],
                    }
                )

        if not all_videos:
            return []

        # Concatenate all titles for YAKE.
        text = ". ".join(v["title"] for v in all_videos)
        kw_extractor = yake.KeywordExtractor(lan="en", n=2, top=max_keywords)
        yake_keywords = kw_extractor.extract_keywords(text)

        keyword_results: list[dict] = []
        for kw_text, _score in yake_keywords:
            kw_lower = kw_text.lower()
            frequency = 0
            channel_set: set[str] = set()
            view_sum = 0
            view_count = 0
            for v in all_videos:
                if kw_lower in v["title"].lower():
                    frequency += 1
                    channel_set.add(v["channel_id"])
                    if v["views"] is not None:
                        view_sum += v["views"]
                        view_count += 1

            avg_views = view_sum / view_count if view_count else 0.0

            keyword_results.append(
                {
                    "keyword": kw_text,
                    "source": "yake",
                    "frequency": frequency,
                    "channels_count": len(channel_set),
                    "avg_views": round(avg_views, 2),
                }
            )

        self.db.save_keywords(keyword_results)
        return keyword_results

    def classify_title_patterns(self) -> dict[str, int]:
        """Classify each video title into a pattern category.

        Priority order: question > list > number > emotional > declarative.
        Returns dict of pattern name to count.
        """
        _EMOTIONAL_WORDS = {
            "shocking",
            "terrifying",
            "horrifying",
            "disturbing",
            "dangerous",
            "deadly",
            "evil",
            "dark",
            "mysterious",
            "secret",
            "secrets",
            "hidden",
            "chilling",
            "haunting",
            "sinister",
            "creepy",
            "nightmare",
            "horror",
            "brutal",
            "tragic",
        }
        _QUESTION_STARTERS = {"who", "what", "why", "how", "where", "when"}

        channels = self.db.get_all_channels()
        patterns: dict[str, int] = defaultdict(int)

        for ch in channels:
            videos = self.db.get_videos_by_channel(ch["youtube_id"])
            for v in videos:
                title = v["title"]
                title_lower = title.lower().strip()
                first_word = title_lower.split()[0] if title_lower.split() else ""

                if "?" in title or first_word in _QUESTION_STARTERS:
                    patterns["question"] += 1
                elif re.match(r"^\d", title_lower):
                    patterns["list"] += 1
                elif re.search(r"\d", title_lower):
                    patterns["number"] += 1
                elif any(w in title_lower.split() for w in _EMOTIONAL_WORDS):
                    patterns["emotional"] += 1
                else:
                    patterns["declarative"] += 1

        return dict(patterns)

    # ------------------------------------------------------------------
    # Pass 3 — Trends
    # ------------------------------------------------------------------

    def compute_saturation_scores(self) -> list[dict]:
        """Compute exponential-decay saturation scores per cluster.

        Must be called after cluster_titles(). Uses cached labels and
        saved clusters. Normalises scores to [0, 1] and classifies:
        <0.3 = underserved, 0.3-0.7 = competitive, >0.7 = saturated.
        Updates topic_clusters in DB.
        """
        if self._labels is None or self._saved_clusters is None or self._all_videos is None:
            return []

        now = datetime.now(timezone.utc)
        raw_scores: list[float] = []
        cluster_infos: list[dict] = []

        for idx, sc in enumerate(self._saved_clusters):
            mask = self._labels == idx
            indices = np.where(mask)[0]

            score = 0.0
            for i in indices:
                upload_str = self._all_videos[i].get("upload_date")
                parsed = _parse_date(upload_str) if upload_str else None
                if parsed:
                    days_since = (now - parsed.replace(tzinfo=timezone.utc)).days
                    score += math.exp(-self.saturation_decay_lambda * days_since)

            raw_scores.append(score)
            cluster_infos.append(
                {
                    "cluster_id": sc["cluster_id"],
                    "label": sc["label"],
                    "raw_score": score,
                }
            )

        # Normalise to [0, 1].
        max_score = max(raw_scores) if raw_scores else 1.0
        if max_score == 0:
            max_score = 1.0

        results: list[dict] = []
        conn = self.db.connect()
        try:
            for info, raw in zip(cluster_infos, raw_scores):
                normalised = raw / max_score
                if normalised < 0.3:
                    status = "underserved"
                elif normalised <= 0.7:
                    status = "competitive"
                else:
                    status = "saturated"

                conn.execute(
                    "UPDATE topic_clusters SET saturation_score = ?, status = ? "
                    "WHERE cluster_id = ?",
                    (round(normalised, 4), status, info["cluster_id"]),
                )

                results.append(
                    {
                        "cluster_id": info["cluster_id"],
                        "label": info["label"],
                        "saturation_score": round(normalised, 4),
                        "status": status,
                    }
                )
            conn.commit()
        finally:
            conn.close()

        return results

    def detect_convergence(
        self,
        window_days: int | None = None,
        min_channels: int | None = None,
    ) -> list[dict]:
        """Detect clusters where multiple channels published recently.

        A convergence signal fires when >= min_channels distinct channels
        have videos in the same cluster within the last window_days.
        """
        if window_days is None:
            window_days = self.convergence_window_days
        if min_channels is None:
            min_channels = self.convergence_min_channels

        if self._labels is None or self._saved_clusters is None or self._all_videos is None:
            return []

        now = datetime.now(timezone.utc)
        signals: list[dict] = []

        for idx, sc in enumerate(self._saved_clusters):
            mask = self._labels == idx
            indices = np.where(mask)[0]

            recent_channels: set[str] = set()
            for i in indices:
                upload_str = self._all_videos[i].get("upload_date")
                parsed = _parse_date(upload_str) if upload_str else None
                if parsed:
                    days_since = (now - parsed.replace(tzinfo=timezone.utc)).days
                    if days_since <= window_days:
                        recent_channels.add(self._all_videos[i]["channel_id"])

            if len(recent_channels) >= min_channels:
                signals.append(
                    {
                        "cluster_id": sc["cluster_id"],
                        "signal_type": "convergence",
                        "confidence": round(
                            len(recent_channels) / min_channels, 2
                        ),
                        "window_days": window_days,
                        "details": (
                            f"{len(recent_channels)} channels published in "
                            f"cluster '{sc['label']}' within {window_days} days"
                        ),
                    }
                )

        if signals:
            self.db.save_trend_signals(signals)

        return signals

    # ------------------------------------------------------------------
    # Orchestrator
    # ------------------------------------------------------------------

    def run_all(self) -> dict:
        """Execute all 3 passes and return an aggregate summary.

        Returns dict with keys: stats, clusters, keywords, patterns, trends.
        """
        # Pass 1 — Stats.
        stats = self.compute_all_stats()

        # Pass 2 — NLP.
        clusters = self.cluster_titles()
        keywords = self.extract_keywords()
        patterns = self.classify_title_patterns()

        # Pass 3 — Trends.
        saturation = self.compute_saturation_scores()
        convergence = self.detect_convergence()

        return {
            "stats": stats,
            "clusters": clusters,
            "keywords": keywords,
            "patterns": patterns,
            "trends": {
                "saturation": saturation,
                "convergence": convergence,
            },
        }
