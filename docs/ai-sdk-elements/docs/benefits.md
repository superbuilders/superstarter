# Benefits



AI Elements provides a purpose-built component library for AI applications. Here's why you should use it.

## Fully Composable

Every component is designed as a building block. Compose `Message`, `MessageContent`, and `MessageResponse` together to create exactly the chat UI you need. No rigid structures or forced layouts.

```tsx title="example.tsx"
<Message from="assistant">
  <MessageContent>
    <MessageResponse>{text}</MessageResponse>
  </MessageContent>
</Message>
```

## More Than Just Styled Components

AI Elements integrates deeply with the [AI SDK](https://ai-sdk.dev/). Components understand streaming responses, handle loading states, and work seamlessly with hooks like `useChat` and `useCompletion`.

* **Streaming support** - Components like `MessageResponse` handle partial markdown gracefully
* **Status awareness** - UI adapts to pending, streaming, and complete states
* **Type safety** - Props align with AI SDK types like `UIMessage`

## Intuitive & Developer-Friendly

If you know React and TypeScript, you already know AI Elements. Components follow familiar patterns:

* Standard React props with TypeScript types
* Sensible defaults that work out of the box
* Full control when you need it

## Accessible & Themeable

Built on [shadcn/ui](https://ui.shadcn.com/), AI Elements inherits:

* **WCAG 2.1 AA** accessibility baseline
* **CSS variables** for easy theming
* **Dark mode** support built-in
* **Semantic HTML** throughout

Your existing shadcn/ui theme applies automatically.

## Fast, Flexible Installation

Install only what you need. The CLI adds components directly to your codebase:

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

* No hidden dependencies
* Full source code access
* Modify components freely
* Tree-shaking friendly
