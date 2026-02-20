---
title: Vercel Documentation
---

# Vercel Documentation

*628 pages scraped on 2026-02-19*

| Section | Pages |
| --- | --- |
| getting-started-with-vercel | 13 |
| frameworks | 24 |
| incremental-migration | 1 |
| production-checklist | 1 |
| integrations | 34 |
| accounts | 1 |
| sign-in-with-vercel | 8 |
| activity-log | 1 |
| deployment-protection | 10 |
| directory-sync | 1 |
| saml | 1 |
| two-factor-authentication | 1 |
| agent | 6 |
| ai-sdk | 1 |
| ai-gateway | 60 |
| mcp | 2 |
| agent-resources | 29 |
| builds | 6 |
| deploy-hooks | 1 |
| deployment-checks | 1 |
| deployment-retention | 1 |
| deployments | 13 |
| environment-variables | 8 |
| git | 5 |
| instant-rollback | 1 |
| microfrontends | 9 |
| monorepos | 5 |
| package-managers | 1 |
| protected-git-scopes | 1 |
| rolling-releases | 1 |
| skew-protection | 1 |
| webhooks | 2 |
| cdn | 1 |
| regions | 1 |
| headers | 5 |
| cdn-cache | 2 |
| encryption | 1 |
| compression | 1 |
| incremental-static-regeneration | 3 |
| redirects | 4 |
| rewrites | 1 |
| custom-error-pages | 1 |
| image-optimization | 5 |
| manage-cdn-usage | 1 |
| request-collapsing | 1 |
| cli | 50 |
| comments | 5 |
| draft-mode | 1 |
| edit-mode | 1 |
| vercel-toolbar | 9 |
| fluid-compute | 1 |
| functions | 29 |
| routing-middleware | 3 |
| runtime-cache | 2 |
| cron-jobs | 4 |
| og-image-generation | 3 |
| vercel-sandbox | 11 |
| workflow | 1 |
| flags | 28 |
| multi-tenant | 2 |
| observability | 4 |
| alerts | 1 |
| logs | 2 |
| tracing | 3 |
| query | 6 |
| notebooks | 1 |
| speed-insights | 9 |
| drains | 7 |
| analytics | 10 |
| manage-and-optimize-observability | 1 |
| project-configuration | 9 |
| projects | 5 |
| domains | 21 |
| dashboard-features | 4 |
| notifications | 1 |
| build-output-api | 4 |
| glossary | 1 |
| limits | 2 |
| checks | 3 |
| plans | 7 |
| pricing | 27 |
| spend-management | 1 |
| security | 6 |
| audit-log | 1 |
| vercel-firewall | 16 |
| bot-management | 1 |
| botid | 6 |
| connectivity | 4 |
| oidc | 6 |
| rbac | 7 |
| two-factor-enforcement | 1 |
| storage | 1 |
| vercel-blob | 9 |
| edge-config | 13 |
| marketplace-storage | 1 |

---

## getting-started-with-vercel

- [Getting Started](./getting-started-with-vercel.md) — This step-by-step tutorial will help you get started with Vercel, an end-to-end platform for developers that allows you to create and deploy your web application.
- [Projects and Deployments](./getting-started-with-vercel/projects-deployments.md) — Streamline your workflow with Vercel
- [Use a Template](./getting-started-with-vercel/template.md) — Create a new project on Vercel by using a template
- [Import Existing Project](./getting-started-with-vercel/import.md) — Create a new project on Vercel by importing your existing frontend project, built on any of our supported frameworks.
- [Add a Domain](./getting-started-with-vercel/domains.md) — Easily add a custom domain to your Vercel project. Enhance your brand presence and optimize SEO with just a few clicks.
- [Buy a Domain](./getting-started-with-vercel/buy-domain.md) — Purchase your domain with Vercel. Expand your online reach and establish a memorable online identity.
- [Transfer an Existing Domain](./getting-started-with-vercel/use-existing.md) — Seamlessly integrate your existing domain with Vercel. Maximize flexibility and maintain your established online presence.
- [Collaborate](./getting-started-with-vercel/collaborate.md) — Amplify collaboration and productivity with Vercel
- [Next Steps](./getting-started-with-vercel/next-steps.md) — Discover the next steps to take on your Vercel journey. Unlock new possibilities and harness the full potential of your projects.
- [Fundamental Concepts](./getting-started-with-vercel/fundamental-concepts.md) — Learn about the core concepts of Vercel
- [Request Lifecycle](./getting-started-with-vercel/fundamental-concepts/infrastructure.md) — Learn how Vercel routes, secures, and serves requests from your users to your application.
- [Build System](./getting-started-with-vercel/fundamental-concepts/builds.md) — Learn how Vercel transforms your source code into optimized assets ready to serve globally.
- [What is Compute?](./getting-started-with-vercel/fundamental-concepts/what-is-compute.md) — Learn about the different models for compute and how they can be used with Vercel.

## frameworks

- [Supported Frameworks](./frameworks.md) — Vercel supports a wide range of the most popular frameworks, optimizing how your application builds and runs no matter what tool you use.
- [Full-stack](./frameworks/full-stack.md) — Vercel supports a wide range of the most popular backend frameworks, optimizing how your application builds and runs no matter what tooling you use.
- [Next.js](./frameworks/full-stack/nextjs.md) — Vercel is the native Next.js platform, designed to enhance the Next.js experience.
- [SvelteKit](./frameworks/full-stack/sveltekit.md) — Learn how to use Vercel
- [Nuxt](./frameworks/full-stack/nuxt.md) — Learn how to use Vercel
- [Remix](./frameworks/full-stack/remix.md) — Learn how to use Vercel
- [TanStack Start](./frameworks/full-stack/tanstack-start.md) — Learn how to use Vercel
- [Frontends](./frameworks/frontend.md) — Vercel supports a wide range of the most popular frontend frameworks, optimizing how your application builds and runs no matter what tooling you use.
- [Astro](./frameworks/frontend/astro.md) — Learn how to use Vercel
- [Vite](./frameworks/frontend/vite.md) — Learn how to use Vercel
- [React Router](./frameworks/frontend/react-router.md) — Learn how to use Vercel
- [Create React App](./frameworks/frontend/create-react-app.md) — Learn how to use Vercel
- [Backends](./frameworks/backend.md) — Vercel supports a wide range of the most popular backend frameworks, optimizing how your application builds and runs no matter what tooling you use.
- [Nitro](./frameworks/backend/nitro.md) — Deploy Nitro applications to Vercel with zero configuration. Learn about observability, ISR, and custom build configurations.
- [Express](./frameworks/backend/express.md) — Deploy Express applications to Vercel with zero configuration. Learn about middleware and Vercel Functions.
- [Elysia](./frameworks/backend/elysia.md) — Build fast TypeScript backends with Elysia and deploy to Vercel. Learn the project structure, plugins, middleware, and how to run locally and in production.
- [FastAPI](./frameworks/backend/fastapi.md) — Deploy FastAPI applications to Vercel with zero configuration. Learn about the Python runtime, ASGI, static assets, and Vercel Functions.
- [Fastify](./frameworks/backend/fastify.md) — Deploy Fastify applications to Vercel with zero configuration.
- [Flask](./frameworks/backend/flask.md) — Deploy Flask applications to Vercel with zero configuration. Learn about the Python runtime, WSGI, static assets, and Vercel Functions.
- [Hono](./frameworks/backend/hono.md) — Deploy Hono applications to Vercel with zero configuration. Learn about observability, ISR, and custom build configurations.
- [Koa](./frameworks/backend/koa.md) — Deploy Koa applications to Vercel with zero configuration.
- [NestJS](./frameworks/backend/nestjs.md) — Deploy NestJS applications to Vercel with zero configuration.
- [xmcp](./frameworks/backend/xmcp.md) — Build MCP-compatible backends with xmcp and deploy to Vercel. Learn the project structure, tool format, middleware, and how to run locally and in production.
- [All Frameworks](./frameworks/more-frameworks.md) — Learn about the frameworks that can be deployed to Vercel.

## incremental-migration

- [Incremental Migration](./incremental-migration.md) — Learn how to migrate your app or website to Vercel with minimal risk and high impact.

## production-checklist

- [Production Checklist](./production-checklist.md) — Ensure your application is ready for launch with this comprehensive production checklist by the Vercel engineering team. Covering operational excellence, security, reliability, performance efficiency, and cost optimization.

## integrations

- [Marketplace Partner API](./integrations/create-integration/marketplace-api/reference/partner.md) — Partner API overview page with list of all endpoints
- [Marketplace Vercel API](./integrations/create-integration/marketplace-api/reference/vercel.md) — Vercel API overview page with list of all endpoints
- [Integrations](./integrations.md) — Learn how to extend Vercel
- [Extend Vercel](./integrations/install-an-integration.md) — Learn how to pair Vercel
- [Add a Connectable Account](./integrations/install-an-integration/add-a-connectable-account.md) — Learn how to connect Vercel to your third-party account.
- [Add a Native Integration](./integrations/install-an-integration/product-integration.md) — Learn how you can add a product to your Vercel project through a native integration.
- [Agent Tools](./integrations/install-an-integration/agent-tools.md) — Use Agent Tools to query, debug, and manage your installed integrations through a chat interface with natural language.
- [Permissions and Access](./integrations/install-an-integration/manage-integrations-reference.md) — Learn how to manage project access and added products for your integrations.
- [Integrate with Vercel](./integrations/create-integration.md) — Learn how to create and manage your own integration for internal or public use with Vercel.
- [Native integration concepts](./integrations/create-integration/native-integration.md) — As an integration provider, understanding how your service interacts with Vercel
- [Create a Native Integration](./integrations/create-integration/marketplace-product.md) — Learn how to create a product for your Vercel native integration
- [Deployment integration actions](./integrations/create-integration/deployment-integration-action.md) — These actions allow integration providers to set up automated tasks with Vercel deployments.
- [Native Integration Flows](./integrations/create-integration/marketplace-flows.md) — Learn how information flows between the integration user, Vercel, and the integration provider for Vercel native integrations.
- [Integration Approval Checklist](./integrations/create-integration/approval-checklist.md) — The integration approval checklist is used ensure all necessary steps have been taken for a great integration experience.
- [Using Integrations API](./integrations/create-integration/marketplace-api.md) — Learn how to authenticate and use the Integrations REST API to build your integration server.
- [Billing and Refunds](./integrations/create-integration/billing.md) — Learn how billing works for native integrations, including invoice lifecycle, pricing models, and refunds.
- [Integration Image Guidelines](./integrations/create-integration/integration-image-guidelines.md) — Guidelines for creating images for integrations, including layout, content, visual assets, descriptions, and design standards.
- [Requirements for listing an Integration](./integrations/create-integration/submit-integration.md) — Learn about all the requirements and guidelines needed when creating your Integration.
- [Upgrade an Integration](./integrations/create-integration/upgrade-integration.md) — Lean more about when you may need to upgrade your Integration.
- [Secrets Rotation](./integrations/create-integration/secrets-rotation.md) — Learn how to implement secrets rotation in your integration to allow users to rotate credentials securely.
- [CMS Integrations](./integrations/cms.md) — Learn how to integrate Vercel with CMS platforms, including Contentful, Sanity, and Sitecore XM Cloud.
- [Agility CMS](./integrations/cms/agility-cms.md) — Learn how to integrate Agility CMS with Vercel. Follow our tutorial to deploy the Agility CMS template or install the integration for flexible and scalable content management.
- [ButterCMS](./integrations/cms/butter-cms.md) — Learn how to integrate ButterCMS with Vercel. Follow our tutorial to set up the ButterCMS template on Vercel and manage content seamlessly using ButterCMS API.
- [Contentful](./integrations/cms/contentful.md) — Integrate Vercel with Contentful to deploy your content.
- [DatoCMS](./integrations/cms/dato-cms.md) — Learn how to integrate DatoCMS with Vercel. Follow our step-by-step tutorial to set up and manage your digital content seamlessly using DatoCMS API.
- [Formspree](./integrations/cms/formspree.md) — Learn how to integrate Formspree with Vercel. Follow our tutorial to set up Formspree and manage form submissions on your static website without needing a server.
- [Makeswift](./integrations/cms/makeswift.md) — Learn how to integrate Makeswift with Vercel. Makeswift is a no-code website builder designed for creating and managing React websites. Follow our tutorial to set up Makeswift and deploy your website on Vercel.
- [Sanity](./integrations/cms/sanity.md) — Learn how to integrate Sanity with Vercel. Follow our tutorial to deploy the Sanity template or install the integration for real-time collaboration and structured content management.
- [Sitecore](./integrations/cms/sitecore.md) — Integrate Vercel with Sitecore XM Cloud to deploy your content.
- [Ecommerce Integrations](./integrations/ecommerce.md) — Learn how to integrate Vercel with ecommerce platforms, including BigCommerce and Shopify.
- [BigCommerce](./integrations/ecommerce/bigcommerce.md) — Integrate Vercel with BigCommerce to deploy your headless storefront.
- [Shopify](./integrations/ecommerce/shopify.md) — Integrate Vercel with Shopify to deploy your headless storefront.
- [Building Integrations with Vercel REST API](./integrations/vercel-api-integrations.md) — Learn how to use Vercel REST API to build your integrations and work with redirect URLs.
- [Kubernetes](./integrations/external-platforms/kubernetes.md) — Deploy your frontend on Vercel alongside your existing Kubernetes infrastructure.

