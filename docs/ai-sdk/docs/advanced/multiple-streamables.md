
# Multiple Streams

## Multiple Streamable UIs

The AI SDK RSC APIs allow you to compose and return any number of streamable UIs, along with other data, in a single request. This can be useful when you want to decouple the UI into smaller components and stream them separately.

```tsx file='app/actions.tsx'
'use server';

import { createStreamableUI } from '@ai-sdk/rsc';

export async function getWeather() {
  const weatherUI = createStreamableUI();
  const forecastUI = createStreamableUI();

  weatherUI.update(<div>Loading weather...</div>);
  forecastUI.update(<div>Loading forecast...</div>);

  getWeatherData().then(weatherData => {
    weatherUI.done(<div>{weatherData}</div>);
  });

  getForecastData().then(forecastData => {
    forecastUI.done(<div>{forecastData}</div>);
  });

  // Return both streamable UIs and other data fields.
  return {
    requestedAt: Date.now(),
    weather: weatherUI.value,
    forecast: forecastUI.value,
  };
}
```

The client side code is similar to the previous example, but the [tool call](/docs/ai-sdk-core/tools-and-tool-calling) will return the new data structure with the weather and forecast UIs. Depending on the speed of getting weather and forecast data, these two components might be updated independently.

## Nested Streamable UIs

You can stream UI components within other UI components. This allows you to create complex UIs that are built up from smaller, reusable components. In the example below, we pass a `historyChart` streamable as a prop to a `StockCard` component. The StockCard can render the `historyChart` streamable, and it will automatically update as the server responds with new data.

```tsx file='app/actions.tsx'
async function getStockHistoryChart({ symbol: string }) {
  'use server';

  const ui = createStreamableUI(<Spinner />);

  // We need to wrap this in an async IIFE to avoid blocking.
  (async () => {
    const price = await getStockPrice({ symbol });

    // Show a spinner as the history chart for now.
    const historyChart = createStreamableUI(<Spinner />);
    ui.done(<StockCard historyChart={historyChart.value} price={price} />);

    // Getting the history data and then update that part of the UI.
    const historyData = await fetch('https://my-stock-data-api.com');
    historyChart.done(<HistoryChart data={historyData} />);
  })();

  return ui;
}
```


## Navigation

- [Prompt Engineering](/docs/advanced/prompt-engineering)
- [Stopping Streams](/docs/advanced/stopping-streams)
- [Backpressure](/docs/advanced/backpressure)
- [Caching](/docs/advanced/caching)
- [Multiple Streamables](/docs/advanced/multiple-streamables)
- [Rate Limiting](/docs/advanced/rate-limiting)
- [Rendering UI with Language Models](/docs/advanced/rendering-ui-with-language-models)
- [Language Models as Routers](/docs/advanced/model-as-router)
- [Multistep Interfaces](/docs/advanced/multistep-interfaces)
- [Sequential Generations](/docs/advanced/sequential-generations)
- [Vercel Deployment Guide](/docs/advanced/vercel-deployment-guide)


[Full Sitemap](/sitemap.md)
