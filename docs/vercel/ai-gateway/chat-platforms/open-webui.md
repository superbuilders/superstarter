---
title: Open WebUI
product: vercel
url: /docs/ai-gateway/chat-platforms/open-webui
type: conceptual
prerequisites:
  - /docs/ai-gateway/chat-platforms
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/capabilities/observability
summary: Learn about open webui on Vercel.
---

# Open WebUI

[Open WebUI](https://github.com/open-webui/open-webui) is a self-hosted web interface for interacting with LLMs. You can configure it to use AI Gateway for unified model access, spend monitoring, and access to hundreds of models from multiple providers.

## Configuring Open WebUI

- ### Create an API key
  Go to the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard and click **API keys** to create a new API key.

- ### Install Open WebUI
  If you haven't already installed Open WebUI, follow the [Open WebUI installation guide](https://docs.openwebui.com/getting-started/quick-start). You can deploy it using Docker, Python, or other methods.

- ### Configure AI Gateway
  Open WebUI integrates with AI Gateway through a custom function. Choose one of the following methods:
  #### One-Click Install
  1. Visit [Vercel AI Gateway Integration](https://openwebui.com/posts/vercel_ai_gateway_integration_52b4c475)
  2. Click **Get** to install the function to your running Open WebUI instance
  3. Click **Save** to finish installing
  4. Click the settings icon next to the function to enter your **AI Gateway API key**
  #### Manual Install
  1. Navigate to **Profile Icon** > **Settings** > **Admin Settings** > **Functions**
  2. Click **New Function**
  3. Copy and paste the following function code:
  4) Click the settings icon next to the function to enter your **AI Gateway API key**
  5) ```
     ```
  > **💡 Note:** The function handles authentication and request routing to AI Gateway automatically.

- ### Start using models
  Select a model from the AI Gateway catalog in the Open WebUI interface. Your requests will now be routed through AI Gateway.

  You can verify this by checking your [AI Gateway Overview](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) in the Vercel dashboard.

- ### (Optional) Monitor usage and spend
  View your usage, spend, and request activity in the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard. See the [observability documentation](/docs/ai-gateway/capabilities/observability) for more details.


---

[View full sitemap](/docs/sitemap)