## accounts

- [Account Management](./accounts.md) — Learn how to manage your Vercel account and team members.

## sign-in-with-vercel

- [Sign in with Vercel](./sign-in-with-vercel.md) — Learn how to Sign in with Vercel
- [Getting Started](./sign-in-with-vercel/getting-started.md) — Learn how to get started with Sign in with Vercel
- [Scopes & Permissions](./sign-in-with-vercel/scopes-and-permissions.md) — Learn how to manage scopes and permissions for Sign in with Vercel
- [Tokens](./sign-in-with-vercel/tokens.md) — Learn how to Sign in with Vercel
- [Authorization Server API](./sign-in-with-vercel/authorization-server-api.md) — Learn how to use the Authorization Server API
- [Manage from Dashboard](./sign-in-with-vercel/manage-from-dashboard.md) — Learn how to manage Sign in with Vercel from the Dashboard
- [Consent Page](./sign-in-with-vercel/consent-page.md) — Learn how the consent page works when users authorize your app
- [Troubleshooting](./sign-in-with-vercel/troubleshooting.md) — Learn how to troubleshoot common errors with Sign in with Vercel

## activity-log

- [Activity Log](./activity-log.md) — Learn how to use the Activity Log, which provides a list of all events on a team, chronologically organized since its creation.

## deployment-protection

- [Deployment Protection](./deployment-protection.md) — Learn how to secure your Vercel project
- [Bypass Deployment Protection](./deployment-protection/methods-to-bypass-deployment-protection.md) — Learn how to bypass Deployment Protection for specific domains, or for all deployments in a project.
- [Exceptions](./deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions.md) — Learn how to disable Deployment Protection for a list of preview domains.
- [OPTIONS Allowlist](./deployment-protection/methods-to-bypass-deployment-protection/options-allowlist.md) — Learn how to disable Deployment Protection for CORS preflight requests for a list of paths.
- [Protection Bypass for Automation](./deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation.md) — Learn how to bypass Vercel Deployment Protection for automated tooling (e.g. E2E testing).
- [Sharable Links](./deployment-protection/methods-to-bypass-deployment-protection/sharable-links.md) — Learn how to share your deployments with external users.
- [Protect Deployments](./deployment-protection/methods-to-protect-deployments.md) — Learn about the different methods to protect your deployments on Vercel, including Vercel Authentication, Password Protection, and Trusted IPs.
- [Password Protection](./deployment-protection/methods-to-protect-deployments/password-protection.md) — Learn how to protect your deployments with a password.
- [Trusted IPs](./deployment-protection/methods-to-protect-deployments/trusted-ips.md) — Learn how to restrict access to your deployments to a list of trusted IP addresses.
- [Vercel Authentication](./deployment-protection/methods-to-protect-deployments/vercel-authentication.md) — Learn how to use Vercel Authentication to restrict access to your deployments.

## directory-sync

- [Directory Sync](./directory-sync.md) — Learn how to configure Directory Sync for your Vercel Team.

## saml

- [SAML SSO](./saml.md) — Learn how to configure SAML SSO for your organization on Vercel.

## two-factor-authentication

- [Two-factor (2FA)](./two-factor-authentication.md) — Learn how to configure two-factor authentication for your Vercel account.

## agent

- [Vercel Agent](./agent.md) — AI-powered development tools that speed up your workflow and help resolve issues faster
- [Code Review](./agent/pr-review.md) — Get automatic AI-powered code reviews on your pull requests
- [Managing Reviews](./agent/pr-review/usage.md) — Customize which repositories get reviewed and track your review metrics and spending.
- [Investigation](./agent/investigation.md) — Let AI investigate your error alerts to help you debug faster
- [Installation](./agent/installation.md) — Let AI automatically install Web Analytics and Speed Insights in your app
- [Pricing](./agent/pricing.md) — Understand how Vercel Agent pricing works and how to manage your credits

## ai-sdk

- [AI SDK](./ai-sdk.md) — TypeScript toolkit for building AI-powered applications with React, Next.js, Vue, Svelte and Node.js

## ai-gateway

- [AI Gateway](./ai-gateway.md) — TypeScript toolkit for building AI-powered applications with React, Next.js, Vue, Svelte and Node.js
- [Getting Started](./ai-gateway/getting-started.md) — Get started with AI Gateway by generating text, images, or video.
- [Text](./ai-gateway/getting-started/text.md) — Generate and stream text responses using AI Gateway.
- [Image](./ai-gateway/getting-started/image.md) — Generate images from text prompts using AI Gateway.
- [Video](./ai-gateway/getting-started/video.md) — Generate videos from text prompts, images, or video input using AI Gateway.
- [Models & Providers](./ai-gateway/models-and-providers.md) — Learn about models and providers for the AI Gateway.
- [Provider Options](./ai-gateway/models-and-providers/provider-options.md) — Configure provider routing, ordering, and fallback behavior in Vercel AI Gateway
- [Model Fallbacks](./ai-gateway/models-and-providers/model-fallbacks.md) — Configure model-level failover to try backup models when the primary model is unavailable
- [Model Variants](./ai-gateway/models-and-providers/model-variants.md) — Enable provider-specific capabilities via headers when calling models through AI Gateway.
- [Capabilities](./ai-gateway/capabilities.md) — Explore AI Gateway capabilities including image generation, video generation, web search, observability, usage tracking, and data retention policies.
- [Observability](./ai-gateway/capabilities/observability.md) — Learn how to monitor and debug your AI Gateway requests.
- [Usage & Billing](./ai-gateway/capabilities/usage.md) — Monitor your AI Gateway credit balance, usage, and generation details.
- [Image Generation](./ai-gateway/capabilities/image-generation.md) — Generate and edit images using AI models through Vercel AI Gateway with support for multiple providers and modalities.
- [Using AI SDK](./ai-gateway/capabilities/image-generation/ai-sdk.md) — Generate and edit images using AI models through Vercel AI Gateway with the AI SDK.
- [Using OpenAI-Compatible API](./ai-gateway/capabilities/image-generation/openai.md) — Generate and edit images using AI models through Vercel AI Gateway with OpenAI-compatible API.
- [Video Generation](./ai-gateway/capabilities/video-generation.md) — Generate videos from text prompts, images, or video input using AI models through Vercel AI Gateway.
- [Text-to-Video](./ai-gateway/capabilities/video-generation/text-to-video.md) — Generate videos from text prompts using Google Veo, KlingAI, Wan, or Grok Imagine Video through AI Gateway.
- [Image-to-Video](./ai-gateway/capabilities/video-generation/image-to-video.md) — Animate static images into videos using KlingAI, Wan, or Grok Imagine Video through AI Gateway.
- [Reference-to-Video](./ai-gateway/capabilities/video-generation/reference-to-video.md) — Generate videos featuring characters from reference images or videos using Wan through AI Gateway.
- [Video Editing](./ai-gateway/capabilities/video-generation/video-editing.md) — Edit existing videos using text prompts with Grok Imagine Video through AI Gateway.
- [Web Search](./ai-gateway/capabilities/web-search.md) — Enable AI models to search the web for current information using built-in tools through AI Gateway.
- [Zero Data Retention](./ai-gateway/capabilities/zdr.md) — Learn about zero data retention policies and how to enforce ZDR on a per-request basis with AI Gateway.
- [SDKs & APIs](./ai-gateway/sdks-and-apis.md) — Use the AI Gateway with various SDKs and API specifications including OpenAI, Anthropic, and OpenResponses.
- [Anthropic-Compatible API](./ai-gateway/sdks-and-apis/anthropic-compat.md) — Use Anthropic-compatible API endpoints with the AI Gateway for seamless integration with Anthropic SDK tools.
- [Messages](./ai-gateway/sdks-and-apis/anthropic-compat/messages.md) — Create messages using the Anthropic Messages API format with support for streaming.
- [Tool Calls](./ai-gateway/sdks-and-apis/anthropic-compat/tool-calls.md) — Use Anthropic-compatible function calling to allow models to call tools and functions.
- [Advanced](./ai-gateway/sdks-and-apis/anthropic-compat/advanced.md) — Advanced Anthropic API features including extended thinking, web search, and automatic caching.
- [File Attachments](./ai-gateway/sdks-and-apis/anthropic-compat/file-attachments.md) — Send images and PDF documents as part of your Anthropic API message requests.
- [OpenAI-Compatible API](./ai-gateway/sdks-and-apis/openai-compat.md) — Use OpenAI-compatible API endpoints with the AI Gateway for seamless integration with existing tools and libraries.
- [Chat Completions](./ai-gateway/sdks-and-apis/openai-compat/chat-completions.md) — Create chat completions using the OpenAI-compatible API with support for streaming, image attachments, and PDF documents.
- [Tool Calls](./ai-gateway/sdks-and-apis/openai-compat/tool-calls.md) — Use OpenAI-compatible function calling to enable models to call tools and functions through the AI Gateway.
- [Structured Outputs](./ai-gateway/sdks-and-apis/openai-compat/structured-outputs.md) — Generate structured JSON responses that conform to a specific schema using the OpenAI-compatible API.
- [Advanced](./ai-gateway/sdks-and-apis/openai-compat/advanced.md) — Configure reasoning, provider options, model fallbacks, BYOK credentials, and prompt caching.
- [Embeddings](./ai-gateway/sdks-and-apis/openai-compat/embeddings.md) — Generate vector embeddings from input text for semantic search, similarity matching, and RAG applications.
- [Image Generation](./ai-gateway/sdks-and-apis/openai-compat/image-generation.md) — Generate images using AI models that support multimodal output through the OpenAI-compatible API.
- [REST API](./ai-gateway/sdks-and-apis/openai-compat/rest-api.md) — Use the AI Gateway API directly without client libraries using curl and fetch.
- [OpenResponses API](./ai-gateway/sdks-and-apis/openresponses.md) — Use the OpenResponses API specification with AI Gateway for a unified, provider-agnostic interface.
- [Text Generation](./ai-gateway/sdks-and-apis/openresponses/text-generation.md) — Generate text responses using the OpenResponses API.
- [Streaming](./ai-gateway/sdks-and-apis/openresponses/streaming.md) — Stream responses token by token using the OpenResponses API.
- [Image Input](./ai-gateway/sdks-and-apis/openresponses/image-input.md) — Send images for analysis using the OpenResponses API.
- [Tool Calling](./ai-gateway/sdks-and-apis/openresponses/tool-calling.md) — Define tools the model can call using the OpenResponses API.
- [Provider Options](./ai-gateway/sdks-and-apis/openresponses/provider-options.md) — Configure provider routing, fallbacks, and restrictions using the OpenResponses API.
- [Python](./ai-gateway/sdks-and-apis/python.md) — Use the AI Gateway with Python through OpenAI or Anthropic SDKs with full streaming, tool calling, and async support.
- [Authentication & BYOK](./ai-gateway/authentication-and-byok.md) — Learn how to authenticate with the AI Gateway and configure your own provider keys.
- [Authentication](./ai-gateway/authentication-and-byok/authentication.md) — Learn how to authenticate with the AI Gateway using API keys and OIDC tokens.
- [BYOK](./ai-gateway/authentication-and-byok/byok.md) — Learn how to configure your own provider keys with the AI Gateway.
- [Ecosystem](./ai-gateway/ecosystem.md) — Explore community framework integrations and ecosystem features for the AI Gateway.
- [Framework Integrations](./ai-gateway/ecosystem/framework-integrations.md) — Explore available community framework integrations with Vercel AI Gateway
- [LangChain](./ai-gateway/ecosystem/framework-integrations/langchain.md) — Learn how to integrate Vercel AI Gateway with LangChain to access multiple AI models through a unified interface
- [LangFuse](./ai-gateway/ecosystem/framework-integrations/langfuse.md) — Learn how to integrate Vercel AI Gateway with LangFuse to access multiple AI models through a unified interface
- [LiteLLM](./ai-gateway/ecosystem/framework-integrations/litellm.md) — Learn how to integrate Vercel AI Gateway with LiteLLM to access multiple AI models through a unified interface
- [LlamaIndex](./ai-gateway/ecosystem/framework-integrations/llamaindex.md) — Learn how to integrate Vercel AI Gateway with LlamaIndex to access multiple AI models through a unified interface
- [Mastra](./ai-gateway/ecosystem/framework-integrations/mastra.md) — Learn how to integrate Vercel AI Gateway with Mastra to access multiple AI models through a unified interface
- [Pydantic AI](./ai-gateway/ecosystem/framework-integrations/pydantic-ai.md) — Learn how to integrate Vercel AI Gateway with Pydantic AI to access multiple AI models through a unified interface
- [App Attribution](./ai-gateway/ecosystem/app-attribution.md) — Attribute your requests so Vercel can identify and feature your app on AI Gateway pages
- [Pricing](./ai-gateway/pricing.md) — Learn about pricing for AI Gateway.
- [Chat Platforms](./ai-gateway/chat-platforms.md) — Configure AI chat platforms to use the AI Gateway for unified model access and spend monitoring.
- [LibreChat](./ai-gateway/chat-platforms/librechat.md) — Use LibreChat with the AI Gateway.
- [OpenClaw (Clawdbot)](./ai-gateway/chat-platforms/openclaw.md) — Use OpenClaw (formerly Clawdbot) with AI Gateway.
- [Open WebUI](./ai-gateway/chat-platforms/open-webui.md) — Use Open WebUI with the AI Gateway.

