---
title: Integrating Vercel and Kubernetes
product: vercel
url: /docs/integrations/external-platforms/kubernetes
type: how-to
prerequisites:
  - /docs/integrations
related:
  - /docs/frameworks
  - /docs/domains
  - /docs/cdn
  - /docs/git
  - /docs/deployments/environments
summary: Deploy your frontend on Vercel alongside your existing Kubernetes infrastructure.
---

# Integrating Vercel and Kubernetes

Kubernetes (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications. It has become a popular and powerful way for companies to manage their applications.

You can integrate Vercel with your existing Kubernetes infrastructure to optimize the delivery of your frontend applications—reducing the number of services your teams need to manage, while still taking advantage of Kubernetes for your backend and other containerized workloads.

Let’s look at key Kubernetes concepts and how Vercel’s [managed infrastructure](/products/managed-infrastructure) handles them:

- [Server management and provisioning](#server-management-and-provisioning)
- [Scaling and redundancy](#scaling-and-redundancy)
- [Managing environments and deployments](#managing-environments-and-deployments)
- [Managing access and security](#managing-access-and-security)
- [Observability](#observability)
- [Integrating Vercel with your Kubernetes backend](#integrating-vercel-with-your-kubernetes-backend)
- [Before/after comparison: Kubernetes vs. Vercel](#before/after-comparison:-kubernetes-vs.-vercel)
- [Migrating from Kubernetes to Vercel](#migrating-from-kubernetes-to-vercel)

## Server management and provisioning

With Kubernetes, you must define and configure a web server (e.g. Nginx), resources (CPU, memory), and networking (ingress, API Gateway, firewalls) for each of your nodes and clusters.

Vercel manages server provisioning for you. Through [framework-defined infrastructure](/blog/framework-defined-infrastructure) and support for a [wide range of the most popular frontend frameworks](/docs/frameworks), Vercel automatically provisions cloud infrastructure based on your frontend framework code. Vercel also manages every aspect of your [domain](/docs/domains), including generating, assigning, and renewing SSL certificates.

## Scaling and redundancy

In a self-managed Kubernetes setup, you manually configure your Kubernetes cluster to scale horizontally (replicas) or vertically (resources). It takes careful planning and monitoring to find the right balance between preventing waste (over-provisioning) and causing unintentional bottlenecks (under-provisioning).

In addition to scaling, you may need to deploy your Kubernetes clusters to multiple regions to improve the availability, disaster recovery, and latency of applications.

Vercel automatically scales your applications based on end-user traffic. Vercel deploys your application globally on our [CDN](/docs/cdn), reducing latency and improving end-user performance. In the event of regional downtime or an upstream outage, Vercel automatically reroutes your traffic to the next closest region, ensuring your applications are always available to your users.

## Managing environments and deployments

Managing the container lifecycle and promoting environments in a self-managed ecosystem typically involves three parts:

- **Containerization (Docker)**: Packages applications and their dependencies into containers to ensure consistent environments across development, testing, and production.
- **Container orchestration (Kubernetes)**: Manages containers (often Docker containers) at scale. Handles deployment, scaling, and networking of containerized applications.
- **Infrastructure as Code (IaC) tool (Terraform)**: Provisions and manages the infrastructure (cloud, on-premises, or hybrid) in a consistent and repeatable manner using configuration files.

These parts work together by Docker packaging applications into containers, Kubernetes deploying and managing these containers across a cluster of machines, and Terraform provisioning the underlying infrastructure on which Kubernetes itself runs. An automated or push-button CI/CD process usually facilitates the rollout, warming up pods, performing health checks, and shifting traffic to the new pods.

Vercel knows how to automatically configure your environment through our [framework-defined infrastructure](/blog/framework-defined-infrastructure), removing the need for containerization or manually implementing CI/CD for your frontend workload.

Once you connect a Vercel project to a Git repository, every push to a branch automatically creates a new deployment of your application with [our Git integrations](/docs/git). The default branch (usually `main`) is your production environment. Every time your team pushes to the default branch, Vercel creates a new production deployment. Vercel creates a [Preview Deployment](/docs/deployments/environments#preview-environment-pre-production) when you push to another branch besides the default branch. A Preview Deployment allows your team to test changes and leave feedback using [Preview Comments](/docs/comments) in a live deployment (using a [generated URL](/docs/deployments/generated-urls)) before changes are merged to your Git production branch.

Every deploy is immutable, and these generated domains act as pointers. Reverting and deploying is an atomic swap operation. These infrastructure capabilities enable other Vercel features, like [Instant Rollbacks](/docs/instant-rollback) and [Skew Protection](/docs/skew-protection).

## Managing access and security

In a Kubernetes environment, you need to implement security measures such as Role-Based Access Control (RBAC), network policies, secrets management, and environment variables to protect the cluster and its resources. This often involves configuring access controls, integrating with existing identity providers (if necessary), and setting up user accounts and permissions. Regular maintenance of the Kubernetes environment is needed for security patches, version updates, and dependency management to defend against vulnerabilities.

With Vercel, you can securely configure [environment variables](/docs/environment-variables) and manage [user access, roles, and permissions](/docs/accounts/team-members-and-roles) in the Vercel dashboard. Vercel handles all underlying infrastructure updates and security patches, ensuring your deployment environment is secure and up-to-date.

## Observability

A Kubernetes setup typically uses observability solutions to aid in troubleshooting, alerting, and monitoring of your applications. You could do this through third-party services like Splunk, DataDog, Grafana, and more.

Vercel provides built-in logging and monitoring capabilities through our [observability products](/docs/observability) with real-time logs and built-in traffic analytics. These are all accessible through the Vercel dashboard. If needed, Vercel has [one-click integrations with leading observability platforms](/integrations), so you can keep using your existing tools alongside your Kubernetes-based backend.

## Integrating Vercel with your Kubernetes backend

If you’re running backend services on Kubernetes (e.g., APIs, RPC layers, data processing jobs), you can continue doing so while offloading your frontend to Vercel’s managed infrastructure:

- **Networking**: Vercel can securely connect to your Kubernetes-hosted backend services. You can keep your APIs behind load balancers or private networks. For stricter environments, [Vercel Secure Compute](/docs/secure-compute) (available on Enterprise plans) ensures secure, private connectivity to internal services.
- **Environment Variables and Secrets**: Your application’s environment variables (e.g., API keys, database credentials) can be configured securely in the [Vercel dashboard](/docs/environment-variables).
- **Observability**: You can maintain your existing observability setup for Kubernetes (Grafana, DataDog, etc.) while also leveraging Vercel’s built-in logs and analytics for your frontend.

## Before/after comparison: Kubernetes vs. Vercel

Here's how managing frontend infrastructure compares between traditional, self-managed Kubernetes and Vercel's fully managed frontend solution:

| **Capability**                         | **Kubernetes (Self-managed)**                                                           | **Vercel (Managed)**                              |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Server Provisioning**                | Manual setup of Nginx, Node.js pods, ingress, load balancing, and networking policies   | Automatic provisioning based on framework code    |
| **Autoscaling**                        | Manual configuration required (horizontal/vertical scaling policies)                    | Fully automatic scaling                           |
| **Availability (Multi-region)**        | Manually set up multi-region clusters for redundancy and latency                        | Built-in global CDN                               |
| **Deployment & Rollbacks**             | Rolling updates can cause downtime (version skew)                                       | Zero downtime deployments and instant rollbacks   |
| **Runtime & OS Security Patches**      | Manual and ongoing maintenance                                                          | Automatic and managed by Vercel                   |
| **Multi-region Deployment & Failover** | Manual setup, configuration, and management                                             | Automatic global deployment and failover          |
| **Version Skew Protection**            | Manual rolling deployments (possible downtime)                                          | Built-in Skew Protection                          |
| **Observability & Logging**            | Requires third-party setup (Grafana, Splunk, DataDog)                                   | Built-in observability and one-click integrations |
| **CI/CD & Deployment Management**      | Requires integration of multiple tools (Docker, Kubernetes, Terraform, CI/CD pipelines) | Built-in Git-integrated CI/CD system              |

By migrating just your frontend to Vercel, you drastically reduce the operational overhead of managing and scaling web servers, pods, load balancers, ingress controllers, and more.

## Migrating from Kubernetes to Vercel

To incrementally move your frontend applications to Vercel:

- ### Create a Vercel account and team
  Start by [creating a Vercel account](/signup) and [team](/docs/accounts/create-a-team), if needed.

- ### Create two versions of your frontend codebase
  Keep your current frontend running in Kubernetes for now. Create a fork or a branch of your frontend codebase and connect it to a [new Vercel project](/docs/projects/overview#creating-a-project).

  Once connected, Vercel will automatically build and deploy your application. It’s okay if the first deployment fails. [View the build logs](/docs/deployments/logs) and [troubleshoot the build](/docs/deployments/troubleshoot-a-build) failures. Changes might include:
  - Adjustments to build scripts
  - Changes to the [project configuration](/docs/project-configuration)
  - Missing [environment variables](/docs/environment-variables)
  Continue addressing errors until you get a successful Preview Deployment.

  Depending on how you have your Kubernetes environment configured, you may need to adjust firewall and security policies to allow the applications to talk to each other. Vercel [provides some options](/kb/guide/how-to-allowlist-deployment-ip-address), including [Vercel Secure Compute](/docs/secure-compute) for Enterprise teams, which allows you to establish secure connections between Vercel and backend environments.

  The goal is to use the Preview Deployment to test the integration with your Kubernetes-hosted backends, ensuring that API calls and data flow work as expected.

- ### Set up users and integrations
  Use [Vercel’s dashboard](/dashboard) to securely manage [user access, roles, and permissions](/docs/accounts/team-members-and-roles), so your team can collaborate on the project.
  - [Add team members and assign roles](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) ([SAML SSO](/docs/saml) is available on [Enterprise plans](/docs/plans/enterprise))
  - [Add integrations](/integrations) to any existing services and tools your team uses

- ### Begin a full or gradual rollout
  Once your preview deployment is passing all tests, and your team is happy with it, you can start to roll it out.

  We recommend following our [incremental migration guide](/docs/incremental-migration/migration-guide) or our [Vercel Adoption](/resources/the-architects-guide-to-adopting-vercel) guide to help you serve traffic to a Vercel-hosted frontend for any new paths and seamlessly fallback to your existing server for any old paths.

  Some other tools or strategies you may want to use:
  - [Feature Flags on Vercel](/docs/feature-flags)
  - [A/B Testing on Vercel](/kb/guide/ab-testing-on-vercel)
  - [Implementing Blue-Green Deployments on Vercel](/kb/guide/blue_green_deployments_on_vercel)
  - [Transferring Domains to Vercel](/kb/guide/transferring-domains-to-vercel)
  - [How to migrate a site to Vercel without downtime](/kb/guide/zero-downtime-migration)

- ### Maintain the backend on Kubernetes
  Continue running your backend services on Kubernetes, taking advantage of its strengths in container orchestration for applications your company may not want to move or are unable to move. Examples could include:
  - APIs
  - Remote Procedure Calls (RPC)
  - Change Data Captures (CDC)
  - Extract Transfer Loads (ETL)
  Over time, you can evaluate whether specific backend services could also benefit from a serverless architecture and be migrated to Vercel.

- ### Accelerate frontend iteration velocity on Vercel
  With Vercel, your development processes become simpler and faster. Vercel combines all the tools you need for CI/CD, staging, testing, feedback, and QA into one streamlined [developer experience platform](/products/dx-platform) to optimize the delivery of high-quality frontend applications. Instant deployments, live previews, and comments accelerate your feedback cycle, while uniform testing environments ensure the quality of your work—letting you focus on what you do best: Building top-notch frontend applications.

  A [recent study](/roi) found Vercel customers see:
  - Up to 90% increase in site performance
  - Up to 80% reduction in time spent deploying
  - Up to 4x faster time to market


---

[View full sitemap](/docs/sitemap)
