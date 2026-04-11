---
name: data-analysis
description: >-
  Statistical analysis and trend detection expertise for channel strategy.
  Methods for competitor analysis, audience trend detection, topic
  saturation scoring, and data visualization rules. Use when analyzing
  channel metrics, evaluating competitor strategies, or detecting content
  trends.
user-invocable: true
---

# Data Analysis Expertise

Domain knowledge for applying quantitative methods to YouTube competitor and channel data. This skill provides statistical methods, NLP patterns, trend detection heuristics, visualization rules, and topic saturation scoring. The analysis workflow procedure (how to run a full competitor analysis pipeline) lives in the strategy-lead agent body, not here.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/data-analysis/insights.md`
   - Even if empty, this confirms the learning loop is active

## Statistical Methods [DETERMINISTIC]

Quantitative methods for analyzing channel and competitor performance data. Every claim must reference specific data points -- analysis produces actionable intelligence, not raw numbers.

### Descriptive Statistics

| Metric | Method | When to Use |
|--------|--------|-------------|
| Central tendency | Median (not mean) for views, engagement | Median resists skew from viral outliers. Always prefer median for YouTube metrics. |
| Spread | IQR (interquartile range) | Shows typical performance range without outlier distortion |
| Distribution shape | Histogram + skewness coefficient | Identify whether a channel's performance is normally distributed or long-tailed |

**Rules:**
- Always report sample size alongside statistics. "Median views: 45K (n=87)" not "Median views: 45K"
- For sample sizes under 30, report confidence intervals. Small samples demand uncertainty disclosure.
- Separate metrics by content type if the channel produces multiple formats (shorts vs long-form)

### Outlier Detection

Identify videos that over- or under-perform relative to channel averages.

| Method | Threshold | Interpretation |
|--------|-----------|----------------|
| Z-score | abs(z) > 2.0 | Video performance deviates significantly from channel average |
| IQR method | Below Q1 - 1.5*IQR or above Q3 + 1.5*IQR | More robust to non-normal distributions |
| Modified Z-score (MAD) | abs(modified z) > 3.5 | Use when data is heavily skewed (common for YouTube views) |

**Report outliers with:** z-score, the metric they deviate on (views, engagement rate, growth velocity), and a hypothesis for why (topic, title, thumbnail, external event, algorithm push).

### Comparative Analysis (Benchmarking)

Compare channel metrics against competitors:

- **Always benchmark against competitor medians, not means.** Means are skewed by viral outliers and misrepresent typical performance.
- **Normalize by subscriber count** when comparing channels of different sizes. Use views-per-subscriber or engagement-per-subscriber ratios.
- **Time-window matching:** Compare the same time period across channels. A channel's last 20 videos vs a competitor's last 20 videos, not a channel's last month vs a competitor's last year.
- **Category segmentation:** Compare within content category. A mystery channel's performance benchmarks against other mystery/true-crime channels, not general YouTube averages.

### Time Series Analysis

Detect trends over upload windows:

| Technique | Purpose | Application |
|-----------|---------|-------------|
| Rolling averages (7-day, 30-day) | Separate signal from noise | Plot both; signal is real when 7-day crosses 30-day with 3+ confirming points |
| Growth velocity | Measure acceleration, not just level | First derivative of rolling average. Positive = growing, negative = declining. |
| Seasonal decomposition | Identify cyclical patterns | Mystery/true-crime content often spikes in October and January (post-holiday binge) |
| Change point detection | Identify when a trend shifted | Mark events (algorithm changes, viral videos, topic shifts) at change points |

### Confidence and Significance

- For comparisons: use Mann-Whitney U test (non-parametric) rather than t-test. YouTube data is rarely normally distributed.
- Report p-values and effect sizes. "Channel A outperforms Channel B on engagement (U=234, p=0.003, effect size r=0.42)" is actionable. "Channel A seems better" is not.
- Distinguish between "this data shows X" and "this data suggests X." Statistical significance matters.
- Flag data quality issues (small sample, missing data, scraping gaps) before presenting conclusions.

## NLP Analysis Patterns [DETERMINISTIC]

Text analysis methods for extracting signal from titles, descriptions, tags, and comments.

### Title Analysis

| Method | Purpose | Tools |
|--------|---------|-------|
| Keyword extraction | Identify topic clusters and naming patterns | Python: `collections.Counter`, regex patterns |
| Sentiment classification | Categorize title tone (question, statement, emotional hook, clickbait) | Pattern matching for "?", emotional words, superlatives |
| Length analysis | Correlate title length with performance | Character count vs views regression |
| Entity extraction | Identify named people, places, events | spaCy NER or regex for capitalized phrases |

**Title tone categories:**
- **Question-based:** "What Really Happened at...?" -- creates curiosity gap
- **Statement-based:** "The Truth About..." -- implies authority
- **Emotional hook:** "The Most Disturbing Case..." -- triggers emotional response
- **List/number:** "5 Unsolved Cases..." -- promises structured content
- **Name-led:** "John Doe: The Man Who..." -- relies on subject notoriety

Track which tone categories correlate with performance in the mystery/true-crime niche.

### Description Mining

- Extract keyword density from first 200 characters (above-the-fold on YouTube)
- Identify hashtag patterns and their correlation with discoverability
- Track description length trends across competitors (are descriptions getting longer/shorter in the niche?)

### Tag Clustering

- Group video tags by semantic similarity
- Identify over-used tags (appearing in 80%+ of competitor videos -- low differentiation value)
- Identify under-used tags (appearing in < 10% but on high-performing videos -- potential opportunity)
- Cross-reference tag clusters with performance to identify high-value tag strategies

### Comment Sentiment Analysis

- Categorize comments into: positive engagement, negative feedback, content requests, corrections/fact-checks
- Track request patterns ("you should cover...", "do a video on...") as topic demand signals
- High correction/fact-check comment density may indicate content accuracy issues

### Tool References

- **Python:** pandas for data manipulation, matplotlib/seaborn for visualization
- **NLP:** spaCy for entity recognition, NLTK for tokenization and sentiment, scikit-learn for clustering
- **Note:** These are methodology references. The actual scripts live in `strategy/` and will be integrated in Phase 6.

## Trend Detection [HEURISTIC]

Identifying rising, stable, and declining topics in the mystery/true-crime niche. Trend detection is inherently judgment-based -- these heuristics provide structure for that judgment.

### Rising Topic Indicators

A topic is rising when multiple independent signals converge:

| Signal | Weight | How to Detect |
|--------|--------|---------------|
| Upload frequency increasing | High | 3+ channels covering the topic within 30 days when it was previously uncovered |
| View velocity above niche average | High | New videos on this topic getting 2x+ the niche median views in first 7 days |
| Search volume increasing | Medium | Google Trends data showing upward trajectory |
| Mainstream media coverage | Medium | News outlets covering the story (creates spillover search demand) |
| Comment/request mentions | Low | Viewers requesting coverage in comments on related videos |

### Saturated Topic Indicators

A topic is saturated when additional coverage yields diminishing returns:

| Signal | Weight | How to Detect |
|--------|--------|---------------|
| Competitor convergence | High | 5+ channels covered the same topic within 60 days |
| View decline on new uploads | High | Each new video on this topic gets fewer views than the last |
| Thumbnail/title similarity | Medium | Multiple channels using near-identical visual hooks |
| Comment fatigue | Medium | "Not another video about X" sentiment in comments |
| No new angles available | High | All publicly available sources already covered by existing videos |

### Seasonal Patterns in Mystery/True-Crime

| Period | Pattern | Opportunity |
|--------|---------|-------------|
| October | Horror-adjacent, cult, and supernatural topics spike | Release darker content 2-3 weeks before Halloween |
| January | Post-holiday binge-watching. True crime series perform well. | Longer-form, multi-part content for binge consumption |
| Summer | Lighter engagement overall. Short-form outperforms long-form. | Shorter videos, more accessible topics |
| Anniversary windows | Renewed interest when case anniversaries approach | Track key case dates, prepare content 2-4 weeks ahead |

### Competitor Convergence Analysis

When multiple channels in the niche converge on the same topic simultaneously:

- **First-mover advantage is real but decays.** The first video on a topic gets the most views, but quality matters more than speed after the first 48 hours.
- **Differentiation check:** If competitors have covered a topic, identify what angle remains unexplored. The question is not "has this been covered?" but "what hasn't been said?"
- **Saturation risk assessment:** Count competing videos, assess their quality and depth, identify remaining unexplored angles. If angles remain, the topic is viable despite competition.

## Visualization Rules [DETERMINISTIC]

Every chart must communicate one clear insight. A chart without a takeaway is decoration, not analysis.

### Chart Type Selection

| Data Pattern | Chart Type | When to Use |
|-------------|-----------|-------------|
| Comparison across categories | Bar chart (horizontal preferred) | Comparing channel metrics, topic performance |
| Trends over time | Line chart | Upload frequency, view trends, subscriber growth |
| Correlation between two metrics | Scatter plot | Title length vs views, upload frequency vs engagement |
| Multi-dimensional patterns | Heatmap | Upload schedule optimization, topic-performance matrix |
| Distribution shape | Histogram | View distribution, engagement rate distribution |
| Part-of-whole | **Never use pie charts** | Use stacked bar or treemap instead |

### Labeling Standards

Every chart must include:
1. **Title:** What is being shown (descriptive, not clever)
2. **Axis labels:** With units. "Views (thousands)" not just "Views"
3. **One-sentence caption:** The takeaway. What should the reader conclude from this chart?
4. **Data source note:** Date range, sample size, source of data

### Styling Conventions

- **Background:** Dark theme (#1a1a2e or similar) -- matches channel aesthetic
- **Accent colors:** Consistent palette across a report. Use distinct hues for different channels/categories.
- **Font:** Sans-serif, readable at export resolution
- **Output format:** PNG, saved to session/project directory. Reference by path in analysis reports.

### Anti-Patterns

- No 3D charts. Ever.
- No dual-axis charts unless clearly labeled and unavoidable.
- No chart with more than 7 data series. Aggregate or filter.
- No logarithmic scales without explicit notation and justification.

## Topic Saturation Scoring [HEURISTIC]

A structured framework for evaluating whether a documentary topic is oversaturated, viable, or underserved.

### Saturation Score Components

Score each component 1-5 (1 = heavily saturated, 5 = wide open):

| Component | Weight | Score 1 (Saturated) | Score 5 (Open) |
|-----------|--------|---------------------|----------------|
| **Competition density** | 30% | 10+ dedicated videos from major channels in last 6 months | 0-1 videos, none from major channels |
| **Recency of coverage** | 20% | Multiple videos in last 30 days | No coverage in last 12 months |
| **Remaining angles** | 25% | All known angles thoroughly covered | Multiple unexplored angles with available sources |
| **Source availability** | 15% | All sources already featured in existing videos | Unique primary sources not yet used in any video |
| **Audience demand** | 10% | Comment requests declining, search volume flat | Active requests, rising search volume |

### Composite Score Interpretation

| Score Range | Assessment | Recommendation |
|-------------|-----------|----------------|
| 4.0 - 5.0 | Underserved | Strong opportunity. Prioritize for production. |
| 3.0 - 3.9 | Viable | Proceed if a unique angle exists. Differentiation is key. |
| 2.0 - 2.9 | Competitive | Only proceed if you have a distinctive source or approach competitors lack. |
| 1.0 - 1.9 | Oversaturated | Avoid unless a major new development (court ruling, discovery) changes the landscape. |

### Saturation Assessment Process

1. **Inventory competitors:** Search YouTube for the topic. Count dedicated videos (not passing mentions) from channels with 10K+ subscribers.
2. **Assess recency:** When were the most recent competitor videos published? Cluster by date.
3. **Map covered angles:** List the narrative angles each competitor used. What questions did they answer?
4. **Identify gaps:** What questions remain unanswered? What sources were not used? What perspective is missing?
5. **Check source uniqueness:** Are there primary sources (court documents, interviews, archives) that no competitor has used?
6. **Gauge demand:** Check Google Trends, YouTube search suggestions, comment sections for audience interest signals.

## Script References

- `.claude/scripts/strategy/channel_assistant/analyzer.py` -- Competitor channel analysis (metrics extraction, benchmarking, trend detection)
- `.claude/scripts/strategy/channel_assistant/topics.py` -- Topic generation and saturation scoring against competitor landscape
- `.claude/scripts/strategy/channel_assistant/scraper.py` -- YouTube data collection (channel metadata, video metrics, comments)

## Reflection Phase

After completing data analysis work:
1. Re-read your output from start to finish
2. Identify one specific insight about what worked or what to improve
3. Append one line to `.claude/skills/data-analysis/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- insights compound over time