## mcp

- [MCP](./mcp.md) — Learn more about MCP and how you can use it on Vercel.
- [Deploy MCP servers](./mcp/deploy-mcp-servers-to-vercel.md) — Learn how to deploy Model Context Protocol (MCP) servers on Vercel with OAuth authentication and efficient scaling.

## agent-resources

- [Agent Resources](./agent-resources.md) — Resources for building with AI on Vercel, including documentation access, MCP servers, and agent skills.
- [Markdown access](./agent-resources/markdown-access.md) — Access Vercel documentation as markdown using .md endpoints or the copy button.
- [Vercel MCP server](./agent-resources/vercel-mcp.md) — Vercel MCP has tools available for searching docs along with managing teams, projects, and deployments.
- [Tools](./agent-resources/vercel-mcp/tools.md) — Available tools in Vercel MCP for searching docs, managing teams, projects, deployments, and viewing runtime logs.
- [Coding Agents](./agent-resources/coding-agents.md) — Configure popular AI coding agents to use the AI Gateway for unified model access and spend monitoring.
- [Claude Code](./agent-resources/coding-agents/claude-code.md) — Use Claude Code with the AI Gateway.
- [Conductor](./agent-resources/coding-agents/conductor.md) — Use Conductor with the AI Gateway.
- [Roo Code](./agent-resources/coding-agents/roo-code.md) — Use Roo Code with the AI Gateway.
- [Cline](./agent-resources/coding-agents/cline.md) — Use Cline with the AI Gateway.
- [Blackbox AI](./agent-resources/coding-agents/blackbox.md) — Use the Blackbox AI CLI with the AI Gateway.
- [Crush](./agent-resources/coding-agents/crush.md) — Use Crush with the AI Gateway.
- [OpenCode](./agent-resources/coding-agents/opencode.md) — Use OpenCode with the AI Gateway.
- [Integrations for Agents](./agent-resources/integrations-for-agents.md) — Install AI agents and services through the Vercel Marketplace to automate workflows and build custom AI systems.
- [Integrations for Models](./agent-resources/integrations-for-models.md) — Integrate powerful AI services and models seamlessly into your Vercel projects.
- [Adding a Provider](./agent-resources/integrations-for-models/adding-a-provider.md) — Learn how to add a new AI provider to your Vercel projects.
- [Adding a Model](./agent-resources/integrations-for-models/adding-a-model.md) — Learn how to add a new AI model to your Vercel projects
- [xAI](./agent-resources/integrations-for-models/xai.md) — Learn how to add the xAI native integration with Vercel.
- [Groq](./agent-resources/integrations-for-models/groq.md) — Learn how to add the Groq native integration with Vercel.
- [fal](./agent-resources/integrations-for-models/fal.md) — Learn how to add the fal native integration with Vercel.
- [Deep Infra](./agent-resources/integrations-for-models/deepinfra.md) — Learn how to add the Deep Infra native integration with Vercel.
- [ElevenLabs](./agent-resources/integrations-for-models/elevenlabs.md) — Learn how to add the ElevenLabs connectable account integration with Vercel.
- [LMNT](./agent-resources/integrations-for-models/lmnt.md) — Learn how to add LMNT connectable account integration with Vercel.
- [OpenAI](./agent-resources/integrations-for-models/openai.md) — Integrate your Vercel project with OpenAI
- [Perplexity](./agent-resources/integrations-for-models/perplexity.md) — Learn how to add Perplexity connectable account integration with Vercel.
- [Pinecone](./agent-resources/integrations-for-models/pinecone.md) — Learn how to add Pinecone connectable account integration with Vercel.
- [Replicate](./agent-resources/integrations-for-models/replicate.md) — Learn how to add Replicate connectable account integration with Vercel.
- [Together AI](./agent-resources/integrations-for-models/togetherai.md) — Learn how to add Together AI connectable account integration with Vercel.
- [CLI Workflows](./agent-resources/workflows.md) — End-to-end workflows that show how to compose Vercel CLI commands into complete debugging, deployment, and recovery sessions.
- [Skills](./agent-resources/skills.md) — Install skills to enhance AI coding agents with specialized capabilities for React, Next.js, deployment, and more.

## builds

- [Builds](./builds.md) — Understand how the build step works when creating a Vercel Deployment.
- [Build Features](./builds/build-features.md) — Learn how to customize your deployments using Vercel
- [Build Image](./builds/build-image.md) — Learn about the container image used for Vercel builds.
- [Build Queues](./builds/build-queues.md) — Understand how concurrency and same branch build queues manage multiple simultaneous deployments.
- [Configuring a Build](./builds/configure-a-build.md) — Vercel automatically configures the build settings for many front-end frameworks, but you can also customize the build according to your requirements.
- [Managing Builds](./builds/managing-builds.md) — Vercel allows you to increase the speed of your builds when needed in specific situations and workflows.

## deploy-hooks

- [Deploy Hooks](./deploy-hooks.md) — Learn how to create and trigger deploy hooks to integrate Vercel deployments with other systems.

## deployment-checks

- [Deployment Checks](./deployment-checks.md) — Set conditions that must be met before proceeding to the next phase of the deployment lifecycle.

## deployment-retention

- [Deployment Retention](./deployment-retention.md) — Learn how Deployment Retention policies affect a deployment

## deployments

- [Deployments](./deployments.md) — Learn how to create and manage deployments on Vercel.
- [Environments](./deployments/environments.md) — Environments are for developing locally, testing changes in a pre-production environment, and serving end-users in production.
- [Generated URLs](./deployments/generated-urls.md) — When you create a new deployment, Vercel will automatically generate a unique URL which you can use to access that particular deployment.
- [Managing Deployments](./deployments/managing-deployments.md) — Learn how to manage your current and previously deployed projects to Vercel through the dashboard. You can redeploy at any time and even delete a deployment.
- [Promoting Deployments](./deployments/promoting-a-deployment.md) — Learn how to promote deployments to production on Vercel.
- [Troubleshoot Build Errors](./deployments/troubleshoot-a-build.md) — Learn how to resolve common scenarios you may encounter during the Build step, including build errors that cancel a deployment and long build times.
- [Accessing Build Logs](./deployments/logs.md) — Learn how to use Vercel
- [Claim Deployments](./deployments/claim-deployments.md) — Learn how to take ownership of deployments on Vercel with the Claim Deployments feature.
- [Inspect OG Metadata](./deployments/og-preview.md) — Learn how to inspect and validate your Open Graph metadata through the Open Graph deployment tab.
- [Preview Deployment Suffix](./deployments/preview-deployment-suffix.md) — When you create a new deployment, Vercel will automatically generate a unique URL which you can use to access that particular deployment.
- [Rollback Production](./deployments/rollback-production-deployment.md) — Recover from a bad production deployment by rolling back, investigating the root cause, and redeploying a fix.
- [Sharing a Preview Deployment](./deployments/sharing-deployments.md) — Learn how to share a preview deployment with your team and external collaborators.
- [Troubleshoot project collaboration](./deployments/troubleshoot-project-collaboration.md) — Learn about common reasons for deployment issues related to team member requirements and how to resolve them.

