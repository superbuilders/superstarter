---
title: Pydantic AI
product: vercel
url: /docs/ai-gateway/ecosystem/framework-integrations/pydantic-ai
type: integration
prerequisites:
  - /docs/ai-gateway/ecosystem/framework-integrations
  - /docs/ai-gateway/ecosystem
related:
  - /docs/ai-gateway
summary: Learn how to integrate Vercel AI Gateway with Pydantic AI to access multiple AI models through a unified interface
---

# Pydantic AI

[Pydantic AI](https://ai.pydantic.dev/) is a Python agent framework
designed to make it easy to build production grade applications with AI.
This guide demonstrates how to integrate [Vercel AI Gateway](/docs/ai-gateway)
with Pydantic AI to access various AI models and providers.

## Getting started

- ### Create a new project
  First, create a new directory for your project and initialize it:
  ```bash filename="terminal"
  mkdir pydantic-ai-gateway
  cd pydantic-ai-gateway
  ```

- ### Install dependencies
  Install the required Pydantic AI packages along with the `python-dotenv` package:
  ```bash filename="terminal"
  pip install pydantic-ai python-dotenv
  ```

- ### Configure environment variables
  Create a `.env` file with your [Vercel AI Gateway API key](/docs/ai-gateway#using-the-ai-gateway-with-an-api-key):
  ```bash filename=".env"
  VERCEL_AI_GATEWAY_API_KEY=your-api-key-here
  ```
  > **💡 Note:** If you're using the [AI Gateway from within a Vercel
  > deployment](/docs/ai-gateway#using-the-ai-gateway-with-a-vercel-oidc-token),
  > you can also use the `VERCEL_OIDC_TOKEN` environment variable which will be
  > automatically provided.

- ### Create your Pydantic AI application
  Create a new file called `main.py` with the following code:
  ```python filename="main.py" {5, 16}
  from dotenv import load_dotenv
  from pydantic import BaseModel
  from pydantic_ai import Agent
  from pydantic_ai.models.openai import OpenAIModel
  from pydantic_ai.providers.vercel import VercelProvider

  load_dotenv()

  class CityInfo(BaseModel):
      city: str
      country: str
      population: int
      famous_for: str

  agent = Agent(
      OpenAIModel('anthropic/claude-4-sonnet', provider=VercelProvider()),
      output_type=CityInfo,
      system_prompt='Provide accurate city information.'
  )

  if __name__ == '__main__':
      cities = ["Tokyo", "Paris", "New York"]

      for city in cities:
          result = agent.run_sync(f'Tell me about {city}')
          info = result.output

          print(f"City: {info.city}")
          print(f"Country: {info.country}")
          print(f"Population: {info.population:,}")
          print(f"Famous for: {info.famous_for}")
          print("-" * 5)
  ```
  The following code:
  - Defines a `CityInfo` Pydantic model for structured output
  - Uses the `VercelProvider` to route requests through the AI Gateway
  - Handles the response data using Pydantic's type validation

- ### Running the application
  Run your application using Python:
  ```bash filename="terminal"
  python main.py
  ```
  You should see structured city information for Tokyo, Paris, and New York displayed in your console.


---

[View full sitemap](/docs/sitemap)
