---
title: OpenClaw (Clawdbot)
product: vercel
url: /docs/ai-gateway/chat-platforms/openclaw
type: integration
prerequisites:
  - /docs/ai-gateway/chat-platforms
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/capabilities/observability
summary: Use OpenClaw (formerly Clawdbot) with AI Gateway.
---

# OpenClaw (Clawdbot)

[OpenClaw (Clawdbot)](https://openclaw.ai) is a personal AI assistant that runs on your computer and connects to messaging platforms like WhatsApp, Telegram, Discord, and more. OpenClaw (Clawdbot) features a skills platform that teaches it new capabilities, browser control, persistent memory, and multi-agent support. You can configure it to use AI Gateway for unified model access and spend monitoring.

## Configuring OpenClaw (Clawdbot)

- ### Create an API key
  Go to the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard and click **API keys** to create a new API key.

- ### Install OpenClaw (Clawdbot)
  Choose your preferred installation method:
  #### Quick Install
  **macOS/Linux:**
  ```bash filename="Terminal"
  curl -fsSL https://clawd.bot/install.sh | bash
  ```
  **Windows (PowerShell):**
  ```bash filename="PowerShell"
  iwr -useb https://clawd.bot/install.ps1 | iex
  ```
  #### npm/pnpm
  ```bash filename="Terminal"
  npm install -g clawdbot@latest
  ```
  Or with pnpm:
  ```bash filename="Terminal"
  pnpm add -g clawdbot@latest
  ```
  > **💡 Note:** Requires Node.js 22 or later.

- ### Run onboarding wizard
  Start the interactive setup:
  ```bash filename="Terminal"
  clawdbot onboard --install-daemon
  ```

- ### Configure AI Gateway
  During the onboarding wizard:
  1. **Model/Auth Provider**: Select **Vercel AI Gateway**
  2. **Authentication Method**: Choose **Vercel AI Gateway API key**
  3. **Enter API key**: Paste your AI Gateway API key
  4. **Select Model**: Choose from available models
  5. **Additional Configuration**: Complete remaining setup options (communication channels, daemon installation, etc.)
  > **💡 Note:** Models follow the `creator/model-name` format. Check the [models catalog](https://vercel.com/ai-gateway/models) for available options.

- ### Verify installation
  Check that OpenClaw (Clawdbot) is configured correctly:
  ```bash filename="Terminal"
  clawdbot health
  clawdbot status
  ```
  Your requests will now be routed through AI Gateway. You can verify this by checking your [AI Gateway Overview](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) in the Vercel dashboard.

- ### (Optional) Monitor usage and spend
  View your usage, spend, and request activity in the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard. See the [observability documentation](/docs/ai-gateway/capabilities/observability) for more details.


---

[View full sitemap](/docs/sitemap)