## environment-variables

- [Environment Variables](./environment-variables.md) — Learn more about environment variables on Vercel.
- [Framework Environment Variables](./environment-variables/framework-environment-variables.md) — Framework environment variables are automatically populated by the Vercel, based on your project
- [Managing Environment Variables](./environment-variables/managing-environment-variables.md) — Learn how to create and manage environment variables for Vercel.
- [Reserved Environment Variables](./environment-variables/reserved-environment-variables.md) — Reserved environment variables are reserved by Vercel Vercel Function runtimes.
- [Rotating Environment Variables](./environment-variables/rotating-secrets.md) — Safely rotate API keys, tokens, and other secrets in your Vercel environment variables.
- [Sensitive Environment Variables](./environment-variables/sensitive-environment-variables.md) — Environment variables that cannot be decrypted once created.
- [Shared Environment Variables](./environment-variables/shared-environment-variables.md) — Learn how to use Shared environment variables, which are environment variables that you define at the Team level and can link to multiple projects.
- [System Environment Variables](./environment-variables/system-environment-variables.md) — System environment variables are automatically populated by Vercel, such as the URL of the deployment or the name of the Git branch deployed.

## git

- [Git Integrations](./git.md) — Vercel allows for automatic deployments on every branch push and merges onto the production branch of your GitHub, GitLab, and Bitbucket projects.
- [GitHub](./git/vercel-for-github.md) — Vercel for GitHub automatically deploys your GitHub projects with Vercel, providing Preview Deployment URLs, and automatic Custom Domain updates.
- [Azure DevOps](./git/vercel-for-azure-pipelines.md) — ​Vercel for Azure DevOps allows you to deploy from Azure Pipelines to Vercel automatically.
- [Bitbucket](./git/vercel-for-bitbucket.md) — ​Vercel for Bitbucket automatically deploys your Bitbucket projects with Vercel, providing Preview Deployment URLs, and automatic Custom Domain updates.
- [GitLab](./git/vercel-for-gitlab.md) — ​Vercel for GitLab automatically deploys your GitLab projects with Vercel, providing Preview Deployment URLs, and automatic Custom Domain updates.

## instant-rollback

- [Instant Rollback](./instant-rollback.md) — Learn how to perform an Instant Rollback on your production deployments and quickly roll back to a previously deployed production deployment.

## microfrontends

- [Microfrontends](./microfrontends.md) — Learn how to use microfrontends on Vercel to split apart large applications, improve developer experience and make incremental migrations easier.
- [Getting Started](./microfrontends/quickstart.md) — Learn how to get started with microfrontends on Vercel.
- [Local Development](./microfrontends/local-development.md) — Learn how to run and test your microfrontends locally.
- [Path Routing](./microfrontends/path-routing.md) — Route paths on your domain to different microfrontends.
- [Configuration](./microfrontends/configuration.md) — Configure your microfrontends.json.
- [Managing Microfrontends](./microfrontends/managing-microfrontends.md) — Learn how to manage your microfrontends on Vercel.
- [Security](./microfrontends/managing-microfrontends/security.md) — Learn how to manage your Deployment Protection and Firewall for your microfrontend on Vercel.
- [Using Vercel Toolbar](./microfrontends/managing-microfrontends/vercel-toolbar.md) — Learn how to use the Vercel Toolbar to make it easier to manage microfrontends.
- [Testing & Troubleshooting](./microfrontends/troubleshooting.md) — Learn about testing, common issues, and how to troubleshoot microfrontends on Vercel.

## monorepos

- [Monorepos](./monorepos.md) — Vercel provides support for monorepos. Learn how to deploy a monorepo here.
- [Turborepo](./monorepos/turborepo.md) — Learn about Turborepo, a build system for monorepos that allows you to have faster incremental builds, content-aware hashing, and Remote Caching.
- [Remote Caching](./monorepos/remote-caching.md) — Vercel Remote Cache allows you to share build outputs and artifacts across distributed teams.
- [Nx](./monorepos/nx.md) — Nx is an extensible build system with support for monorepos, integrations, and Remote Caching on Vercel. Learn how to deploy Nx to Vercel with this guide.
- [Monorepos FAQ](./monorepos/monorepo-faq.md) — Learn the answer to common questions about deploying monorepos on Vercel.

## package-managers

- [Package Managers](./package-managers.md) — Discover the package managers supported by Vercel for dependency management. Learn how Vercel detects and uses npm, Yarn, pnpm, and Bun for optimal build performance.

## protected-git-scopes

- [Restricting Git Connections to a single Vercel team](./protected-git-scopes.md) — Information to stop developers from deploying their repositories to a personal Vercel account by using Protected Git Scopes.

## rolling-releases

- [Rolling Releases](./rolling-releases.md) — Learn how to use Rolling Releases for more cautious deployments.

## skew-protection

- [Skew Protection](./skew-protection.md) — Learn how Vercel

## webhooks

- [Webhooks](./webhooks.md) — Learn how to set up webhooks and use them with Vercel Integrations.
- [Webhooks API Reference](./webhooks/webhooks-api.md) — Vercel Integrations allow you to subscribe to certain trigger-based events through webhooks. Learn about the supported webhook events and how to use them.

## cdn

- [Overview](./cdn.md) — Vercel

## regions

- [Regions](./regions.md) — View the list of regions supported by Vercel

## headers

- [Headers](./headers.md) — This reference covers the list of request, response, cache-control, and custom response headers included with deployments with Vercel.
- [Security Headers](./headers/security-headers.md) — Learn how the Content Security Policy (CSP) offers defense against web vulnerabilities, its key features, and best practices.
- [Cache-Control Headers](./headers/cache-control-headers.md) — Learn about the cache-control headers sent to each Vercel deployment and how to use them to control the caching behavior of your application.
- [Request Headers](./headers/request-headers.md) — Learn about the request headers sent to each Vercel deployment and how to use them to process requests before sending a response.
- [Response Headers](./headers/response-headers.md) — Learn about the response headers sent to each Vercel deployment and how to use them to process responses before sending a response.

## cdn-cache

- [CDN Cache](./cdn-cache.md) — Vercel
- [Purge CDN Cache](./cdn-cache/purge.md) — Learn how to invalidate and delete cached content on Vercel

## encryption

- [Encryption](./encryption.md) — Learn how Vercel encrypts data in transit and at rest.

## compression

- [Compression](./compression.md) — Vercel helps reduce data transfer and improve performance by supporting both Gzip and Brotli compression

## incremental-static-regeneration

- [Incremental Static Regeneration](./incremental-static-regeneration.md) — Learn how Vercel
- [Getting Started](./incremental-static-regeneration/quickstart.md) — Learn how to use Incremental Static Regeneration (ISR) to regenerate your pages without rebuilding and redeploying your site.
- [Usage & Pricing](./incremental-static-regeneration/limits-and-pricing.md) — This page outlines information on the limits that are applicable to using Incremental Static Regeneration (ISR), and the costs they can incur.

## redirects

- [Redirects](./redirects.md) — Learn how to use redirects on Vercel to instruct Vercel
- [Configuration Redirects](./redirects/configuration-redirects.md) — Learn how to define static redirects in your framework configuration or vercel.json with support for wildcards, pattern matching, and geolocation.
- [Bulk redirects](./redirects/bulk-redirects.md) — Learn how to import thousands of simple redirects from CSV, JSON, or JSONL files.
- [Getting Started](./redirects/bulk-redirects/getting-started.md) — Learn how to import thousands of simple redirects from CSV, JSON, or JSONL files.

## rewrites

- [Rewrites](./rewrites.md) — Learn how to use rewrites to send users to different URLs without modifying the visible URL.

## custom-error-pages

- [Custom Error Pages](./custom-error-pages.md) — Learn how to configure custom error pages for 5xx server errors on Vercel.

## image-optimization

- [Image Optimization](./image-optimization.md) — Transform and optimize images to improve page load performance.
- [Getting Started](./image-optimization/quickstart.md) — Learn how you can leverage Vercel Image Optimization in your projects.
- [Limits and Pricing](./image-optimization/limits-and-pricing.md) — This page outlines information on the limits that are applicable when using Image Optimization, and the costs they can incur.
- [Managing Usage & Costs](./image-optimization/managing-image-optimization-costs.md) — Learn how to measure and manage Image Optimization usage with this guide to avoid any unexpected costs.
- [Legacy Pricing](./image-optimization/legacy-pricing.md) — This page outlines information on the pricing and limits for the source images-based legacy option.

## manage-cdn-usage

- [Manage CDN Usage](./manage-cdn-usage.md) — Learn how to understand the different charts in the Vercel dashboard. Learn how usage relates to billing, and how to optimize your usage for CDN.

## request-collapsing

- [Request Collapsing](./request-collapsing.md) — Learn how Vercel

## cli

