# Deployment

> Deploy your AgentKit networks to production.

Deploying an AgentKit network to production is straightforward but there are a few things to consider:

* **Scalability**: Your Network Agents rely on tools which interact with external systems. You'll need to ensure that your deployment environment can scale to handle the requirements of your network.
* **Reliability**: You'll need to ensure that your AgentKit network can handle failures and recover gracefully.
* **Multitenancy**: You'll need to ensure that your AgentKit network can handle multiple users and requests concurrently without compromising on performance or security.

All the above can be easily achieved by using Inngest alongside AgentKit.
By installing the Inngest SDK, your AgentKit network will automatically benefit from:

* [**Multitenancy support**](/advanced-patterns/multitenancy) with fine grained concurrency and throttling configuration
* **Retrieable and [parallel tool calls](/advanced-patterns/retries)** for reliable and performant tool usage
* **LLM requests offloading** to improve performance and reliability for Serverless deployments
* **Live and detailed observability** with step-by-step traces including the Agents inputs/outputs and token usage

You will find below instructions to configure your AgentKit network deployment with Inngest.

## Deploying your AgentKit network with Inngest

Deploying your AgentKit network with Inngest to benefit from automatic retries, LLM requests offloading and live observability only requires
a few steps:

### 1. Install the Inngest SDK

  ```shell npm theme={"system"}
  npm install inngest
  ```

  ```shell pnpm theme={"system"}
  pnpm install inngest
  ```

  ```shell yarn theme={"system"}
  yarn add inngest
  ```

### 2. Serve your AgentKit network over HTTP

Update your AgentKit network to serve over HTTP as follows:

```ts {1, 8-13} theme={"system"}
import { createNetwork } from '@inngest/agent-kit';
import { createServer } from '@inngest/agent-kit/server';

const network = createNetwork({
  name: 'My Network',
  agents: [/* ... */],
});

const server = createServer({
  networks: [network],
});

server.listen(3010, () => console.log("Agent kit running!"));
```

### 3. Deploy your AgentKit network

**Configuring environment variables**

[Create an Inngest account](https://www.inngest.com/?ref=agentkit-docs-deployment) and open the top right menu to access your Event Key and Signing Key:

Then configure the following environment variables into your deployment environment (*ex: AWS, Vercel, GCP*):

* `INNGEST_API_KEY`: Your Event Key
* `INNGEST_SIGNING_KEY`: Your Signing Key

**Deploying your AgentKit network**

You can now deploy your AgentKit network to your preferred cloud provider.
Once deployed, copy the deployment URL for the final configuration step.

### 4. Sync your AgentKit network with the Inngest Platform

On your Inngest dashboard, click on the "Sync new app" button at the top right of the screen.

Then, paste the deployment URL into the "App URL" by adding `/api/inngest` to the end of the URL:

  **You sync is failing?**

  Read our [troubleshooting guide](https://www.inngest.com/docs/apps/cloud?ref=agentkit-docs-deployment#troubleshooting) for more information.

Once the sync succeeds, you can navigate to the *Functions* tabs where you will find your AgentKit network:

Your AgentKit network can now be triggered manually from the Inngest Dashboard or [from your app using `network.run()`](/concepts/networks).

## Configuring Multitenancy and Retries

    Configure usage limits based on users or organizations.

    Learn how to configure retries for your AgentKit Agents and Tools.
