"""Dashboard generator — self-contained HTML with Plotly charts and pizzint design.

Produces a single HTML file at config.DASHBOARD_PATH containing:
- KPI stat cards
- Plotly interactive charts (competitor bars, upload trends, cluster bubbles)
- Pillar gap progress bars
- Keyword table with opportunity highlighting
- Convergence alert cards

Fonts are embedded as base64 data URIs from config.FONT_DIR.
"""

from __future__ import annotations

import base64
import statistics
from collections import defaultdict
from datetime import datetime
from html import escape
from pathlib import Path
from typing import TYPE_CHECKING

import plotly.graph_objects as go

if TYPE_CHECKING:
    from .config import Config
    from .database import Database

# -- Pizzint design tokens --------------------------------------------------

_BG = "#1a202c"
_SURFACE = "#1e2939"
_ACCENT = "#00b7d7"
_BORDER = "#4a5565"
_TEXT = "#ffffff"
_TEXT_MUTED = "#364153"
_SUCCESS = "#00c758"
_WARNING = "#edb200"
_DANGER = "#fb2c36"
_INFO = "#3b82f6"

_COLORWAY = [_ACCENT, _SUCCESS, _WARNING, _DANGER, _INFO]

_STATUS_COLORS = {
    "underserved": _SUCCESS,
    "competitive": _WARNING,
    "saturated": _DANGER,
}


def _fmt_number(n: int | float | None) -> str:
    """Format a number with comma separators for display."""
    if n is None:
        return "0"
    if isinstance(n, float):
        return f"{n:,.1f}"
    return f"{n:,}"


