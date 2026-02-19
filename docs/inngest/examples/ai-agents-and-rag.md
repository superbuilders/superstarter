# AI Agents and RAG

Inngest offers tools to support the development of AI-powered applications. Whether you're building AI agents, automating tasks, or orchestrating and managing AI workflows, Inngest provides features that accommodate various needs and requirements, such as concurrency, debouncing, or throttling (see ["Related Concepts"](#related-concepts)).

## Quick Snippet

Below is an example of a RAG workflow (from this [example app](https://github.com/inngest/inngest-demo-app/)). This asynchronous Inngest function summarizes content via GPT-4 by following these steps:

- Query a vector database for relevant content.
- Retrieve a transcript from an S3 file.
- Combine the transcript and queried content to generate a summary using GPT-4.
- Save the summary to a database and sends a notification to the client.

The function uses [Inngest steps](/docs-markdown/learn/inngest-steps) to guarantee automatic retries on failure.

```typescript {{ title: "./inngest/functions.ts" }}
export const summarizeContent = inngest.createFunction(
  { name: 'Summarize content via GPT-4', id: 'summarize-content' },
  { event: 'ai/summarize.content' },
  async ({ event, step, attempt }) => {
    const results = await step.run('query-vectordb', async () => {
      return {
        matches: [
          {
            id: 'vec3',
            score: 0,
            values: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
            text: casual.sentences(3),
          },
          {
            id: 'vec4',
            score: 0.0799999237,
            values: [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
            text: casual.sentences(3),
          },
          {
            id: 'vec2',
            score: 0.0800000429,
            values: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
            text: casual.sentences(3),
          },
        ],
        namespace: 'ns1',
        usage: { readUnits: 6 },
      };
    });

    const transcript = await step.run('read-s3-file', async () => {
      return casual.sentences(10);
    });

    // We can globally share throttle limited functions like this using invoke
    const completion = await step.invoke('generate-summary-via-gpt-4', {
      function: chatCompletion,
      data: {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that summaries content for product launches.',
          },
          {
            role: 'user',
            content: `Question: Summarize my content: \n${transcript}. \nInformation: ${results.matches
              .map((m) => m.text)
              .join('. ')}`,
          },
        ],
      },
    });
    // You might use the response like this:
    const summary = completion.choices[0].message.content;

    await step.run('save-to-db', async () => {
      return casual.uuid;
    });

    await step.run('websocket-push-to-client', async () => {
      return casual.uuid;
    });
    return { success: true, summaryId: casual.uuid };
  }
);
```

## App examples

Here are apps that use Inngest to power AI workflows:

## Resources

Check the resources below to learn more about working with AI using Inngest:

## Related concepts

- [Concurrency](/docs/guides/concurrency): control the number of steps executing code at any one time.
- [Debouncing](/docs-markdown/guides/debounce): delay function execution until a series of events are no longer received.
- [Prioritization](/docs-markdown/guides/priority): dynamically execute some runs ahead or behind others based on any data.
- [Rate limiting](/docs-markdown/guides/rate-limiting): limit on how many function runs can start within a time period.
- [Steps](/docs-markdown/reference/functions/step-run): individual tasks within a function that can be executed independently with a guaranteed retrial.
- [Throttling](/docs-markdown/guides/throttling): specify how many function runs can start within a time period.