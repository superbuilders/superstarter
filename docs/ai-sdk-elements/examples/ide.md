# IDE



<Preview path="demo-cursor" type="block" className="p-0" />

## Tutorial

Let's walk through how to build an AI-powered IDE using AI Elements. Our example will include a file tree, code block viewer, terminal output, task queue, and chat interface with streaming responses.

### Setup

First, set up a new Next.js repo and cd into it by running the following command (make sure you choose to use Tailwind in the project setup):

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
    npx create-next-app@latest ai-ide && cd ai-ide
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm dlx create-next-app@latest ai-ide && cd ai-ide
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn dlx create-next-app@latest ai-ide && cd ai-ide
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun x create-next-app@latest ai-ide && cd ai-ide
    ```
  </CodeBlockTab>
</CodeBlockTabs>

Run the following command to install AI Elements. This will also set up shadcn/ui if you haven't already configured it:

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
    npx ai-elements@latest
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm dlx ai-elements@latest
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn dlx ai-elements@latest
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun x ai-elements@latest
    ```
  </CodeBlockTab>
</CodeBlockTabs>

Now, install the required dependencies:

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
    npm i nanoid shiki lucide-react
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm add nanoid shiki lucide-react
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn add nanoid shiki lucide-react
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun add nanoid shiki lucide-react
    ```
  </CodeBlockTab>
</CodeBlockTabs>

We're now ready to start building our IDE!

### Client

Let's build the IDE step by step. We'll create the component structure with a three-panel layout: file tree on the left, code and terminal in the center, and the AI chat on the right.

First, import the necessary AI Elements components in your `app/page.tsx`:

<SourceCode path="demo-cursor" />

## Key Features

The IDE example demonstrates several powerful features:

* **File Tree Navigation**: The `FileTree` component displays a hierarchical file structure with expandable folders and file selection.
* **Code Display**: The `CodeBlock` component renders syntax-highlighted code with line numbers and a copy button.
* **Terminal Output**: The `Terminal` component shows streaming build output with ANSI color support.
* **Plan Component**: The `Plan` displays the AI's implementation strategy with collapsible sections.
* **Task Queue**: The `Queue` component organizes pending and completed tasks in separate sections.
* **Chat Interface**: The `Conversation` and `Message` components create a streaming chat experience.
* **Checkpoints**: The `Checkpoint` component allows users to mark and restore conversation states.
* **Streaming Support**: All components support real-time streaming for a responsive user experience.

You now have a working AI-powered IDE interface! Feel free to extend it with additional features like file editing, multiple tabs, or connect it to a real AI backend using the AI SDK.
