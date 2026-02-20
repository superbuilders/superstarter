---
title: Speed Insights Metrics
product: vercel
url: /docs/speed-insights/metrics
type: conceptual
prerequisites:
  - /docs/speed-insights
related:
  - /docs/speed-insights/migrating-from-legacy
  - /docs/speed-insights/using-speed-insights
summary: Learn what each performance metric on Speed Insights means and how the scores are calculated.
---

# Speed Insights Metrics

## Real Experience Score (RES)

### Real user monitoring

While many performance measurement tools, like [Lighthouse](https://web.dev/measure/), estimate user experience based on lab simulations, Vercel's Real Experience Score (RES) uses real data points collected from your users' devices.

As a result, RES shows how real users experience your application. This real-time data helps you understand your application's performance and track changes as they happen.

You can use these insights to see how new deployments affect performance, helping you improve your application's user experience.

![Image](`/docs-assets/static/docs/concepts/speed-insights/v2/res-light.png`)

*An example of a Real Experience Score over time.*

> **💡 Note:** The timestamps in the Speed Insights view are in local time (not UTC).

## Core Web Vitals explained

The Core Web Vitals, as defined by Google and the [Web Performance Working Group](https://www.w3.org/webperf/ "What is the Web Performance Working Group?"), are key metrics that assess your web application's loading speed, responsiveness, and visual stability.

> **💡 Note:** Speed Insights now uses Lighthouse 10 scoring criteria instead of Lighthouse 6
> criteria as explained in [Updated Scoring
> Criteria](/docs/speed-insights/migrating-from-legacy#updated-scoring-criteria)

| Metric                                                            | Description                                                                                                                          | Target Value             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| [Largest Contentful Paint (LCP)](#largest-contentful-paint-lcp)   | Measures the time from page start to when the largest content element is fully visible.                                              | 2.5 seconds or less      |
| [Cumulative Layout Shift (CLS)](#cumulative-layout-shift-cls)     | Quantifies the fraction of layout shift experienced by the user over the lifespan of the page.                                       | 0.1 or less              |
| [Interaction to Next Paint (INP)](#interaction-to-next-paint-inp) | Measures the time from user interaction to when the browser renders the next frame.                                                  | 200 milliseconds or less |
| [First Contentful Paint (FCP)](#first-contentful-paint-fcp)       | Measures the time from page start to the rendering of the first piece of DOM content.                                                | 1.8 seconds or less      |
| [First Input Delay (FID)](#first-input-delay-fid)                 | Measures the time from a user's first interaction to the time the browser is able to respond.                                        | 100 milliseconds or less |
| [Total Blocking Time (TBT)](#total-blocking-time-tbt)             | Measures the total amount of time between FCP and TTI where the main thread was blocked long enough to prevent input responsiveness. | Under 800 milliseconds   |
| [Time to First Byte (TTFB)](#time-to-first-byte-ttfb)             | Measures the time from the request of a resource to when the first byte of a response begins to arrive.                              | Under 800 milliseconds   |

### Largest Contentful Paint (LCP)

[Largest Contentful Paint](https://web.dev/articles/lcp) (LCP) is a performance metric that measures the time from when the page starts loading to when the largest content element in the viewable screen is fully displayed. This could be an image, a video, or a block of text. LCP is important as it gives a measure of when the main content of the page is visible to the user.

**A good LCP time is considered to be 2.5 seconds or less**.

### Cumulative Layout Shift (CLS)

[Cumulative Layout Shift](https://web.dev/articles/cls) (CLS) is a performance metric that quantifies the fraction of layout shift experienced by the user. A layout shift occurs any time a visible element changes its position from one rendered frame to the next.

The score is calculated from the product of two measures:

- The impact fraction - the area of the viewport impacted by the shift
- The distance fraction - the distance the elements have moved relative to the viewport between frames

**A good CLS score is considered to be 0.1 or less**.

### Interaction to Next Paint (INP)

[Interaction to Next Paint](https://web.dev/articles/inp) (INP) is a metric that measures the time from when a user interacts with your site to the time the browser renders the next frame in response to that interaction.

This metric is used to gauge the responsiveness of a page to user interactions. The quicker the page responds to user input, the better the INP.

**Lower INP times are better, with an INP time of 200 milliseconds or less being considered good**.

### First Contentful Paint (FCP)

[First Contentful Paint](https://web.dev/articles/fcp) (FCP) is a performance metric that measures the time from the moment the page starts loading to the moment the first piece of content from the Document Object Model (DOM) is rendered on the screen. This could be any content from the webpage such as an image, a block of text, or a canvas render. The FCP is important because it indicates when the user first sees something useful on the screen, providing an insight into your webpage's loading speed.

**Lower FCP times are better, with an FCP time of 1.8 seconds or less being considered good**.

## Other metrics

### Time to First Byte (TTFB)

Time to First Byte (TTFB) measures the time between the request for a resource and when the first byte of a response begins to arrive.

**Lower TTFB times are better, with a good TTFB time being considered as under 800 milliseconds**.

### First Input Delay (FID)

[First Input Delay](https://web.dev/articles/fid) (FID) measures the time from when a user first interacts with your site (by selecting a link for example) to the time when the browser is able to respond to that interaction. This metric is important on pages where the user needs to do something, because it captures some of the delay that users feel when trying to interact with the page.

**A good FID score is 100 milliseconds or less**.

As [stated by Google](https://web.dev/vitals/#lab-tools-to-measure-core-web-vitals), simulating an environment to measure Web Vitals necessitates a different approach since no real user request is involved.

### Total Blocking Time (TBT)

Total Blocking Time (TBT) quantifies how non-interactive a page is. It measures the total time between the First Contentful Paint (FCP) and Time to Interactive (TTI) where the main thread was blocked for long enough to prevent user input. Long tasks (over 50 ms) block the main thread, preventing the user from interacting with the page. The sum of the time portions exceeding 50 ms constitutes the TBT.

**Lower TBT times are better, with a good TBT time being considered as under 800 milliseconds**.

> **💡 Note:** For more in-depth information related to performance metrics, visit the
> PageSpeed Insights [
> documentation](https://developers.google.com/speed/docs/insights/v5/about).

## How the scores are determined

Vercel calculates performance scores using real-world data obtained from the [HTTP Archive](https://httparchive.org/). This process involves assigning each collected metric (e.g., [First Contentful Paint (FCP)](#first-contentful-paint-fcp)) a score ranging from 0 to 100. The score is determined based on where the raw metric value falls within a [log-normal distribution](# "What is log-normal distribution?") derived from actual website performance data.

For instance, if [HTTP Archive](https://httparchive.org/) data shows that the top-performing sites render the Largest Contentful Paint (LCP) in approximately 1220 milliseconds, this value is mapped to a score of 99. Vercel then uses this correlation, along with your project's specific LCP metric value, to compute your LCP score.

The Real Experience Score is a weighted average of all individual metric scores. Vercel has assigned each metric a specific weighting, which best represents user's perceived performance on mobile and desktop devices.

## Understanding data points

In the context of Vercel's Speed Insights, a data point is a single unit of information that represents a measurement of a specific Web Vital metric during a user's visit to your website.

Data points are collected on hard navigations, which in the case of Next.js apps, are only the first-page view in a session. During a user's visit, data points are gathered during the initial page load, user interaction, and upon leaving the page.

As of now, up to 6 data points can be potentially tracked per visit:

- On page load: Time to First Byte ([TTFB](#time-to-first-byte-ttfb)) and First Contentful Paint ([FCP](#first-contentful-paint-fcp))
- On interaction: First Input Delay ([FID](#first-input-delay-fid)) and Largest Contentful Paint ([LCP](#largest-contentful-paint-lcp))
- On leave: Interaction to Next Paint ([INP](#interaction-to-next-paint-inp)), Cumulative Layout Shift ([CLS](#cumulative-layout-shift-cls)), and, if not already sent, Largest Contentful Paint ([LCP](#largest-contentful-paint-lcp)).

The collection of metrics may vary depending on how users interact with or exit the page. On average, you can expect to collect between 3 and 6 metrics per visit.

These data points provide insights into various performance aspects of your website, such as the time it takes to display the first content ([FCP](#first-contentful-paint-fcp)) and the delay between user input and response ([FID](#first-input-delay-fid)). By analyzing these data points, you can gain valuable information to optimize and enhance the performance of your website.

### How the percentages are calculated?

By default, the user experience percentile is set to P75, which offers a balanced overview of the majority of user experiences. You can view the data for the other percentiles by selecting them in the time-based line graph.

The chosen percentile corresponds to the proportion of users who experience a load time faster than a specific value. Here's how each percentile is defined:

- **P75**: Represents the experience of the fastest 75% of your users, excluding the slowest 25%.
- **P90**: Represents the experience of the fastest 90% of your users, excluding the slowest 10%.
- **P95**: Represents the experience of the fastest 95% of your users, excluding the slowest 5%.
- **P99**: Represents the experience of the fastest 99% of your users, excluding the slowest 1%.

For instance, a P75 score of 1 second for [First Contentful Paint (FCP)](#first-contentful-paint-fcp) means that 75% of your users experience an FCP faster than 1 second. Similarly, a P99 score of 8 seconds means 99% of your users experience an FCP faster than 8 seconds.

## Interpreting performance scores

Performance metrics, including the [Real Experience Score](#real-user-monitoring), the [Virtual Experience Score](#predictive-performance-metrics-with-virtual-experience-score), and the individual [Core Web Vitals](#core-web-vitals-explained) (along with [Other Web Vitals](#other-metrics)) are color-coded as follows:

- **0 to 49 (red)**: Poor
- **50 to 89 (orange)**: Needs Improvement
- **90 to 100 (green)**: Good

Aim for 'Good' scores (90 to 100) for both Real and Virtual Experience Scores. Keep in mind that reaching a score of 100 is extremely challenging due to diminishing returns. For example, improving from 99 to 100 is much harder than moving from 90 to 94, as the effort needed increases dramatically at higher scores.

### Implications of scores for the end-user experience

Higher Real Experience and Virtual Experience Scores generally translate to better end-user experiences, making it worthwhile to strive for improved Web Vital Scores. Performance scores are color-coded and improvements within the same color range will enhance user experience but don't significantly impact search engine rankings.

If you aim to boost your site's search ranking, aim to move your scores into a higher color-coded category, for instance, from 'Needs Improvement' (orange) to 'Good' (green). This change reflects substantial improvements in performance and is more likely to be rewarded with higher search engine rankings.

## Predictive performance metrics with Virtual Experience Score

The Real Experience Score ([RES](#real-user-monitoring)) displayed in the Speed Insights tab is derived from actual data points collected from your visitors' devices. As such, it can only offer insight into your app's performance post-deployment. While it's critical to gather these real-world data points, they only reflect user experiences after the fact, limiting their predictive power.

In contrast, the Virtual Experience Score (VES) is a predictive performance metric that allows you to anticipate the impact of changes on your app's performance, ensuring there's no regression in user experience. This metric is provided by [integrations](/marketplace) like [Checkly](/marketplace/checkly) that employ Deployment Checks.

Setting up an integration supporting performance checks enables these checks to run for each deployment. These checks assess whether the user experience is likely to improve or deteriorate with the proposed changes, helping guide your decision-making process.

Like RES, the VES draws from four separate Speed Insights, albeit with some variations:

- In place of the First Input Delay ([FID](#first-input-delay-fid)) Core Web Vital, the Virtual Experience Score utilizes Total Blocking Time ([TBT](#total-blocking-time-tbt))
- The specific device type used for checks depends on the Integration you've set up. For example, Checkly only uses "Desktop" for determining scores

## Breaking down data in Speed Insights

Speed Insights offers a variety of views to help you analyze your application's performance data. This allows you to identify areas that need improvement and make informed decisions about how to optimize your site. To learn more, see [Using Speed Insights](/docs/speed-insights/using-speed-insights).


---

[View full sitemap](/docs/sitemap)
