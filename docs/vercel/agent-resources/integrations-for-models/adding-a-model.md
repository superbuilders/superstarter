---
title: Adding a Model
product: vercel
url: /docs/agent-resources/integrations-for-models/adding-a-model
type: conceptual
prerequisites:
  - /docs/agent-resources/integrations-for-models
  - /docs/agent-resources
related:
  - /docs/agent-resources/integrations-for-models/xai
  - /docs/agent-resources/integrations-for-models/groq
  - /docs/agent-resources/integrations-for-models/fal
  - /docs/agent-resources/integrations-for-models/deepinfra
  - /docs/agent-resources/integrations-for-models/perplexity
summary: Learn about adding a model on Vercel.
---

# Adding a Model

If you have integrations installed, scroll to the bottom to access the models explorer.

## Exploring models

To explore models:

1. Use the search bar, provider select, or type filter to find the model you want to add
2. Select the model you want to add by pressing the **Explore** button
3. The model playground will open, and you can test the model before adding it to your project

### Using the model playground

The model playground lets you test the model you are interested in before adding it to your project. If you haven't installed an AI provider through the Vercel dashboard, then you'll have ten lifetime generations per provider (they don't refresh, and once used, are spent) **regardless of plan**. If you *have* installed an AI provider that supports the model, Vercel will use your provider key.

You can use the model playground to test the model's capabilities and see if it fits your projects needs.

The model playground differs depending on the model you're testing. For example, if you're testing a chat model, you can input a prompt and see the model's response. If you're testing an image model, you can upload an image and see the model's output. Each model may have different variations based on the provider you choose.

The playground also lets you also configure the model's settings, such as temperature, maximum output length, duration, continuation, top p, and more. **These settings and inputs are specific to the model you're testing**.

### Adding a model to your project

Once you have decided on the model you want to add to your project:

1. Select the **Add Model** button
2. If you have more than one provider that supports the model you are adding, you will be prompted to select the provider you want to use. To select a provider, press the **Add Provider** button next to the provider you want to use for the model
3. Review the provider card which displays the models available, along with a description of the provider and links to their website, pricing, and documentation and select the **Add Provider** button
4. You can now select which projects the provider will have access to. You can choose from **All Projects** or **Specific Projects**
   - If you select **Specific Projects**, you'll be prompted to select the projects you want to connect to the provider. The list will display projects associated with your scoped team
   - Multiple projects can be selected during this step
5. You'll be redirected to the provider's website to complete the connection process
6. Once the connection is complete, you'll be redirected back to the Vercel dashboard, and the provider integration dashboard page. From here you can manage your provider and model settings, view usage, and more

## Featured AI integrations

**xAI**: An AI service with an efficient text model and a wide context image understanding model. [Learn more →](/docs/agent-resources/integrations-for-models/xai)

**Groq**: A high-performance AI inference service with an ultra-fast Language Processing Unit (LPU) architecture. [Learn more →](/docs/agent-resources/integrations-for-models/groq)

**fal**: A serverless AI inferencing platform for creative processes. [Learn more →](/docs/agent-resources/integrations-for-models/fal)

**DeepInfra**: A platform with access to a vast library of open-source models. [Learn more →](/docs/agent-resources/integrations-for-models/deepinfra)

**Perplexity**: Learn how to integrate Perplexity with Vercel. [Learn more →](/docs/agent-resources/integrations-for-models/perplexity)

**Replicate**: Learn how to integrate Replicate with Vercel. [Learn more →](/docs/agent-resources/integrations-for-models/replicate)

**ElevenLabs**: Learn how to integrate ElevenLabs with Vercel. [Learn more →](/docs/agent-resources/integrations-for-models/elevenlabs)

**LMNT**: Learn how to integrate LMNT with Vercel. [Learn more →](/docs/agent-resources/integrations-for-models/lmnt)

**Together AI**: Learn how to integrate Together AI with Vercel. [Learn more →](/docs/agent-resources/integrations-for-models/togetherai)

**OpenAI**: Connect powerful AI models like GPT-4 [Learn more →](/docs/agent-resources/integrations-for-models/openai)


---

[View full sitemap](/docs/sitemap)
