---
title: LibreChat
product: vercel
url: /docs/ai-gateway/chat-platforms/librechat
type: integration
prerequisites:
  - /docs/ai-gateway/chat-platforms
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/capabilities/observability
summary: Use LibreChat with the AI Gateway.
---

# LibreChat

[LibreChat](https://librechat.ai) is an open-source AI chat platform that you can self-host. You can configure it to use AI Gateway for unified model access and spend monitoring.

## Configuring LibreChat

- ### Create an API key
  Go to the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard and click **API keys** to create a new API key.

- ### Install LibreChat
  Clone the LibreChat repository and set up the environment:
  ```bash filename="Terminal"
  git clone https://github.com/danny-avila/LibreChat.git
  cd LibreChat
  cp .env.example .env
  ```
  > **💡 Note:** Windows users: Replace `cp` with `copy` if needed. Docker Desktop is required for this setup.

- ### Create Docker override file
  Create a `docker-compose.override.yml` file in your LibreChat root directory to mount the configuration:
  ```yaml filename="docker-compose.override.yml"
  services:
    api:
      volumes:
        - type: bind
          source: ./librechat.yaml
          target: /app/librechat.yaml
  ```
  This allows LibreChat to read your custom endpoint configuration.

- ### Add API key to environment
  Add your AI Gateway API key to your `.env` file in the LibreChat root directory:
  ```bash filename=".env"
  AI_GATEWAY_API_KEY=your-ai-gateway-api-key
  ```
  > **⚠️ Warning:** Use the `${"${VARIABLE_NAME}"}` pattern to reference environment variables. Do not include raw API keys in the YAML file.

- ### Configure custom endpoint
  Create a `librechat.yaml` file in your LibreChat root directory:
  ```yaml filename="librechat.yaml"
  version: 1.2.8
  cache: true

  endpoints:
    custom:
      - name: "Vercel"
        apiKey: "${AI_GATEWAY_API_KEY}"
        baseURL: "https://ai-gateway.vercel.sh/v1"
        titleConvo: true
        models:
          default:
            - "openai/gpt-5.2"
            - "anthropic/claude-sonnet-4.5"
            - "google/gemini-3-flash"
          fetch: true
        titleModel: "openai/gpt-5.2"
  ```
  > **💡 Note:** Setting `fetch: true` automatically fetches all available models from AI Gateway. Browse the full catalog on the [models page](https://vercel.com/ai-gateway/models).

- ### Start LibreChat
  Start or restart your LibreChat instance to apply the configuration:
  ```bash filename="Terminal"
  docker compose up -d
  ```
  If LibreChat is already running, restart it:
  ```bash filename="Terminal"
  docker compose restart
  ```
  Once started, navigate to http://localhost:3080/ to access LibreChat.

- ### Select AI Gateway endpoint
  In the LibreChat interface:
  1. Click the endpoint dropdown at the top
  2. Select **Vercel**
  3. Choose a model from the available options
  Your requests will now be routed through AI Gateway. You can verify this by checking your [AI Gateway Overview](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) in the Vercel dashboard.

- ### (Optional) Monitor usage and spend
  View your usage, spend, and request activity in the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard. See the [observability documentation](/docs/ai-gateway/capabilities/observability) for more details.

## Configuration options

You can customize the LibreChat endpoint configuration:

- **titleConvo**: Set to `true` to enable automatic conversation titles
- **titleModel**: Specify which model to use for generating conversation titles
- **modelDisplayLabel**: Customize the label shown in the interface (optional)
- **dropParams**: Remove default parameters that some providers don't support

See the [LibreChat custom endpoints documentation](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/custom_endpoint) for all available options.


---

[View full sitemap](/docs/sitemap)
