# Deployment

Moving to production requires deploying your Inngest Functions on your favorite Cloud Provider and configuring it to allow the Inngest Platform to orchestrate runs:

**Deploy on any platform or runtime**: [Inngest Functions can be deployed to any serverless cloud or container running on any server.]('/docs-markdown/apps/cloud#sync-a-new-app-in-inngest-cloud')

**Deploy with Vercel**: [Use our Vercel Integration to deploy your Inngest Functions.]('/docs/deploy/vercel')

**Deploy with DigitalOcean**: [Deploy your Inngest Functions on DigitalOcean.]('/docs/deploy/digital-ocean')

**Deploy with Cloudflare Pages**: [Deploy your Inngest Functions on Cloudflare Pages.]('/docs/deploy/cloudflare')

**Deploy with Render**: [Deploy your Inngest Functions on Render.]('/docs/deploy/render')

**Self-host Inngest**: [Self-host Inngest on your own infrastructure.]('/docs/self-hosting')

## How Inngest handles Function Runs

The Inngest Platform hosts the Inngest Durable Execution Engine, responsible for triggering and maintaining the state of **Function runs happening on your Cloud Provider**:

The Inngest Platform relies on [Event](/docs/events/creating-an-event-key) and [Signing Keys](/docs-markdown/platform/signing-keys), as well as [other security mechanisms](/docs-markdown/learn/security), to communicate securely and reliably with the Inngest SDK.

Learn more on Inngest's Durable Execution Engine in our ["How Inngest Functions are executed" guide](/docs-markdown/learn/how-functions-are-executed).