class DashboardGenerator:
    """Generate a self-contained pizzint-themed HTML dashboard.

    Parameters
    ----------
    db : Database
        Initialized Database instance with analysis data.
    config : Config
        Pipeline configuration with paths.
    """

    def __init__(self, db: Database, config: Config) -> None:
        self.db = db
        self.config = config

    # ------------------------------------------------------------------
    # Font embedding
    # ------------------------------------------------------------------

    def _load_font_base64(self, font_name: str) -> str | None:
        """Read a TTF from FONT_DIR and return as base64 string, or None."""
        font_path = self.config.FONT_DIR / font_name
        if not font_path.exists():
            return None
        data = font_path.read_bytes()
        return base64.b64encode(data).decode("ascii")

    def _build_font_face_css(self) -> str:
        """Build @font-face declarations with embedded base64 data URIs."""
        fonts = {
            "VT323": "VT323-Regular.ttf",
            "Geist": "Geist-Regular.ttf",
            "GeistMono": "GeistMono-Regular.ttf",
        }
        declarations: list[str] = []
        for family, filename in fonts.items():
            b64 = self._load_font_base64(filename)
            if b64:
                declarations.append(
                    f"@font-face {{\n"
                    f'  font-family: "{family}";\n'
                    f'  src: url("data:font/ttf;base64,{b64}") format("truetype");\n'
                    f"  font-weight: normal;\n"
                    f"  font-style: normal;\n"
                    f"}}"
                )
        return "\n".join(declarations)

    # ------------------------------------------------------------------
    # Plotly theme
    # ------------------------------------------------------------------

    def _plotly_template(self) -> go.layout.Template:
        """Create a Plotly template with pizzint design tokens."""
        return go.layout.Template(
            layout=go.Layout(
                paper_bgcolor=_BG,
                plot_bgcolor=_SURFACE,
                font=dict(family="Geist, sans-serif", color=_TEXT),
                xaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
                yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
                colorway=_COLORWAY,
            )
        )

    # ------------------------------------------------------------------
    # Chart generators
    # ------------------------------------------------------------------

    def _chart_competitor_bars(self) -> str:
        """Horizontal bar chart of watch-list channels by median views."""
        conn = self.db.connect()
        try:
            channels = conn.execute(
                "SELECT youtube_id, name FROM channels WHERE tier = 'watch_list'"
            ).fetchall()

            names: list[str] = []
            medians: list[float] = []

            for ch in channels:
                videos = conn.execute(
                    "SELECT views FROM videos WHERE channel_id = ? AND views IS NOT NULL",
                    (ch["youtube_id"],),
                ).fetchall()
                views = [v["views"] for v in videos]
                if views:
                    names.append(ch["name"])
                    medians.append(statistics.median(views))
        finally:
            conn.close()

        if not names:
            return "<p style='color:#ffffff;text-align:center;'>No watch-list channel data.</p>"

        fig = go.Figure(
            go.Bar(
                x=medians,
                y=names,
                orientation="h",
                marker_color=_ACCENT,
            )
        )
        fig.update_layout(
            template=self._plotly_template(),
            title="Competitor Channels — Median Views",
            xaxis_title="Median Views",
            yaxis_title="",
            height=max(300, len(names) * 40 + 100),
            margin=dict(l=200, r=20, t=50, b=40),
        )
        return fig.to_html(full_html=False, include_plotlyjs=False)

    def _chart_upload_trends(self) -> str:
        """Line chart of upload frequency (30-day rolling per channel)."""
        conn = self.db.connect()
        try:
            channels = conn.execute("SELECT youtube_id, name FROM channels").fetchall()
            traces: list[go.Scatter] = []

            for ch in channels:
                videos = conn.execute(
                    "SELECT upload_date FROM videos "
                    "WHERE channel_id = ? AND upload_date IS NOT NULL "
                    "ORDER BY upload_date",
                    (ch["youtube_id"],),
                ).fetchall()

                if len(videos) < 2:
                    continue

                # Parse dates (supports YYYY-MM-DD and YYYYMMDD).
                dates: list[datetime] = []
                for v in videos:
                    date_str = v["upload_date"]
                    try:
                        if len(date_str) == 8 and date_str.isdigit():
                            dates.append(datetime.strptime(date_str, "%Y%m%d"))
                        else:
                            dates.append(datetime.strptime(date_str[:10], "%Y-%m-%d"))
                    except ValueError:
                        continue

                if len(dates) < 2:
                    continue

                dates.sort()

                # 30-day rolling count: for each video's date, count uploads in prior 30 days.
                x_vals: list[str] = []
                y_vals: list[int] = []
                for i, d in enumerate(dates):
                    cutoff = d.replace(hour=0, minute=0, second=0)
                    window_start = cutoff.timestamp() - 30 * 86400
                    count = sum(
                        1 for dd in dates
                        if window_start <= dd.timestamp() <= cutoff.timestamp()
                    )
                    x_vals.append(d.strftime("%Y-%m-%d"))
                    y_vals.append(count)

                traces.append(
                    go.Scatter(
                        x=x_vals,
                        y=y_vals,
                        mode="lines+markers",
                        name=ch["name"],
                    )
                )
        finally:
            conn.close()

        if not traces:
            return "<p style='color:#ffffff;text-align:center;'>No upload trend data.</p>"

        fig = go.Figure(data=traces)
        fig.update_layout(
            template=self._plotly_template(),
            title="Upload Frequency — 30-Day Rolling",
            xaxis_title="Date",
            yaxis_title="Videos (last 30 days)",
            height=350,
            margin=dict(l=60, r=20, t=50, b=40),
        )
        return fig.to_html(full_html=False, include_plotlyjs=False)

    def _chart_cluster_bubbles(self) -> str:
        """Bubble chart of topic clusters: X=avg_views, Y=opportunity, size=video_count."""
        conn = self.db.connect()
        try:
            clusters = conn.execute(
                "SELECT label, avg_views, saturation_score, video_count, status "
                "FROM topic_clusters"
            ).fetchall()
        finally:
            conn.close()

        if not clusters:
            return "<p style='color:#ffffff;text-align:center;'>No cluster data.</p>"

        labels = [c["label"] for c in clusters]
        avg_views = [c["avg_views"] or 0 for c in clusters]
        opportunity = [1 - (c["saturation_score"] or 0) for c in clusters]
        sizes = [max((c["video_count"] or 1) * 8, 10) for c in clusters]
        colors = [_STATUS_COLORS.get(c["status"], _ACCENT) for c in clusters]

        fig = go.Figure(
            go.Scatter(
                x=avg_views,
                y=opportunity,
                mode="markers+text",
                text=labels,
                textposition="top center",
                textfont=dict(color=_TEXT, size=11),
                marker=dict(size=sizes, color=colors, opacity=0.8, line=dict(width=1, color=_BORDER)),
            )
        )
        fig.update_layout(
            template=self._plotly_template(),
            title="Topic Clusters — Opportunity vs. Views",
            xaxis_title="Avg Views",
            yaxis_title="Opportunity (1 - saturation)",
            height=400,
            margin=dict(l=60, r=20, t=50, b=40),
        )
        return fig.to_html(full_html=False, include_plotlyjs=False)

    def _chart_pillar_gaps(self) -> str:
        """HTML progress bars showing pillar gap scores from cluster data."""
        conn = self.db.connect()
        try:
            clusters = conn.execute(
                "SELECT label, keywords, saturation_score FROM topic_clusters"
            ).fetchall()
        finally:
            conn.close()

        if not clusters:
            return "<p style='color:#ffffff;text-align:center;'>No pillar data.</p>"

        # Each cluster label represents a pillar. Compute gap = 1 - saturation.
        rows_html: list[str] = []
        for c in clusters:
            label = escape(c["label"])
            saturation = c["saturation_score"] or 0
            gap_pct = round((1 - saturation) * 100)
            bar_color = _SUCCESS if gap_pct > 60 else (_WARNING if gap_pct > 30 else _DANGER)

            rows_html.append(
                f'<div style="margin-bottom:12px;">'
                f'  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">'
                f'    <span style="font-family:Geist,sans-serif;color:{_TEXT};">{label}</span>'
                f'    <span style="font-family:GeistMono,monospace;color:{_TEXT};">{gap_pct}%</span>'
                f'  </div>'
                f'  <div style="background:{_BORDER};border-radius:4px;height:12px;overflow:hidden;">'
                f'    <div style="background:{bar_color};width:{gap_pct}%;height:100%;border-radius:4px;"></div>'
                f'  </div>'
                f'</div>'
            )

        return (
            f'<div style="padding:16px;">'
            f'  <h3 style="font-family:VT323,monospace;color:{_ACCENT};margin:0 0 16px 0;">Pillar Gaps</h3>'
            f'  {"".join(rows_html)}'
            f'</div>'
        )

    # ------------------------------------------------------------------
    # HTML builders
    # ------------------------------------------------------------------

    def _build_kpi_cards(self) -> str:
        """Build 5 KPI stat cards from database aggregates."""
        conn = self.db.connect()
        try:
            channel_count = conn.execute("SELECT COUNT(*) AS c FROM channels").fetchone()["c"]
            video_count = conn.execute("SELECT COUNT(*) AS c FROM videos").fetchone()["c"]
            cluster_count = conn.execute("SELECT COUNT(*) AS c FROM topic_clusters").fetchone()["c"]

            # Niche avg engagement rate across watch-list channels.
            engagement_row = conn.execute(
                "SELECT AVG((v.likes + v.comment_count) * 1.0 / NULLIF(v.views, 0)) AS avg_eng "
                "FROM videos v "
                "JOIN channels c ON v.channel_id = c.youtube_id "
                "WHERE c.tier = 'watch_list' AND v.views > 0"
            ).fetchone()
            avg_eng = engagement_row["avg_eng"] if engagement_row and engagement_row["avg_eng"] is not None else 0.0
            avg_eng_display = f"{avg_eng * 100:.2f}%"

            latest_run = conn.execute(
                "SELECT completed_at FROM pipeline_runs "
                "WHERE status = 'success' ORDER BY completed_at DESC LIMIT 1"
            ).fetchone()
            last_updated = latest_run["completed_at"][:10] if latest_run else "Never"
        finally:
            conn.close()

        cards = [
            ("Competitors", _fmt_number(channel_count), _ACCENT),
            ("Videos Indexed", _fmt_number(video_count), _INFO),
            ("Topic Clusters", _fmt_number(cluster_count), _SUCCESS),
            ("Avg Engagement", avg_eng_display, _WARNING),
            ("Pipeline Freshness", last_updated, _TEXT_MUTED),
        ]

        items: list[str] = []
        for label, value, color in cards:
            items.append(
                f'<div style="'
                f"background:{_SURFACE};"
                f"border:1px solid {_BORDER};"
                f"border-radius:4px;"
                f"padding:16px;"
                f"text-align:center;"
                f"min-width:140px;"
                f'">'
                f'<div style="font-family:GeistMono,monospace;font-size:28px;color:{color};margin-bottom:4px;">'
                f"{escape(str(value))}</div>"
                f'<div style="font-family:Geist,sans-serif;font-size:13px;color:{_TEXT};">'
                f"{escape(label)}</div>"
                f"</div>"
            )

        return (
            f'<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">'
            f'{"".join(items)}'
            f"</div>"
        )

    def _build_keyword_table(self) -> str:
        """Build a sortable keyword table; highlight opportunity rows green."""
        conn = self.db.connect()
        try:
            keywords = conn.execute(
                "SELECT keyword, source, frequency, channels_count, avg_views "
                "FROM keywords ORDER BY frequency DESC LIMIT 50"
            ).fetchall()
        finally:
            conn.close()

        if not keywords:
            return "<p style='color:#ffffff;text-align:center;'>No keyword data.</p>"

        th_style = (
            f"text-align:left;padding:8px;border-bottom:1px solid {_BORDER};"
            f"color:{_ACCENT};font-family:VT323,monospace;cursor:pointer;"
            f"user-select:none;"
        )
        th_style_r = th_style.replace("text-align:left", "text-align:right")

        header = (
            f'<tr id="kw-header">'
            f'<th style="{th_style}" onclick="sortKwTable(0)">Keyword</th>'
            f'<th style="{th_style}" onclick="sortKwTable(1)">Source</th>'
            f'<th style="{th_style_r}" onclick="sortKwTable(2)">Freq</th>'
            f'<th style="{th_style_r}" onclick="sortKwTable(3)">Channels</th>'
            f'<th style="{th_style_r}" onclick="sortKwTable(4)">Avg Views</th>'
            f"</tr>"
        )

        rows: list[str] = []
        for kw in keywords:
            is_opportunity = (
                (kw["channels_count"] or 0) < 3 and (kw["avg_views"] or 0) > 200000
            )
            row_bg = f"background:rgba(0,199,88,0.12);" if is_opportunity else ""
            rows.append(
                f'<tr style="{row_bg}">'
                f'<td style="padding:8px;color:{_TEXT};font-family:Geist,sans-serif;">{escape(kw["keyword"])}</td>'
                f'<td style="padding:8px;color:{_TEXT};font-family:Geist,sans-serif;">{escape(kw["source"])}</td>'
                f'<td style="padding:8px;text-align:right;color:{_TEXT};font-family:GeistMono,monospace;">{kw["frequency"] or 0}</td>'
                f'<td style="padding:8px;text-align:right;color:{_TEXT};font-family:GeistMono,monospace;">{kw["channels_count"] or 0}</td>'
                f'<td style="padding:8px;text-align:right;color:{_TEXT};font-family:GeistMono,monospace;">{_fmt_number(kw["avg_views"])}</td>'
                f"</tr>"
            )

        sort_script = """<script>
(function() {
  var _kwSortDir = {};
  window.sortKwTable = function(colIdx) {
    var table = document.getElementById('kw-table');
    var tbody = table.querySelector('tbody');
    var rows = Array.from(tbody.querySelectorAll('tr'));
    var asc = !_kwSortDir[colIdx];
    _kwSortDir = {};
    _kwSortDir[colIdx] = asc;
    rows.sort(function(a, b) {
      var aText = a.cells[colIdx] ? a.cells[colIdx].innerText.trim() : '';
      var bText = b.cells[colIdx] ? b.cells[colIdx].innerText.trim() : '';
      var aNum = parseFloat(aText.replace(/[^0-9.-]/g, ''));
      var bNum = parseFloat(bText.replace(/[^0-9.-]/g, ''));
      var cmp = isNaN(aNum) || isNaN(bNum)
        ? aText.localeCompare(bText)
        : aNum - bNum;
      return asc ? cmp : -cmp;
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
  };
})();
</script>"""

        return (
            f'<div style="overflow-x:auto;">'
            f'<table id="kw-table" style="width:100%;border-collapse:collapse;background:{_SURFACE};border-radius:4px;">'
            f"<thead>{header}</thead>"
            f'<tbody>{"".join(rows)}</tbody>'
            f"</table>"
            f"</div>"
            f"{sort_script}"
        )

    def _build_convergence_alerts(self) -> str:
        """Build alert cards for convergence trend signals."""
        conn = self.db.connect()
        try:
            signals = conn.execute(
                "SELECT ts.details, ts.confidence, tc.label "
                "FROM trend_signals ts "
                "LEFT JOIN topic_clusters tc ON ts.cluster_id = tc.cluster_id "
                "WHERE ts.signal_type = 'convergence' "
                "ORDER BY ts.confidence DESC"
            ).fetchall()
        finally:
            conn.close()

        if not signals:
            return ""

        cards: list[str] = []
        for s in signals:
            confidence_pct = round((s["confidence"] or 0) * 100)
            cards.append(
                f'<div style="'
                f"background:{_SURFACE};"
                f"border-left:4px solid {_WARNING};"
                f"border-radius:4px;"
                f"padding:12px 16px;"
                f"margin-bottom:8px;"
                f'">'
                f'<div style="font-family:VT323,monospace;color:{_WARNING};font-size:16px;margin-bottom:4px;">'
                f"CONVERGENCE — {escape(s['label'] or 'Unknown')}</div>"
                f'<div style="font-family:Geist,sans-serif;color:{_TEXT};font-size:13px;">'
                f"{escape(s['details'] or '')} (confidence: {confidence_pct}%)</div>"
                f"</div>"
            )

        return (
            f'<div>'
            f'<h3 style="font-family:VT323,monospace;color:{_WARNING};margin:0 0 12px 0;">Convergence Alerts</h3>'
            f'{"".join(cards)}'
            f"</div>"
        )

    # ------------------------------------------------------------------
    # Compositor
    # ------------------------------------------------------------------

    def generate(self) -> Path:
        """Compose the full HTML dashboard and write to config.DASHBOARD_PATH.

        Returns the output path.
        """
        font_css = self._build_font_face_css()
        kpi_html = self._build_kpi_cards()
        competitor_chart = self._chart_competitor_bars()
        upload_chart = self._chart_upload_trends()
        cluster_chart = self._chart_cluster_bubbles()
        pillar_html = self._chart_pillar_gaps()
        keyword_html = self._build_keyword_table()
        alert_html = self._build_convergence_alerts()

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Channel Strategy Dashboard</title>
<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>
<style>
{font_css}

