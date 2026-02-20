# Setup



This guide walks you through setting up AI Elements in your project.

## Prerequisites

Before installing AI Elements, ensure your environment meets these requirements:

* **Node.js** 18 or later
* **React** 19
* **Next.js** 14+ (App Router recommended)
* **AI SDK** installed and configured
* **shadcn/ui** initialized in your project
* **Tailwind CSS** 4

<Callout>
  If you don't have shadcn/ui installed, running any AI Elements install command
  will automatically set it up for you.
</Callout>

## AI Gateway (Recommended)

We recommend using [AI Gateway](https://vercel.com/docs/ai-gateway) for model access as it offers a single API key for multiple model providers, built-in fallback support, unified billing and more.

Add `AI_GATEWAY_API_KEY` to your `.env.local` file. [Get your API key here](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys\&title=Get%20your%20AI%20Gateway%20key).

## Installing Components

Use the AI Elements CLI to add components:

<CodeBlockTabs defaultValue="npm">
  <CodeBlockTabsList>
    <CodeBlockTabsTrigger value="npm">
      npm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="pnpm">
      pnpm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="yarn">
      yarn
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="bun">
      bun
    </CodeBlockTabsTrigger>
  </CodeBlockTabsList>

  <CodeBlockTab value="npm">
    ```bash
    npx ai-elements@latest add message
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm dlx ai-elements@latest add message
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn dlx ai-elements@latest add message
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun x ai-elements@latest add message
    ```
  </CodeBlockTab>
</CodeBlockTabs>

Or use the shadcn CLI:

<CodeBlockTabs defaultValue="npm">
  <CodeBlockTabsList>
    <CodeBlockTabsTrigger value="npm">
      npm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="pnpm">
      pnpm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="yarn">
      yarn
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="bun">
      bun
    </CodeBlockTabsTrigger>
  </CodeBlockTabsList>

  <CodeBlockTab value="npm">
    ```bash
    npx shadcn@latest add @ai-elements/message
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm dlx shadcn@latest add @ai-elements/message
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn dlx shadcn@latest add @ai-elements/message
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun x shadcn@latest add @ai-elements/message
    ```
  </CodeBlockTab>
</CodeBlockTabs>

Components are added to `@/components/ai-elements/` by default.

## Verify Installation

After installing a component, verify it works:

1. Check that the component file exists in your components directory
2. Import and use it in a page:

```tsx title="app/page.tsx"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

export default function Page() {
  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>Hello, world!</MessageResponse>
      </MessageContent>
    </Message>
  );
}
```

3. Run your development server and confirm the component renders

## Next Steps

* Learn how to [use components](/docs/usage) in your application
* Browse available [components](/components) to find what you need
* Check [troubleshooting](/docs/troubleshooting) if you run into issues