- [Deploying from CLI](./cli/deploying-from-cli.md) — Learn how to deploy your Vercel Projects from Vercel CLI using the vercel or vercel deploy commands.
- [Project Linking](./cli/project-linking.md) — Learn how to link existing Vercel Projects with Vercel CLI.
- [Telemetry](./cli/about-telemetry.md) — Vercel CLI collects telemetry data about general usage.
- [Global Options](./cli/global-options.md) — Global options are commonly available to use with multiple Vercel CLI commands. Learn about Vercel CLI
- [vercel alias](./cli/alias.md) — Learn how to apply custom domain aliases to your Vercel deployments using the vercel alias CLI command.
- [vercel bisect](./cli/bisect.md) — Learn how to perform a binary search on your deployments to help surface issues using the vercel bisect CLI command.
- [vercel blob](./cli/blob.md) — Learn how to interact with Vercel Blob storage using the vercel blob CLI command.
- [vercel build](./cli/build.md) — Learn how to build a Vercel Project locally or in your own CI environment using the vercel build CLI command.
- [vercel cache](./cli/cache.md) — Learn how to manage cache for your project using the vercel cache CLI command.
- [vercel certs](./cli/certs.md) — Learn how to manage certificates for your domains using the vercel certs CLI command.
- [vercel contract](./cli/contract.md) — Learn how to view contract commitment information for your Vercel account using the vercel contract CLI command.
- [vercel curl](./cli/curl.md) — Learn how to make HTTP requests to your Vercel deployments with automatic deployment protection bypass using the vercel curl CLI command.
- [vercel deploy](./cli/deploy.md) — Learn how to deploy your Vercel projects using the vercel deploy CLI command.
- [vercel dev](./cli/dev.md) — Learn how to replicate the Vercel deployment environment locally and test your Vercel Project before deploying using the vercel dev CLI command.
- [vercel dns](./cli/dns.md) — Learn how to manage your DNS records for your domains using the vercel dns CLI command.
- [vercel domains](./cli/domains.md) — Learn how to buy, sell, transfer, and manage your domains using the vercel domains CLI command.
- [vercel env](./cli/env.md) — Learn how to manage your environment variables in your Vercel Projects using the vercel env CLI command.
- [vercel flags](./cli/flags.md) — Learn how to manage feature flags for your Vercel project using the vercel flags CLI command.
- [vercel git](./cli/git.md) — Learn how to manage your Git provider connections using the vercel git CLI command.
- [vercel guidance](./cli/guidance.md) — Enable or disable guidance messages in the Vercel CLI using the vercel guidance command.
- [vercel help](./cli/help.md) — Learn how to use the vercel help CLI command to get information about all available Vercel CLI commands.
- [vercel httpstat](./cli/httpstat.md) — Learn how to visualize HTTP request timing statistics for your Vercel deployments using the vercel httpstat CLI command.
- [vercel init](./cli/init.md) — Learn how to initialize Vercel supported framework examples locally using the vercel init CLI command.
- [vercel inspect](./cli/inspect.md) — Learn how to retrieve information about your Vercel deployments using the vercel inspect CLI command.
- [vercel install](./cli/install.md) — Learn how to install native integrations with the vercel install CLI command.
- [vercel integration](./cli/integration.md) — Learn how to perform key integration tasks using the vercel integration CLI command.
- [vercel integration-resource](./cli/integration-resource.md) — Learn how to perform native integration product resources tasks using the vercel integration-resource CLI command.
- [vercel link](./cli/link.md) — Learn how to link a local directory to a Vercel Project using the vercel link CLI command.
- [vercel list](./cli/list.md) — Learn how to list out all recent deployments for the current Vercel Project using the vercel list CLI command.
- [vercel login](./cli/login.md) — Learn how to login into your Vercel account using the vercel login CLI command.
- [vercel logout](./cli/logout.md) — Learn how to logout from your Vercel account using the vercel logout CLI command.
- [vercel logs](./cli/logs.md) — View and filter request logs for your Vercel project, or stream live runtime logs from a deployment.
- [vercel mcp](./cli/mcp.md) — Set up Model Context Protocol (MCP) usage with a Vercel project using the vercel mcp CLI command.
- [vercel microfrontends](./cli/microfrontends.md) — Manage microfrontends configuration from the CLI. Learn how to pull configuration for local development.
- [vercel open](./cli/open.md) — Learn how to open your current project in the Vercel Dashboard using the vercel open CLI command.
- [vercel project](./cli/project.md) — Learn how to list, add, remove, and manage your Vercel Projects using the vercel project CLI command.
- [vercel promote](./cli/promote.md) — Learn how to promote an existing deployment using the vercel promote CLI command.
- [vercel pull](./cli/pull.md) — Learn how to update your local project with remote environment variables using the vercel pull CLI command.
- [vercel redeploy](./cli/redeploy.md) — Learn how to redeploy your project using the vercel redeploy CLI command.
- [vercel redirects](./cli/redirects.md) — Learn how to manage project-level redirects using the vercel redirects CLI command.
- [vercel remove](./cli/remove.md) — Learn how to remove a deployment using the vercel remove CLI command.
- [vercel rollback](./cli/rollback.md) — Learn how to roll back your production deployments to previous deployments using the vercel rollback CLI command.
- [vercel rolling-release](./cli/rolling-release.md) — Learn how to manage your project
- [vercel switch](./cli/switch.md) — Learn how to switch between different team scopes using the vercel switch CLI command.
- [vercel target](./cli/target.md) — Work with custom environments using the --target flag in Vercel CLI.
- [vercel teams](./cli/teams.md) — Learn how to list, add, remove, and manage your teams using the vercel teams CLI command.
- [vercel telemetry](./cli/telemetry.md) — Learn how to manage telemetry collection.
- [vercel usage](./cli/usage.md) — Learn how to view billing usage and costs, for your Vercel account using the vercel usage CLI command.
- [vercel webhooks](./cli/webhooks.md) — Learn how to manage webhooks for your Vercel account using the vercel webhooks CLI command.
- [vercel whoami](./cli/whoami.md) — Learn how to display the username of the currently logged in user with the vercel whoami CLI command.

## comments

- [Comments](./comments.md) — Comments allow teams and invited participants to give direct feedback on preview deployments. Learn more about Comments in this overview.
- [Enabling Comments](./comments/how-comments-work.md) — Learn when and where Comments are available, and how to enable and disable Comments at the account, project, and session or interface levels.
- [Using Comments](./comments/using-comments.md) — This guide will help you get started with using Comments with your Vercel Preview Deployments.
- [Managing Comments](./comments/managing-comments.md) — Learn how to manage Comments on your Preview Deployments from Team members and invited collaborators.
- [Integrations](./comments/integrations.md) — Learn how Comments integrates with Git providers like GitHub, GitLab, and BitBucket, as well as Vercel

## draft-mode

- [Draft Mode](./draft-mode.md) — Vercel

## edit-mode

- [Edit Mode](./edit-mode.md) — Discover how Vercel

## vercel-toolbar

- [Toolbar](./vercel-toolbar.md) — Learn how to use the Vercel Toolbar to leave feedback, navigate through important dashboard pages, share deployments, use Draft Mode for previewing unpublished content, and Edit Mode for editing content in real-time.
- [Add to Environments](./vercel-toolbar/in-production-and-localhost.md) — Learn how to use the Vercel Toolbar in production and local environments.
- [Add to Localhost](./vercel-toolbar/in-production-and-localhost/add-to-localhost.md) — Learn how to use the Vercel Toolbar in your local environment.
- [Add to Production](./vercel-toolbar/in-production-and-localhost/add-to-production.md) — Learn how to add the Vercel Toolbar to your production environment and how your team members can use tooling to access the toolbar.
- [Managing Toolbar](./vercel-toolbar/managing-toolbar.md) — Learn how to enable or disable the Vercel Toolbar for your team, project, and session.
- [Browser Extensions](./vercel-toolbar/browser-extension.md) — The browser extensions enable you to use the toolbar in production environments, take screenshots and attach them to comments, and set personal preferences for how the toolbar behaves.
- [Accessibility Audit Tool](./vercel-toolbar/accessibility-audit-tool.md) — Learn how to use the Accessibility Audit Tool to automatically check the Web Content Accessibility Guidelines 2.0 level A and AA rules.
- [Interaction Timing Tool](./vercel-toolbar/interaction-timing-tool.md) — The interaction timing tool allows you to inspect in detail each interaction
- [Layout Shift Tool](./vercel-toolbar/layout-shift-tool.md) — The layout shift tool gives you insight into any elements that may cause layout shifts on the page.

## fluid-compute

- [Fluid Compute](./fluid-compute.md) — Learn about fluid compute, an execution model for Vercel Functions that provides a more flexible and efficient way to run your functions.

## functions

- [Functions](./functions.md) — Vercel Functions allow you to run server-side code without managing a server.
- [Getting Started](./functions/quickstart.md) — Build your first Vercel Function in a few steps.
- [Streaming](./functions/streaming-functions.md) — Learn how to stream responses from Vercel Functions.
- [Runtimes](./functions/runtimes.md) — Runtimes transform your source code into Functions, which are served by our CDN. Learn about the official runtimes supported by Vercel.
- [Node.js](./functions/runtimes/node-js.md) — Learn how to use the Node.js runtime with Vercel Functions to create functions.
- [Advanced Node.js Usage](./functions/runtimes/node-js/advanced-node-configuration.md) — Learn about advanced configurations for Vercel functions on Vercel.
- [Supported Node.js versions](./functions/runtimes/node-js/node-js-versions.md) — Learn about the supported Node.js versions on Vercel.
- [Bun](./functions/runtimes/bun.md) — Learn how to use the Bun runtime with Vercel Functions to create fast, efficient functions.
- [Python](./functions/runtimes/python.md) — Learn how to use the Python runtime to compile Python Vercel Functions on Vercel.
- [Rust](./functions/runtimes/rust.md) — Build fast, memory-safe serverless functions with Rust on Vercel.
- [Go](./functions/runtimes/go.md) — Learn how to use the Go runtime to compile Go Vercel functions on Vercel.
- [Ruby](./functions/runtimes/ruby.md) — Learn how to use the Ruby runtime to compile Ruby Vercel Functions on Vercel.
- [Wasm](./functions/runtimes/wasm.md) — Learn how to use WebAssembly (Wasm) to enable low-level languages to run on Vercel Functions and Routing Middleware.
- [Edge Runtime](./functions/runtimes/edge.md) — Learn about the Edge runtime, an environment in which Vercel Functions can run.
- [Configuring Functions](./functions/configuring-functions.md) — Learn how to configure the runtime, region, maximum duration, and memory for Vercel Functions.
- [Duration](./functions/configuring-functions/duration.md) — Learn how to set the maximum duration of a Vercel Function.
- [Memory](./functions/configuring-functions/memory.md) — Learn how to set the memory / CPU of a Vercel Function.
- [Runtime](./functions/configuring-functions/runtime.md) — Learn how to configure the runtime for Vercel Functions.
- [Region](./functions/configuring-functions/region.md) — Learn how to configure regions for Vercel Functions.
- [Advanced Configuration](./functions/configuring-functions/advanced-configuration.md) — Learn how to add utility files to the /api directory, and bundle Vercel Functions.
- [API Reference](./functions/functions-api-reference.md) — Learn about available APIs when working with Vercel Functions.
- [Node.js](./functions/functions-api-reference/vercel-functions-package.md) — Learn about available APIs when working with Vercel Functions.
- [Python](./functions/functions-api-reference/vercel-sdk-python.md) — Learn about available APIs when working with Vercel Functions in Python.
- [Logs](./functions/logs.md) — Use runtime logs to debug and monitor your Vercel Functions.
- [Limits](./functions/limitations.md) — Learn about the limits and restrictions of using Vercel Functions with the Node.js runtime.
- [Concurrency Scaling](./functions/concurrency-scaling.md) — Learn how Vercel automatically scales your functions to handle traffic surges.
- [Debug Slow Functions](./functions/debug-slow-functions.md) — Diagnose and fix slow Vercel Functions using CLI tools, logs, and timing analysis.
- [Pricing](./functions/usage-and-pricing.md) — Learn about usage and pricing for fluid compute on Vercel.
- [Legacy Usage & Pricing](./functions/usage-and-pricing/legacy-pricing.md) — Learn about legacy usage and pricing for Vercel Functions.

## routing-middleware

- [Routing Middleware](./routing-middleware.md) — Learn how you can use Routing Middleware, code that executes before a request is processed on a site, to provide speed and personalization to your users.
- [Getting Started](./routing-middleware/getting-started.md) — Learn how you can use Routing Middleware, code that executes before a request is processed on a site, to provide speed and personalization to your users.
- [API](./routing-middleware/api.md) — Learn how you can use Routing Middleware, code that executes before a request is processed on a site, to provide speed and personalization to your users.

## runtime-cache

- [Runtime Cache](./runtime-cache.md) — Vercel Runtime Cache is a specialized cache that stores responses from data fetches in Vercel functions
- [Data Cache](./runtime-cache/data-cache.md) — Vercel Data Cache is a specialized cache that stores responses from data fetches in Next.js App Router

## cron-jobs

- [Cron Jobs](./cron-jobs.md) — Learn about cron jobs, how they work, and how to use them on Vercel.
- [Getting Started](./cron-jobs/quickstart.md) — Learn how to schedule cron jobs to run at specific times or intervals.
- [Managing Cron Jobs](./cron-jobs/manage-cron-jobs.md) — Learn how to manage Cron Jobs effectively in Vercel. Explore cron job duration, error handling, deployments, concurrency control, local execution, and more to optimize your serverless workflows.
- [Usage & Pricing](./cron-jobs/usage-and-pricing.md) — Learn about cron jobs usage and pricing details.

## og-image-generation

