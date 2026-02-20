---
title: Claude Code
product: vercel
url: /docs/agent-resources/coding-agents/claude-code
type: conceptual
prerequisites:
  - /docs/agent-resources/coding-agents
  - /docs/agent-resources
related:
  - /docs/ai-gateway/sdks-and-apis/anthropic-compat
summary: Learn about claude code on Vercel.
---

# Claude Code

AI Gateway provides [Anthropic-compatible API endpoints](/docs/ai-gateway/sdks-and-apis/anthropic-compat) so you can use [Claude Code](https://www.claude.com/product/claude-code) through a unified gateway.

## Configuring Claude Code

[Claude Code](https://code.claude.com/docs) is Anthropic's agentic coding tool. You can configure it to use Vercel AI Gateway, enabling you to:

- Monitor traffic and token usage in your AI Gateway Overview
- View detailed traces in Vercel Observability under AI

- ### Configure environment variables
  First, log out if you're already logged in:
  ```bash
  claude /logout
  ```
  Next, ensure you have your AI Gateway API key handy, and configure Claude Code to use the AI Gateway by adding this to your shell configuration file, for example in `~/.zshrc` or `~/.bashrc`:
  ```bash
  export ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh"
  export ANTHROPIC_AUTH_TOKEN="your-ai-gateway-api-key"
  export ANTHROPIC_API_KEY=""
  ```
  > **💡 Note:** Setting `ANTHROPIC_API_KEY` to an empty string is important. Claude Code
  > checks this variable first, and if it's set to a non-empty value, it will use
  > that instead of `ANTHROPIC_AUTH_TOKEN`.

- ### Run Claude Code
  Run `claude` to start Claude Code with AI Gateway:
  ```bash
  claude
  ```
  Your requests will now be routed through Vercel AI Gateway.

- ### (Optional) macOS: Secure token storage with Keychain
  If you're on a Mac and would like to manage your API key through a keychain for improved security, set your API key in the keystore with:
  ```bash
  security add-generic-password -a "$USER" -s "ANTHROPIC_AUTH_TOKEN" \
    -w "your-ai-gateway-api-key"
  ```
  and edit the `ANTHROPIC_AUTH_TOKEN` line above to:
  ```bash
  export ANTHROPIC_AUTH_TOKEN=$(
    security find-generic-password -a "$USER" -s "ANTHROPIC_AUTH_TOKEN" -w
  )
  ```
  If you need to update the API key value later, you can do it with:
  ```bash
  security add-generic-password -U -a "$USER" -s "ANTHROPIC_AUTH_TOKEN" \
    -w "new-ai-gateway-api-key"
  ```

## With Claude Code Max

If you have a [Claude Code Max subscription](https://www.anthropic.com/claude/claude-code), you can use your subscription through the AI Gateway. This allows you to leverage your existing Claude subscription while still benefiting from the gateway's observability, monitoring, and routing features.

- ### Set up environment variables
  Add the following to your shell configuration file (e.g., `~/.zshrc` or `~/.bashrc`):
  ```bash
  export ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh"
  export ANTHROPIC_CUSTOM_HEADERS="x-ai-gateway-api-key: Bearer your-ai-gateway-api-key"
  ```
  Replace `your-ai-gateway-api-key` with your actual AI Gateway API key.

- ### Start Claude Code
  Start Claude Code:
  ```bash
  claude
  ```

- ### Log in with your Claude subscription
  If you're not already logged in, Claude Code will prompt you to authenticate. Choose **Option 1 - Claude account with subscription** and log in as normal with your Anthropic account.
  > **💡 Note:** If you encounter issues, try logging out with `claude /logout` and logging in
  > again.

Your requests will now be routed through Vercel AI Gateway using your Claude Code Max subscription. You'll be able to monitor usage and view traces in your Vercel dashboard while using your Anthropic subscription for model access.


---

[View full sitemap](/docs/sitemap)
