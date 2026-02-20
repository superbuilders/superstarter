# Workflow



<Preview path="workflow" type="block" className="p-0" />

## Tutorial

Let's walk through how to build a workflow visualization using AI Elements. Our example will include custom nodes with headers, content, and footers, along with animated and temporary edge types.

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
    npx create-next-app@latest ai-workflow && cd ai-workflow
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm dlx create-next-app@latest ai-workflow && cd ai-workflow
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn dlx create-next-app@latest ai-workflow && cd ai-workflow
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun x create-next-app@latest ai-workflow && cd ai-workflow
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
    npm i @xyflow/react
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm add @xyflow/react
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn add @xyflow/react
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun add @xyflow/react
    ```
  </CodeBlockTab>
</CodeBlockTabs>

We're now ready to start building our workflow!

### Client

Let's build the workflow visualization step by step. We'll create the component structure, define our nodes and edges, and configure the canvas.

#### Import the components

First, let's build the interface:

<SourceCode path="workflow" />

### Key Features

The workflow visualization demonstrates several powerful features:

* **Custom Node Components**: Each node uses the compound components (`NodeHeader`, `NodeTitle`, `NodeDescription`, `NodeContent`, `NodeFooter`) for consistent, structured layouts.
* **Node Toolbars**: The `Toolbar` component attaches contextual actions (like Edit and Delete buttons) to individual nodes, appearing when hovering or selecting them.
* **Handle Configuration**: Nodes can have source and/or target handles, controlling which connections are possible.
* **Multiple Edge Types**: The `animated` type shows active data flow, while `temporary` indicates conditional or error paths.
* **Custom Connection Lines**: The `Connection` component provides styled bezier curves when dragging new connections between nodes.
* **Interactive Controls**: The `Controls` component adds zoom in/out and fit view buttons with a modern, themed design.
* **Custom UI Panels**: The `Panel` component allows you to position custom UI elements (like buttons, filters, or legends) anywhere on the canvas.
* **Automatic Layout**: The `Canvas` component auto-fits the view and provides pan/zoom controls out of the box.

You now have a working workflow visualization! Feel free to explore dynamic workflows by connecting this to AI-generated process flows, or extend it with interactive editing capabilities using React Flow's built-in features.