- [OG Image Generation](./og-image-generation.md) — Learn how to optimize social media image generation through the Open Graph Protocol and @vercel/og library.
- [@vercel/og](./og-image-generation/og-image-api.md) — This reference provides information on how the @vercel/og package works on Vercel.
- [Examples](./og-image-generation/examples.md) — Learn how to use the @vercel/og library with examples.

## vercel-sandbox

- [Sandbox](./vercel-sandbox.md) — Vercel Sandbox allows you to run arbitrary code in isolated, ephemeral Linux VMs.
- [Quickstart](./vercel-sandbox/quickstart.md) — Learn how to run your first code in a Vercel Sandbox.
- [Concepts](./vercel-sandbox/concepts.md) — Learn how Vercel Sandboxes provide on-demand, isolated compute environments for running untrusted code, testing applications, and executing AI-generated scripts.
- [Authentication](./vercel-sandbox/concepts/authentication.md) — Learn how to authenticate with Vercel Sandbox using OIDC tokens or access tokens.
- [Snapshots](./vercel-sandbox/concepts/snapshots.md) — Save and restore sandbox state with snapshots for faster startups and environment sharing.
- [Firewall](./vercel-sandbox/concepts/firewall.md) — Define network policies on sandboxes, preventing data exfiltration.
- [Examples](./vercel-sandbox/working-with-sandbox.md) — Task-oriented guides for common Vercel Sandbox operations.
- [SDK Reference](./vercel-sandbox/sdk-reference.md) — A comprehensive reference for the Vercel Sandbox SDK, which allows you to run code in a secure, isolated environment.
- [CLI Reference](./vercel-sandbox/cli-reference.md) — Based on the Docker CLI, you can use the Sandbox CLI to manage your Vercel Sandbox from the command line.
- [System Specifications](./vercel-sandbox/system-specifications.md) — Detailed specifications for the Vercel Sandbox environment.
- [Pricing and Limits](./vercel-sandbox/pricing.md) — Understand how Vercel Sandbox billing works, what

## workflow

- [Workflow](./workflow.md) — Build durable, reliable, and observable applications and AI agents with the Workflow Development Kit (WDK).

## flags

- [Vercel Flags](./flags/vercel-flags.md) — Use Vercel as your feature flag provider to create and manage flags, define targeting rules, and run experiments directly from the dashboard.
- [Getting Started](./flags/vercel-flags/quickstart.md) — Create your first feature flag and evaluate it in your application using the Flags SDK, OpenFeature, or the core library.
- [Dashboard](./flags/vercel-flags/dashboard.md) — Learn how to manage your feature flags using the Vercel Dashboard.
- [Feature Flag](./flags/vercel-flags/dashboard/feature-flag.md) — Learn how to configure individual feature flags in the Vercel Dashboard.
- [Entities](./flags/vercel-flags/dashboard/entities.md) — Define entities and their attributes for precise feature flag targeting.
- [Segments](./flags/vercel-flags/dashboard/segments.md) — Create reusable user segments for targeting feature flags.
- [SDK Keys](./flags/vercel-flags/dashboard/sdk-keys.md) — Manage SDK Keys that connect your application to Vercel Flags.
- [Drafts](./flags/vercel-flags/dashboard/drafts.md) — Learn how draft flags work and how to promote them to Vercel Flags.
- [Archive](./flags/vercel-flags/dashboard/archive.md) — Archive unused feature flags and restore them when needed.
- [SDKs](./flags/vercel-flags/sdks.md) — Learn how to integrate Vercel Flags into your application using the Flags SDK, OpenFeature, or the core library.
- [Flags SDK](./flags/vercel-flags/sdks/flags-sdk.md) — Integrate Vercel Flags into your Next.js or SvelteKit application using the Flags SDK.
- [OpenFeature](./flags/vercel-flags/sdks/openfeature.md) — Use the vendor-neutral OpenFeature API with Vercel Flags as your provider.
- [Core](./flags/vercel-flags/sdks/core.md) — Use the Vercel Flags core evaluation library directly for custom setups.
- [CLI Workflows](./flags/vercel-flags/cli.md) — End-to-end workflows for managing feature flags with the Vercel CLI, from rolling out a feature to cleaning up after launch.
- [Clean Up After Rollout](./flags/vercel-flags/cli/clean-up-after-rollout.md) — Audit active flags, remove a fully rolled-out flag from your codebase, and archive it using the Vercel CLI.
- [Roll Out a Feature](./flags/vercel-flags/cli/roll-out-feature.md) — Create a feature flag, wire it into your application with the Flags SDK, and progressively enable it across environments using the Vercel CLI.
- [Run an A/B Test](./flags/vercel-flags/cli/run-ab-test.md) — Set up an A/B test with a feature flag, track results through Web Analytics, and clean up afterward using the Vercel CLI.
- [Set Up Flags Explorer](./flags/vercel-flags/cli/set-up-flags-explorer.md) — Add the Flags Explorer to the Vercel Toolbar so you can override flag values on preview deployments without affecting other users.
- [Limits and Pricing](./flags/vercel-flags/limits-and-pricing.md) — Learn about limits and pricing for Vercel Flags.
- [Flags Explorer](./flags/flags-explorer.md) — View and override your application
- [Getting Started](./flags/flags-explorer/getting-started.md) — Learn how to set up the Flags Explorer so you can see and override your application
- [Reference](./flags/flags-explorer/reference.md) — In-depth reference for configuring the Flags Explorer
- [Pricing](./flags/flags-explorer/limits-and-pricing.md) — Learn about pricing for Flags Explorer.
- [Marketplace](./flags/marketplace.md) — Connect your preferred feature flag provider through the Vercel Marketplace for a unified flags experience.
- [Flags SDK](./flags/flags-sdk-reference.md) — API reference for the Flags SDK for Next.js and SvelteKit.
- [Observability](./flags/observability.md) — Track feature flag evaluations in Runtime Logs and analyze their impact with Web Analytics.
- [Runtime Logs](./flags/observability/runtime-logs.md) — Integrate your feature flag provider with runtime logs.
- [Web Analytics](./flags/observability/web-analytics.md) — Learn how to tag your page views and custom events with feature flags

## multi-tenant

- [Domain Management](./multi-tenant/domain-management.md) — Manage custom domains, wildcard subdomains, and SSL certificates programmatically for multi-tenant applications using Vercel for Platforms.
- [Limits](./multi-tenant/limits.md) — Understand the limits and features available for Vercel for Platforms.

## observability

- [Overview](./observability.md) — Observability on Vercel provides framework-aware insights enabling you to optimize infrastructure and application performance.
- [Insights](./observability/insights.md) — List of available data sources that you can view and monitor with Observability on Vercel.
- [Debug 500 Errors](./observability/debug-production-errors.md) — Find, fix, and verify production 500 errors using the Vercel CLI.
- [Observability Plus](./observability/observability-plus.md) — Learn about using Observability Plus and its limits.

## alerts

- [Alerts](./alerts.md) — Get notified when something

## logs

- [Logs](./logs.md) — Use logs to find information on deployment builds, function executions, and more.
- [Runtime](./logs/runtime.md) — Learn how to search, inspect, and share your runtime logs with the Logs tab.

## tracing

- [Tracing](./tracing.md) — Learn how to trace your application to understand performance and infrastructure details.
- [Instrumentation](./tracing/instrumentation.md) — Learn how to instrument your application to understand performance and infrastructure details.
- [Session Tracing](./tracing/session-tracing.md) — Learn how to trace your sessions to understand performance and infrastructure details.

## query

- [Query](./query.md) — Query and visualize your Vercel usage, traffic, and more in observability.
- [Query Reference](./query/reference.md) — This reference covers the dimensions and operators used to create a query.
- [Monitoring](./query/monitoring.md) — Query and visualize your Vercel usage, traffic, and more with Monitoring.
- [Getting Started](./query/monitoring/quickstart.md) — In this quickstart guide, you
- [Monitoring Reference](./query/monitoring/monitoring-reference.md) — This reference covers the clauses, fields, and variables used to create a Monitoring query.
- [Limits and Pricing](./query/monitoring/limits-and-pricing.md) — Learn about our limits and pricing when using Monitoring. Different limitations are applied depending on your plan.

## notebooks

- [Notebooks](./notebooks.md) — Learn more about Notebooks and how they allow you to organize and save your queries.

## speed-insights

- [Speed Insights](./speed-insights.md) — This page lists out and explains all the performance metrics provided by Vercel
- [Getting Started](./speed-insights/quickstart.md) — Vercel Speed Insights provides you detailed insights into your website
- [Using Speed Insights](./speed-insights/using-speed-insights.md) — Learn how to use Speed Insights to analyze your application
- [Metrics](./speed-insights/metrics.md) — Learn what each performance metric on Speed Insights means and how the scores are calculated.
- [Privacy](./speed-insights/privacy-policy.md) — Learn how Vercel follows the latest privacy and data compliance standards with its Speed Insights feature.
- [@vercel/speed-insights](./speed-insights/package.md) — Learn how to configure your application to capture and send web performance metrics to Vercel using the @vercel/speed-insights npm package.
- [Limits and Pricing](./speed-insights/limits-and-pricing.md) — Learn about our limits and pricing when using Vercel Speed Insights. Different limitations are applied depending on your plan.
- [Managing Usage & Costs](./speed-insights/managing-usage.md) — Learn how to measure and manage Speed Insights usage with this guide to reduce data points and avoid unexpected costs.
- [Troubleshooting](./speed-insights/troubleshooting.md) — Learn about common issues and how to troubleshoot Vercel Speed Insights.

## drains

- [Drains](./drains.md) — Drains collect logs, traces, speed insights, and analytics from your applications. Forward observability data to custom endpoints or popular services.
- [Using Drains](./drains/using-drains.md) — Learn how to configure drains to forward observability data to custom HTTP endpoints and add integrations.
- [Logs](./drains/reference/logs.md) — Learn about Log Drains - data formats, sources, environments, and security configuration.
- [Traces](./drains/reference/traces.md) — Learn about Trace Drains - OpenTelemetry-compliant distributed tracing data formats and configuration.
- [Speed Insights](./drains/reference/speed-insights.md) — Learn about Speed Insights Drains - data formats and performance metrics configuration.
- [Web Analytics](./drains/reference/analytics.md) — Learn about Web Analytics Drains - data formats and custom events configuration.
- [Security](./drains/security.md) — Learn how to secure your Drains endpoints with authentication and signature verification.

## analytics

- [Web Analytics](./analytics.md) — With Web Analytics, you can get detailed insights into your website
- [Getting Started](./analytics/quickstart.md) — Vercel Web Analytics provides you detailed insights into your website
- [Using Web Analytics](./analytics/using-web-analytics.md) — Learn how to use Vercel
- [Filtering](./analytics/filtering.md) — Learn how filters allow you to explore insights about your website
- [Custom Events](./analytics/custom-events.md) — Learn how to send custom analytics events from your application.
- [Redacting Sensitive Data](./analytics/redacting-sensitive-data.md) — Learn how to redact sensitive data from your Web Analytics events.
- [Privacy](./analytics/privacy-policy.md) — Learn how Vercel supports privacy and data compliance standards with Vercel Web Analytics.
- [@vercel/analytics](./analytics/package.md) — With the @vercel/analytics npm package, you are able to configure your application to send analytics data to Vercel.
- [Pricing](./analytics/limits-and-pricing.md) — Learn about pricing for Vercel Web Analytics.
- [Troubleshooting](./analytics/troubleshooting.md) — Learn how to troubleshoot common issues with Vercel Web Analytics.

