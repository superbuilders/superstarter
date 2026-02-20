---
title: Deployment Protection Exception
product: vercel
url: /docs/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions
type: how-to
prerequisites:
  - /docs/deployment-protection/methods-to-bypass-deployment-protection
  - /docs/deployment-protection
related:
  - /docs/security/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions
  - /docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication
  - /docs/security/deployment-protection/methods-to-protect-deployments/password-protection
  - /docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips
  - /docs/security/deployment-protection
summary: Learn how to disable Deployment Protection for a list of preview domains.
---

# Deployment Protection Exception

> **🔒 Permissions Required**: Deployment Protection Exceptions

You can use [Deployment Protection Exceptions](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions#adding-a-deployment-protection-exception) to disable Deployment Protection (including [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection), and [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips)) for a list of preview domains.

When you add a domain to Deployment Protection Exceptions, it will automatically become publicly accessible and will no longer be covered by Deployment Protection features. When you remove a domain from Deployment Protection Exceptions, the domain becomes protected again with the project's Deployment Protection settings.

![Image](https://vercel.com/front/docs/security/deployment-exception-light.png)

Deployment Protection Exceptions is designed for Preview Deployment domains, if you wish to make a Production Deployment domain public, see [Configuring Deployment Protection](/docs/security/deployment-protection#configuring-deployment-protection).

## Adding a Deployment Protection Exception

- ### Go to Project Deployment Protection Settings
  From your Vercel [dashboard](/dashboard):
  1. Select the project that you wish to enable Password Protection for
  2. Go to the **Settings** tab, and then to **Deployment Protection**

- ### Select Add Domain
  From the **Deployment Protection Exceptions** section, select **Add Domain**:

  ![Image](https://vercel.com/front/docs/security/deployment-exception-no-domain-light.png)

- ### Specify domain
  From the **Unprotect Domain** modal:
  1. Enter the domain that you wish to unprotect in the input
  2. Select **Continue**
  ![Image](https://vercel.com/front/docs/security/deployment-protection-exceptions-add-domain-light.png)

- ### Confirm domain
  From the **Unprotect Domain** modal:
  1. Confirm the domain by entering it again in the first input
  2. Enter `unprotect my domain` in the second input
  3. Select **Confirm**
  All your existing and future deployments for that domain will be **unprotected**.

  ![Image](https://vercel.com/front/docs/security/deployment-protection-exceptions-confirm-add-light.png)

## Removing a Deployment Protection Exception

- ### Go to Project Deployment Protection Settings
  From your Vercel [dashboard](/dashboard):
  1. Select the project that you wish to enable Password Protection for
  2. Go to the **Settings** tab, and then to **Deployment Protection**

- ### Select the Domain to Remove
  From the **Deployment Protection Exceptions** section:
  1. From the domain row in the **Unprotected Domains** table
  2. Select the dot menu at the end of the row
  3. From the context menu, select **Remove**
  ![Image](https://vercel.com/front/docs/security/remove-deployment-exception-light.png)

- ### Confirm the Domain to Remove
  From the **Reprotect Domain** modal:
  1. In the modal, type the domain in the first input
  2. Type `reprotect my domain` in the second input
  3. Select **Confirm**
  All your existing and future deployments for that domain will be **protected**.

  ![Image](https://vercel.com/front/docs/security/deployment-protection-exceptions-remove-light.png)

## Managing Deployment Protection Exceptions

You can view and manage all the existing Deployment Protection Exceptions for your team in the following way

1. From your [dashboard](/dashboard) go to the **Settings** tab
2. Select Deployment Protection and then choose the **Access** tab
3. Click the **All Access** button and select `Unprotected Previews`

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/deployment-protection-exceptions-list.png`)


---

[View full sitemap](/docs/sitemap)
