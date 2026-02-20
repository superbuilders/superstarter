---
title: Shared Responsibility Model
product: vercel
url: /docs/security/shared-responsibility
type: conceptual
prerequisites:
  - /docs/security
related:
  - /docs/security
  - /docs/security/pci-dss
  - /docs/production-checklist
  - /docs/spend-management
  - /docs/observability/monitoring
summary: Discover the essentials of our Shared Responsibility Model, outlining the key roles and responsibilities for customers, Vercel, and shared aspects in...
---

# Shared Responsibility Model

A shared responsibility model is a framework designed to split tasks and obligations between two groups in cloud computing. The model divides duties to ensure security, maintenance, and service functionality.

When using a cloud platform such as Vercel, it is important to understand where your security responsibilities lie, and where Vercel takes responsibility. This is especially important when it comes to handling data, such as user account information, payment details, source code and other sensitive information.

The customer handles their data, applications, and user access management. This includes data encryption, safeguarding sensitive information, and assigning appropriate permissions to users.

Vercel manages infrastructure components, such as compute, storage, and networking. Our role is to guarantee that the platform is secure, dependable, and maintained.

![Image](`/docs-assets/static/docs/security/shared-responsibility-model-light-mode.png`)

## Customer responsibilities

- **Security Requirements Assessment**: Customers are responsible for evaluating and deciding whether Vercel's platform and the security protection provided meet the specific needs and requirements for their application. By choosing to use our platform, customers acknowledge and accept the level of security coverage offered by Vercel
  - **Handling Malicious Traffic**: Customers are responsible for addressing any costs and resource consumption related to malicious traffic. They should assess their security requirements and implement additional safeguards beyond the [protections](/docs/security) provided by Vercel
  - **Payment Transactions**: Customers subject to PCI DSS compliance are responsible for choosing an appropriate payment gateway provider to integrate an [iframe into their application](/docs/security/pci-dss). Vercel provides a Responsibility Matrix, available in our [Trust Center](https://security.vercel.com), that further outlines the security and compliance responsibilities between Vercel and its customers.
- **Client-side Data**: Customers are responsible for the security and management of data on their clients' devices
- **Source Code**: Customers are responsible for securely storing, and maintaining their source code at all times
- **Server-side Encryption**: Customers are responsible for encrypting their server-side data, whether it's stored in the file system or in a database
- **Identity & Access Management (IAM)**: Customers choose and implement their desired level of access control regarding their IAM configuration with tools provided by Vercel
- **Region Selection for Compute**: Customers are responsible for selecting the appropriate regions for their compute resources based on their requirements and compliance needs
- **Production Checklist**: Customers are responsible for implementing and adhering to recommended best practices provided in [Vercel's production checklist](/docs/production-checklist). The customer must ensure these guidelines for optimizing application performance and security are properly followed and integrated into their application's development and deployment processes
- **Spend Management**: Customers are responsible for enabling [Spend Management](/docs/spend-management) to set a reasonable spend amount and configure actions based on the amount as needed

## Shared responsibilities

- **Information and Data**: Customers control and own their data. By design, customers determine the access to their data and are responsible for securing and protecting it while in their possession. Vercel does not have visibility into customers' data until they provide it to us. Once in our possession, it is our responsibility to protect and secure it. This shared responsibility ensures the safety and privacy of our customers' data
  - **Integrations**: Customers are responsible for deciding which Vercel services to use and the data that is collected or needed to provide those services. This includes making choices about optional features such as [monitoring](/docs/observability/monitoring) and [analytics](/docs/analytics), which give customers more information about their end users. Integrations with third-party services should also be considered in this context, as they can impact the data collected and shared
- **Encryption & Data Integrity**: Vercel is responsible for [encryption](/docs/security/encryption) and data integrity for data in transit (when in motion between systems or locations) and at rest for the services Vercel controls. However, customers must ensure that all integrations and third-party services used to interact with Vercel are properly secured. This includes proxies, WAFs, CMSs, and integrations with other third-party services
  - **User Code & Environment Variables**: Customers are responsible for managing their application's code, including the exposure of [environment variables](/docs/environment-variables). By providing code and setting environment variables, customers authorize Vercel to build and deploy their application based on the provided parameters. It is essential for customers to ensure proper handling of sensitive information, such as API keys or other secrets, to maintain the security of their application and data
- **Authentication**: Customers handle their app's authentication with tools like [NextAuth.js](https://next-auth.js.org/getting-started/introduction). Vercel manages platform authentication and provides [deployment protection](/docs/security/deployment-protection) to help secure the platform for Pro and Hobby users, who authenticate using the [CLI](/docs/cli/login). Enterprise users can access Single Sign-On (SSO). Vercel deployments can be protected in the following ways: [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication), [SSO](/docs/saml), or [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection)
- **Log Management**: While Vercel provides access to short-term [runtime logs](/docs/runtime-logs) for debugging purposes, it is the customer's responsibility to set up [log drains](/docs/drains) for long-term log retention, data auditing, or additional visibility into their application's performance

## Vercel responsibilities

- **Infrastructure**: Vercel is responsible for the security and availability of the underlying infrastructure used to provide our services. Vercel maintains strict security protocols and regularly performs upgrades to ensure that our infrastructure is up to date and secure
  - **Multiple Availability Zones and Globally Located Edge Locations**: Vercel makes use of 20 different [regions](/docs/regions), which are strategically placed around the globe to provide fast and reliable content delivery to customers
- **Compute**: Vercel provides a compute environment for customer applications that utilizes Vercel Functions and containers to ensure the secure execution of customer code and middleware. Industry-standard security practices are used to isolate customer applications and ensure they are not impacted by other applications running on the platform
- **Storage**: Vercel is responsible for the security and reliability of storage environments for customer data. This includes the storage of application code, configuration files, and other data required to run customer applications. Vercel uses industry-standard encryption and access controls to ensure that customer data is protected from unauthorized access
- **Networking**: Vercel is responsible for providing a secure and reliable networking environment for customer applications. This includes the network infrastructure used to connect customer applications to the internet, as well as the firewalls and other security measures used to protect them from unauthorized access. Industry-standard security practices are used to monitor network traffic and detect and respond to potential security threats


---

[View full sitemap](/docs/sitemap)
