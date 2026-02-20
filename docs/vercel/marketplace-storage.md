---
title: Storage on Vercel Marketplace
product: vercel
url: /docs/marketplace-storage
type: conceptual
prerequisites:
  []
related:
  - /docs/environment-variables
  - /docs/integrations/install-an-integration/product-integration
  - /docs/functions/configuring-functions/region
  - /docs/runtime-cache/data-cache
  - /docs/edge-config
summary: Connect Postgres, Redis, NoSQL, and other storage solutions through the Vercel Marketplace.
---

# Storage on Vercel Marketplace

> **🔒 Permissions Required**: Marketplace Storage Integrations

The [Vercel Marketplace](https://vercel.com/marketplace?category=storage) provides integrations with different storage providers to provision databases and data stores directly from your Vercel dashboard.

- For Postgres, you can use providers like Neon, Supabase, or AWS Aurora Postgres.
- For KV (key-value stores), you can use Upstash Redis.

The integration automatically injects credentials into your projects as environment variables.

## Why use Marketplace storage

When you install a storage integration from the Marketplace, you get:

- **Simplified provisioning**: Create databases without leaving the Vercel dashboard
- **Automatic configuration**: Vercel injects connection strings and credentials as [environment variables](/docs/environment-variables)
- **Unified billing**: Pay for storage resources through your Vercel account

## Available storage integrations

## Getting started

To add a storage integration to your project:

1. Go to the [Vercel Marketplace](https://vercel.com/marketplace?category=storage) and browse storage integrations
2. Select an integration and click **Install**
3. Choose a pricing plan that fits your needs
4. Configure your database (name, region, and other options)
5. Connect the storage resource to your Vercel project

Once connected, the integration automatically adds environment variables to your project. You can then use these variables in your application code to connect to your database.

For detailed steps, see [Add a Native Integration](/docs/integrations/install-an-integration/product-integration).

### Managing storage integrations

After installation, you can manage your storage resources from the Vercel dashboard:

- **View connected projects**: See which projects use each storage resource
- **Monitor usage**: Track storage consumption and costs
- **Update configuration**: Modify settings or upgrade plans
- **Access provider dashboard**: Link directly to the provider's management interface

For more details, see [Manage Native Integrations](/docs/integrations/install-an-integration/product-integration#manage-native-integrations).

## Choosing a storage solution

Consider these factors when selecting a storage provider:

| Factor                   | Considerations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data model**           | Relational (Postgres) for structured data, key-value (Redis) for caching, NoSQL for flexible schemas, vector for AI embeddings                                                                                                                                                                                                                                                                                                                                                                                               |
| **Common use cases**     | Postgres for [ACID transactions](# "What are ACID transactions?"), complex queries, and foreign keys. Redis for session storage, rate limiting, and leaderboards. Vector for semantic search and recommendations. NoSQL for document storage, high write throughput, and horizontal scaling |
| **Latency requirements** | Choose providers with regions close to your [Functions](/docs/functions/configuring-functions/region)                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Scale**                | Evaluate pricing tiers and scaling capabilities for your expected workload                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Features**             | Compare provider-specific features like branching, point-in-time recovery, or real-time subscriptions                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Best practices

- **Locate data close to your Functions:** Deploy databases in [regions](/docs/functions/configuring-functions/region) near your Functions to minimize latency.
- **Use connection pooling:** In serverless environments, use [connection pooling](/kb/guide/connection-pooling-with-functions) (e.g., built-in pooling or PgBouncer) to manage database connections efficiently.
- **Implement caching strategies:**
  - [Data Cache](/docs/runtime-cache/data-cache) to cache fetch responses and reduce load
  - [Edge Config](/docs/edge-config) for low-latency reads of config data
  - Redis for frequently accessed, periodically changing data
  - CDN caching with [cache headers](/docs/cdn-cache) for static content
- **Secure your connections:**
  - Store credentials only in [environment variables](/docs/environment-variables), never in code
  - Use SSL/TLS connections when available

## More resources

- [Add a Native Integration](/docs/integrations/install-an-integration/product-integration)
- [Integrations Overview](/docs/integrations)
- [Environment Variables](/docs/environment-variables)
- [Functions Regions](/docs/functions/configuring-functions/region)


---

[View full sitemap](/docs/sitemap)
