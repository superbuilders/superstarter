---
title: Add a Native Integration
product: vercel
url: /docs/integrations/install-an-integration/product-integration
type: how-to
prerequisites:
  - /docs/integrations/install-an-integration
  - /docs/integrations
related:
  - /docs/integrations/create-integration/billing
  - /docs/integrations/create-integration/deployment-integration-action
summary: Learn how you can add a product to your Vercel project through a native integration.
---

# Add a Native Integration

> **🔒 Permissions Required**: Native Integrations

## Add a product

1. From the [Vercel dashboard](/dashboard), select the **Integrations** tab and then the **Browse Marketplace** button. You can also go directly to the [Integrations Marketplace](https://vercel.com/integrations).
2. Under the **Native Integrations** section, select an integration that you would like to install. You can see the details of the integration, the products available, and the pricing plans for each product.
3. From the integration's detail page, select **Install**.
4. Review the dialog showing the products available for this integration and a summary of the billing plans for each. Select **Install**.
5. Then, select a pricing plan option and select **Continue**. The specific options available in this step depend on the type of product and the integration provider. For example, for a storage database product, you may need to select a **Region** for your database deployment before you can select a plan. For an AI service, you may need to select a pre-payment billing plan.
6. Provide additional information in the next step like **Database Name**. Review the details and select **Create**. Once the integration has been installed, you are taken to the tab for this type of integration in the Vercel dashboard. For example, for a storage product, it will be the **Storage** tab. You will see the details about the database, the pricing plan and how to connect it to your project.

## Manage native integrations

Once installed, you can manage the following aspect of the native integration:

- View the installed resources (instances of products) and then manage each resource.
- Connect project(s) to a provisioned resource. For products supporting Log Drains, you can enable them and configure which log sources to forward and the sampling rate.
- View the invoices and usage for each of your provisioned resources in that installation. See [Billing](/docs/integrations/create-integration/billing) for details on invoice lifecycle, pricing structures, and refunds.
- [Uninstall the integration](/docs/integrations/install-an-integration/product-integration#uninstall-an-integration)

### Manage products

To manage products inside the installed integration:

1. From your Vercel [dashboard](/dashboard), go to the **Integrations** tab.
2. Next to the integration, select the **Manage** button. Native integrations appear with a `billable` badge.
3. On the Integrations page, under **Installed Products**, select the card for the product you would like to update to be taken to the product's detail page.

#### Projects

By selecting the **Projects** link on the left navigation, you can:

- Connect a project to the product
- View a list of existing connections and manage them

#### Settings

By selecting the **Settings** link on the left navigation, you can update the following:

- Product name
- Manage funds: if you selected a prepaid plan for the product, you can **Add funds** and manage auto recharge settings
- Delete the product

#### Getting Started

By selecting the **Getting Started** link on the left navigation, you can view quick steps with sample code on how to use the product in your project.

#### Usage

By selecting the **Usage** link on the left navigation, you can view a graph of the funds used over time by this product in all the projects where it was installed.

#### Resources

Under **Resources** on the left navigation, you can view a list of links which vary depending on the provider for support, guides and additional resources to help you use the product.

### Add more products

To add more products to this integration:

1. From your Vercel [dashboard](/dashboard), go to the **Integrations** tab.
2. Next to the integration, select the **Manage** button. Native integrations appear with a `billable` badge.
3. On the Integrations page, under **More Products**, select the **Install** button for any additional products in that integration that you want to use.

### Uninstall an integration

Uninstalling an integration automatically removes all associated products and their data.

1. From your Vercel [dashboard](/dashboard), go to the **Integrations** tab.
2. Next to the integration, select the **Manage** button.
3. At the bottom of the integrations page, under **Uninstall**, select **Uninstall Integration** and follow the steps to uninstall.

## Use deployment integration actions

If available in the integration you want to install, [deployment integration actions](/docs/integrations/create-integration/deployment-integration-action) enable automatic task execution during deployment, such as branching a database or setting environment variables.

1. Navigate to the integration and use **Install Product** or use an existing provisioned resource.
2. Open the **Projects** tab for the provisioned resource, click **Connect Project** and select the project for which to configure deployment actions.
3. When you create a deployment (with a Git pull request or the Vercel CLI), the configured actions will execute automatically.

## Best practices

- Plan your product strategy: Decide whether you need separate products for different projects or environments:
  - Single resource strategy: For example, a small startup can use a single storage instance for all their Vercel projects to simplify management.
  - Per-project resources strategy: For example, an enterprise with multiple product lines can use separate storage instances for each project for better performance and security.
  - Environment-specific resources strategy: For example, a company can use different storage instances for each environment to ensure data integrity.
- Monitor Usage: Take advantage of per-product usage tracking to optimize costs and performance by using the **Usage** and **Invoices** tabs of the [product's settings page](/docs/integrations/install-an-integration/product-integration#manage-products). Learn more about [billing](/docs/integrations/create-integration/billing) for native integrations.


---

[View full sitemap](/docs/sitemap)