* {{
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}}

body {{
  background: {_BG};
  color: {_TEXT};
  font-family: Geist, sans-serif;
  padding: 24px;
  min-height: 100vh;
}}

h1 {{
  font-family: VT323, monospace;
  color: {_ACCENT};
  font-size: 32px;
  margin-bottom: 24px;
  text-align: center;
}}

h2 {{
  font-family: VT323, monospace;
  color: {_TEXT};
  font-size: 22px;
  margin-bottom: 12px;
}}

.dashboard-grid {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}}

.row-full {{
  grid-column: 1 / -1;
}}

.card {{
  background: {_SURFACE};
  border: 1px solid {_BORDER};
  border-radius: 4px;
  padding: 20px;
  overflow: hidden;
}}

@media (max-width: 900px) {{
  .dashboard-grid {{
    grid-template-columns: 1fr;
  }}
}}
</style>
</head>
<body>

<h1>Channel Strategy Dashboard</h1>

<!-- Row 1: KPI Cards -->
<div style="max-width:1400px;margin:0 auto 24px auto;">
  {kpi_html}
</div>

<div class="dashboard-grid">

  <!-- Row 2: Competitor bars + Upload trends -->
  <div class="card">
    <h2>Competitors</h2>
    {competitor_chart}
  </div>
  <div class="card">
    <h2>Upload Trends</h2>
    {upload_chart}
  </div>

  <!-- Row 3: Cluster bubbles + Pillar gaps -->
  <div class="card">
    <h2>Topic Clusters</h2>
    {cluster_chart}
  </div>
  <div class="card">
    {pillar_html}
  </div>

  <!-- Row 4: Keywords + Alerts -->
  <div class="card">
    <h2>Keywords</h2>
    {keyword_html}
  </div>
  <div class="card">
    {alert_html}
  </div>

</div>

</body>
</html>"""

        output_path = self.config.DASHBOARD_PATH
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(html, encoding="utf-8")
        return output_path