## manage-and-optimize-observability

- [Manage & Optimize](./manage-and-optimize-observability.md) — Learn how to understand the different charts in the Vercel dashboard, how usage relates to billing, and how to optimize your usage of Web Analytics and Speed Insights.

## project-configuration

- [Project Configuration](./project-configuration.md) — Learn how to configure your Vercel projects using vercel.json, vercel.ts, or the dashboard to control builds, routing, functions, and more.
- [vercel.json](./project-configuration/vercel-json.md) — Learn how to use vercel.json to configure and override the default behavior of Vercel from within your project.
- [vercel.ts](./project-configuration/vercel-ts.md) — Define your Vercel configuration in vercel.ts with @vercel/config for type-safe routing and build settings.
- [General Settings](./project-configuration/general-settings.md) — Configure basic settings for your Vercel project, including the project name, build and development settings, root directory, Node.js version, Project ID, and Vercel Toolbar settings.
- [Project Settings](./project-configuration/project-settings.md) — Use the project settings, to configure custom domains, environment variables, Git, integrations, deployment protection, functions, cron jobs, project members, webhooks, Drains, and security settings.
- [Git Configuration](./project-configuration/git-configuration.md) — Learn how to configure Git for your project through vercel.json or vercel.ts.
- [Git Settings](./project-configuration/git-settings.md) — Use the project settings to manage the Git connection, enable Git LFS, and create deploy hooks.
- [Global Configuration](./project-configuration/global-configuration.md) — Learn how to configure Vercel CLI under your system user.
- [Security settings](./project-configuration/security-settings.md) — Configure security settings for your Vercel project, including Logs and Source Protection, Customer Success Code Visibility, Git Fork Protection, and Secure Backend Access with OIDC Federation.

## projects

- [Projects](./projects.md) — A project is the application that you have deployed to Vercel.
- [Deploy from CLI](./projects/deploy-from-cli.md) — Set up and deploy a Vercel project using the CLI, from linking to production.
- [Managing projects](./projects/managing-projects.md) — Learn how to manage your projects through the Vercel Dashboard.
- [Project Dashboard](./projects/project-dashboard.md) — Learn about the features available for managing projects with the project Dashboard on Vercel.
- [Transferring a project](./projects/transferring-projects.md) — Learn how to transfer a project between Vercel teams.

## domains

- [Domains](./domains.md) — Learn the fundamentals of how domains, DNS, and nameservers work on Vercel.
- [Working with Domains](./domains/working-with-domains.md) — Learn how domains work and the options Vercel provides for managing them.
- [Adding a Domain](./domains/working-with-domains/add-a-domain.md) — Learn how to add a custom domain to your Vercel project, verify it, and correctly set the DNS or Nameserver values.
- [Adding a Domain to an Environment](./domains/working-with-domains/add-a-domain-to-environment.md) — Learn how to add a custom domain to your Vercel project, verify it, and correctly set the DNS or Nameserver values.
- [Assigning a Domain to a Git Branch](./domains/working-with-domains/assign-domain-to-a-git-branch.md) — Learn how to assign a domain to a different Git branch with this guide.
- [Claiming Ownership](./domains/working-with-domains/claim-domain-ownership.md) — Learn how to claim ownership of a domain that is registered with another Vercel account by verifying DNS ownership.
- [Deploying & Redirecting Domains](./domains/working-with-domains/deploying-and-redirecting.md) — Learn how to deploy your domains and set up domain redirects with this guide.
- [Removing a Domain](./domains/working-with-domains/remove-a-domain.md) — Learn how to remove a domain from a Project and from your account completely with this guide.
- [Renewing a Domain](./domains/working-with-domains/renew-a-domain.md) — Learn how to manage automatic and manual renewals for custom domains purchased through or registered with Vercel, and how to redeem expired domains with this guide.
- [Transferring Domains](./domains/working-with-domains/transfer-your-domain.md) — Domains can be transferred to another team or project within Vercel, or to and from a third-party registrar. Learn how to transfer domains with this guide.
- [Viewing & Searching Domains](./domains/working-with-domains/view-and-search-domains.md) — Learn how to view and search all registered domains that are assigned to Vercel Projects through the Vercel dashboard.
- [Working with DNS](./domains/working-with-dns.md) — Learn how DNS works in order to properly configure your domain.
- [Managing DNS Records](./domains/managing-dns-records.md) — Learn how to add, verify, and remove DNS records for your domains on Vercel with this guide.
- [Working with Nameservers](./domains/working-with-nameservers.md) — Learn about nameservers and the benefits Vercel nameservers provide.
- [Managing Nameservers](./domains/managing-nameservers.md) — Learn how to add custom nameservers and restore original nameservers for your domains on Vercel with this guide.
- [Working with SSL](./domains/working-with-ssl.md) — Learn how Vercel uses SSL certification to keep your site secure.
- [Custom SSL Certificates](./domains/custom-SSL-certificate.md) — By default, Vercel provides all domains with a custom SSL certificates. However, Enterprise teams can upload their own custom SSL certificate.
- [Pre-Generate SSL Certificates](./domains/pre-generating-ssl-certs.md) — test
- [Supported Domains](./domains/supported-domains.md) — Supported domains page with dynamically fetched TLD data table
- [Troubleshooting Domains](./domains/troubleshooting.md) — Learn about common reasons for domain misconfigurations and how to troubleshoot your domain on Vercel.
- [Using Domains API](./domains/registrar-api.md) — Programmatically search, price, purchase, renew, and manage domains with Vercel

## dashboard-features

- [Dashboard](./dashboard-features.md) — Learn how to use the Vercel dashboard to view and manage all aspects of the Vercel platform, including your Projects and Deployments.
- [Navigating the Dashboard](./dashboard-features/overview.md) — Learn how to select a scope, change the Project view, use search, or create a new project, all within the Vercel dashboard.
- [Support Center](./dashboard-features/support-center.md) — Learn how to communicate securely with the Vercel support team
- [Using the Command Menu ](./dashboard-features/command-menu.md) — Learn how to quickly navigate through the Vercel dashboard with your keyboard using the Command Menu.

## notifications

- [Notifications](./notifications.md) — Learn how to use Notifications to view and manage important alerts about your deployments, domains, integrations, account, and usage.

## build-output-api

- [Build Output API](./build-output-api.md) — The Build Output API is a file-system-based specification for a directory structure that can produce a Vercel deployment.
- [Build Output Configuration](./build-output-api/configuration.md) — Learn about the Build Output Configuration file, which is used to configure the behavior of a Deployment.
- [Features](./build-output-api/features.md) — Learn how to implement common Vercel platform features through the Build Output API.
- [Vercel Primitives](./build-output-api/primitives.md) — Learn about the Vercel platform primitives and how they work together to create a Vercel Deployment.

## glossary

- [Glossary](./glossary.md) — Learn about the terms and concepts used in Vercel

## limits

- [Limits](./limits.md) — This reference covers a list of all the limits and limitations that apply on Vercel.
- [Fair use Guidelines](./limits/fair-use-guidelines.md) — Learn about all subscription plans included usage that is subject to Vercel

## checks

- [Checks](./checks.md) — Vercel automatically keeps an eye on various aspects of your web application using the Checks API. Learn how to use Checks in your Vercel workflow here.
- [Checks API](./checks/checks-api.md) — The Vercel Checks API let you create tests and assertions that run after each deployment has been built, and are powered by Vercel Integrations.
- [Checks Reference](./checks/creating-checks.md) — Learn how to create your own Checks with Vercel Integrations. You can build your own Integration in order to register any arbitrary Check for your deployments.

## plans

- [Plans](./plans.md) — Learn about the different plans available on Vercel.
- [Hobby Plan](./plans/hobby.md) — Learn about the Hobby plan and how it compares to the Pro plan.
- [Pro Plan](./plans/pro-plan.md) — Learn about the Vercel Pro plan with credit-based billing, free viewer seats, and self-serve enterprise features for professional teams.
- [Pro Plan Trial](./plans/pro-plan/trials.md) — Learn all about Vercel
- [Billing FAQ](./plans/pro-plan/billing.md) — This page covers frequently asked questions around payments, invoices, and billing on the Pro plan.
- [Enterprise Plan](./plans/enterprise.md) — Learn about the Enterprise plan for Vercel, including features, pricing, and more.
- [Billing FAQ](./plans/enterprise/billing.md) — This page covers frequently asked questions around payments, invoices, and billing on the Enterprise plan.

## pricing

- [Pricing](./pricing.md) — Learn about Vercel
- [Regional Pricing](./pricing/regional-pricing.md) — Vercel pricing for Managed Infrastructure resources in different regions.
- [Cape Town, South Africa (cpt1)](./pricing/regional-pricing/cpt1.md) — Vercel pricing for the Cape Town, South Africa (cpt1) region.
- [Cleveland, USA (cle1)](./pricing/regional-pricing/cle1.md) — Vercel pricing for the Cleveland, USA (cle1) region.
- [Dubai, UAE (dxb1)](./pricing/regional-pricing/dxb1.md) — Vercel pricing for the Dubai, UAE (dxb1) region.
- [Dublin, Ireland (dub1)](./pricing/regional-pricing/dub1.md) — Vercel pricing for the Dublin, Ireland (dub1) region.
- [Frankfurt, Germany (fra1)](./pricing/regional-pricing/fra1.md) — Vercel pricing for the Frankfurt, Germany (fra1) region.
- [Hong Kong (hkg1)](./pricing/regional-pricing/hkg1.md) — Vercel pricing for the Hong Kong (hkg1) region.
- [London, UK (lhr1)](./pricing/regional-pricing/lhr1.md) — Vercel pricing for the London, UK (lhr1) region.
- [Montréal, Canada (yul1)](./pricing/regional-pricing/yul1.md) — Vercel pricing for the Montréal, Canada (yul1) region.
- [Mumbai, India (bom1)](./pricing/regional-pricing/bom1.md) — Vercel pricing for the Mumbai, India (bom1) region.
- [Osaka, Japan (kix1)](./pricing/regional-pricing/kix1.md) — Vercel pricing for the Osaka, Japan (kix1) region.
- [Paris, France (cdg1)](./pricing/regional-pricing/cdg1.md) — Vercel pricing for the Paris, France (cdg1) region.
- [Portland, USA (pdx1)](./pricing/regional-pricing/pdx1.md) — Vercel pricing for the Portland, USA (pdx1) region.
- [San Francisco, USA (sfo1)](./pricing/regional-pricing/sfo1.md) — Vercel pricing for the San Francisco, USA (sfo1) region.
- [São Paulo, Brazil (gru1)](./pricing/regional-pricing/gru1.md) — Vercel pricing for the São Paulo, Brazil (gru1) region.
- [Seoul, South Korea (icn1)](./pricing/regional-pricing/icn1.md) — Vercel pricing for the Seoul, South Korea (icn1) region.
- [Singapore (sin1)](./pricing/regional-pricing/sin1.md) — Vercel pricing for the Singapore (sin1) region.
- [Stockholm, Sweden (arn1)](./pricing/regional-pricing/arn1.md) — Vercel pricing for the Stockholm, Sweden (arn1) region.
- [Sydney, Australia (syd1)](./pricing/regional-pricing/syd1.md) — Vercel pricing for the Sydney, Australia (syd1) region.
- [Tokyo, Japan (hnd1)](./pricing/regional-pricing/hnd1.md) — Vercel pricing for the Tokyo, Japan (hnd1) region.
- [Washington D.C., USA (iad1)](./pricing/regional-pricing/iad1.md) — Vercel pricing for the Washington D.C., USA (iad1) region.
- [Manage and Optimize Usage](./pricing/manage-and-optimize-usage.md) — Understand how to manage and optimize your usage on Vercel, learn how to track your usage, set up alerts, and optimize your usage to save costs.
- [Calculating Usage of Resources](./pricing/how-does-vercel-calculate-usage-of-resources.md) — Understand how Vercel measures and calculates your resource usage based on a typical user journey.
- [Billing & Invoices](./pricing/understanding-my-invoice.md) — Learn how Vercel invoices get structured for Pro and Enterprise plans. Learn how usage allotments and on-demand charges get included.
- [Legacy Metrics](./pricing/legacy.md) — Learn about Bandwidth, Requests, Vercel Function Invocations, and Vercel Function Execution metrics.
- [Taxes](./pricing/taxes.md) — This page covers frequently asked questions around taxes.

