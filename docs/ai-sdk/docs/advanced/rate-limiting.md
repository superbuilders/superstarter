
# Rate Limiting

Rate limiting helps you protect your APIs from abuse. It involves setting a
maximum threshold on the number of requests a client can make within a
specified timeframe. This simple technique acts as a gatekeeper,
preventing excessive usage that can degrade service performance and incur
unnecessary costs.

## Rate Limiting with Vercel KV and Upstash Ratelimit

In this example, you will protect an API endpoint using [Vercel KV](https://vercel.com/storage/kv)
and [Upstash Ratelimit](https://github.com/upstash/ratelimit).

```tsx filename='app/api/generate/route.ts'
import kv from '@vercel/kv';
import { streamText } from 'ai';
__PROVIDER_IMPORT__;
import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Create Rate limit
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.fixedWindow(5, '30s'),
});

export async function POST(req: NextRequest) {
  // call ratelimit with request ip
  const ip = req.ip ?? 'ip';
  const { success, remaining } = await ratelimit.limit(ip);

  // block the request if unsuccessful
  if (!success) {
    return new Response('Ratelimited!', { status: 429 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: __MODEL__,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
```

## Simplify API Protection

With Vercel KV and Upstash Ratelimit, it is possible to protect your APIs
from such attacks with ease. To learn more about how Ratelimit works and
how it can be configured to your needs, see [Ratelimit Documentation](https://upstash.com/docs/oss/sdks/ts/ratelimit/overview).


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