## spend-management

- [Spend Management](./spend-management.md) — Learn how to get notified about your account spend and configure a webhook.

## security

- [Overview](./security.md) — Vercel provides built-in and customizable features to ensure that your site is secure.
- [Security & Compliance Measures](./security/compliance.md) — Learn about the protection and compliance measures Vercel takes to ensure the security of your data, including DDoS mitigation and SOC 2 compliance.
- [Shared Responsibility Model](./security/shared-responsibility.md) — Discover the essentials of our Shared Responsibility Model, outlining the key roles and responsibilities for customers, Vercel, and shared aspects in ensuring secure and efficient cloud computing services.
- [PCI DSS iframe Integration](./security/pci-dss.md) — Learn how to integrate an iframe into your application to support PCI DSS compliance.
- [Reverse Proxy Servers and Vercel](./security/reverse-proxy.md) — Learn why reverse proxy servers are not recommended with Vercel
- [Access Control](./security/access-control.md) — Learn about the protection and compliance measures Vercel takes to ensure the security of your data, including DDoS mitigation, SOC 2 compliance and more.

## audit-log

- [Audit Logs](./audit-log.md) — Learn how to track and analyze your team members

## vercel-firewall

- [Firewall](./vercel-firewall.md) — Learn how Vercel Firewall helps protect your applications and websites from malicious attacks and unauthorized access.
- [Firewall Concepts](./vercel-firewall/firewall-concepts.md) — Understand the fundamentals behind the Vercel Firewall.
- [DDoS Mitigation](./vercel-firewall/ddos-mitigation.md) — Learn how the Vercel Firewall mitigates against DoS and DDoS attacks
- [Attack Challenge Mode](./vercel-firewall/attack-challenge-mode.md) — Learn how to use Attack Challenge Mode to help control who has access to your site when it
- [Web Application Firewall](./vercel-firewall/vercel-waf.md) — Learn how to secure your website with the Vercel Web Application Firewall (WAF)
- [Custom Rules](./vercel-firewall/vercel-waf/custom-rules.md) — Learn how to add and manage custom rules to configure the Vercel Web Application Firewall (WAF).
- [Rate Limiting](./vercel-firewall/vercel-waf/rate-limiting.md) — Learn how to configure custom rate limiting rules with the Vercel Web Application Firewall (WAF).
- [Rule Configuration](./vercel-firewall/vercel-waf/rule-configuration.md) — List of configurable options with the Vercel WAF
- [System Bypass Rules](./vercel-firewall/vercel-waf/system-bypass-rules.md) — Learn how to configure IP-based system bypass rules with the Vercel Web Application Firewall (WAF).
- [Rate Limiting SDK](./vercel-firewall/vercel-waf/rate-limiting-sdk.md) — Learn how to configure a custom rule with rate limit in your code.
- [IP Blocking](./vercel-firewall/vercel-waf/ip-blocking.md) — Learn how to customize the Vercel WAF to restrict access to certain IP addresses.
- [WAF Managed Rulesets](./vercel-firewall/vercel-waf/managed-rulesets.md) — Learn how to use WAF Managed Rulesets with the Vercel Web Application Firewall (WAF)
- [Examples](./vercel-firewall/vercel-waf/examples.md) — Learn how to use Vercel WAF to protect your site in specific situations.
- [Usage & Pricing](./vercel-firewall/vercel-waf/usage-and-pricing.md) — Learn how the Vercel WAF can affect your usage and how specific features are priced.
- [Firewall API](./vercel-firewall/firewall-api.md) — Learn how to interact with the security endpoints of the Vercel REST API programmatically.
- [Firewall Observability](./vercel-firewall/firewall-observability.md) — Learn how firewall traffic monitoring and alerts help you react quickly to potential security threats.

## bot-management

- [Bot Management](./bot-management.md) — Learn how to manage bot traffic to your site.

## botid

- [BotID](./botid.md) — Protect your applications from automated attacks with intelligent bot detection and verification, powered by Kasada.
- [Get Started with BotID](./botid/get-started.md) — Step-by-step guide to setting up BotID protection in your Vercel project
- [Handling Verified Bots](./botid/verified-bots.md) — Information about verified bots and their handling in BotID
- [Advanced BotID Configuration](./botid/advanced-configuration.md) — Fine-grained control over BotID detection levels and backend domain configuration
- [Form Submissions](./botid/form-submissions.md) — How to properly handle form submissions with BotID protection
- [Local Development Behavior](./botid/local-development-behavior.md) — How BotID behaves in local development environments and testing options

## connectivity

- [Connectivity](./connectivity.md) — Connect your Vercel projects to backend services with static IPs and secure networking options.
- [Secure Compute](./connectivity/secure-compute.md) — Secure Compute provides dedicated private networks with VPC peering for Enterprise teams.
- [Static IPs](./connectivity/static-ips.md) — Access IP-restricted backend services through shared static egress IPs for Pro and Enterprise teams.
- [Getting Started](./connectivity/static-ips/getting-started.md) — Learn how to set up Static IPs for your Vercel projects to connect to IP-restricted backend services.

## oidc

- [OIDC](./oidc.md) — Secure the access to your backend using OIDC Federation to enable auto-generated, short-lived, and non-persistent credentials.
- [AWS](./oidc/aws.md) — Learn how to configure your AWS account to trust Vercel
- [Azure](./oidc/azure.md) — Learn how to configure your Microsoft Azure account to trust Vercel
- [Connect your API](./oidc/api.md) — Learn how to configure your own API to trust Vercel
- [Google Cloud Platform](./oidc/gcp.md) — Learn how to configure your GCP project to trust Vercel
- [OIDC Reference](./oidc/reference.md) — Review helper libraries to help you connect with your backend and understand the structure of an OIDC token.

## rbac

- [RBAC](./rbac.md) — Learn how to manage team members on Vercel, and how to assign roles to each member with role-based access control (RBAC).
- [Access Roles](./rbac/access-roles.md) — Learn about the different roles available for team members on a Vercel account.
- [Extended Permissions](./rbac/access-roles/extended-permissions.md) — Learn about extended permissions in Vercel
- [Project Level Roles](./rbac/access-roles/project-level-roles.md) — Learn about the project level roles and their permissions.
- [Team Level Roles](./rbac/access-roles/team-level-roles.md) — Learn about the different team level roles and the permissions they provide.
- [Access Groups](./rbac/access-groups.md) — Learn how to configure access groups for team members on a Vercel account.
- [Managing Team Members](./rbac/managing-team-members.md) — Learn how to manage team members on Vercel, and how to assign roles to each member with role-based access control (RBAC).

## two-factor-enforcement

- [Two-factor Enforcement](./two-factor-enforcement.md) — Learn how to enforce two-factor authentication (2FA) for your Vercel team members to enhance security.

## storage

- [Overview](./storage.md) — Store large files and global configuration with Vercel

## vercel-blob

- [Blob](./vercel-blob.md) — Vercel Blob is a scalable, cost-effective object storage service with private and public access modes for files of any size.
- [Private Storage](./vercel-blob/private-storage.md) — Learn how to use private Vercel Blob storage to serve files with authentication
- [Public Storage](./vercel-blob/public-storage.md) — Learn how to use public Vercel Blob storage to serve files accessible to anyone with the URL
- [Server Uploads](./vercel-blob/server-upload.md) — Learn how to upload files to Vercel Blob using Server Actions and Route Handlers
- [Client Uploads](./vercel-blob/client-upload.md) — Learn how to upload files larger than 4.5 MB directly from the browser to Vercel Blob
- [Using the SDK](./vercel-blob/using-blob-sdk.md) — Learn how to use the Vercel Blob SDK to access your blob store from your apps.
- [Pricing](./vercel-blob/usage-and-pricing.md) — Learn about the pricing for Vercel Blob.
- [Security](./vercel-blob/security.md) — Learn how your Vercel Blob store is secured
- [Examples](./vercel-blob/examples.md) — Examples on how to use Vercel Blob in your applications

## edge-config

- [Edge Config](./edge-config.md) — An Edge Config is a global data store that enables experimentation with feature flags, A/B testing, critical redirects, and more.
- [Getting Started](./edge-config/get-started.md) — Learn how to create an Edge Config store and read from it in your project.
- [Using Edge Config](./edge-config/using-edge-config.md) — Learn how to use Edge Configs in your projects.
- [Edge Configs & REST API](./edge-config/vercel-api.md) — Learn how to use the Vercel REST API to create and update Edge Configs. You can also read data stored in Edge Configs with the Vercel REST API.
- [Edge Configs & Dashboard](./edge-config/edge-config-dashboard.md) — Learn how to create, view and update your Edge Configs and the data inside them in your Vercel Dashboard at the Hobby team, team, and project levels.
- [Edge Config SDK](./edge-config/edge-config-sdk.md) — The Edge Config client SDK is the most ergonomic way to read data from Edge Configs. Learn how to set up the SDK so you can start reading Edge Configs.
- [Limits & Pricing](./edge-config/edge-config-limits.md) — Learn about the Edge Configs limits and pricing based on account plans.
- [Integrations](./edge-config/edge-config-integrations.md) — Learn how to use Edge Config with popular A/B testing and feature flag service integrations.
- [DevCycle](./edge-config/edge-config-integrations/devcycle-edge-config.md) — Learn how to use Edge Config with Vercel
- [Hypertune](./edge-config/edge-config-integrations/hypertune-edge-config.md) — Learn how to use Hypertune
- [LaunchDarkly](./edge-config/edge-config-integrations/launchdarkly-edge-config.md) — Learn how to use Edge Config with Vercel
- [Split](./edge-config/edge-config-integrations/split-edge-config.md) — Learn how to use Edge Config with Vercel
- [Statsig](./edge-config/edge-config-integrations/statsig-edge-config.md) — Learn how to use Edge Config with Vercel

## marketplace-storage

- [Marketplace](./marketplace-storage.md) — Connect Postgres, Redis, NoSQL, and other storage solutions through the Vercel Marketplace.

