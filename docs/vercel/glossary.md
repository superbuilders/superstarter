---
title: Glossary
product: vercel
url: /docs/glossary
type: reference
prerequisites:
  []
related:
  - /docs/fluid-compute
  - /docs/feature-flags
  - /docs/vercel-blob
  - /docs/edge-config
  - /docs/marketplace
summary: "Learn about the terms and concepts used in Vercel's products and documentation."
---

# Glossary

A full glossary of terms used in Vercel's products and documentation.

## A

### Active CPU

A pricing model for [Fluid Compute](/docs/fluid-compute) where you only pay for the actual CPU time your functions use while executing, rather than provisioned capacity.

### AI Gateway

A proxy service from Vercel that routes model requests to various AI providers, offering a unified API, budget management, usage monitoring, load balancing, and fallback capabilities.

### AI SDK

A TypeScript toolkit designed to help developers build AI-powered applications with React, Next.js, Vue, Svelte, and Node.js by providing unified APIs for multiple LLM providers.

### Analytics

See [Web Analytics](#web-analytics).

### Anycast Network

A network topology that shares an IP address among multiple nodes, routing requests to the nearest available node based on network conditions to improve performance and fault tolerance.

## B

### Build

The process that Vercel performs every time you deploy your code, compiling, bundling, and optimizing your application so it's ready to serve to users.

### Build Cache

A cache that stores build artifacts and dependencies to speed up subsequent deployments. Each build cache can be up to 1 GB and is retained for one month.

### Build Command

The command used to build your project during deployment. Vercel automatically configures this based on your framework, but it can be overridden.

### Build Output API

A file-system-based specification for a directory structure that can produce a Vercel deployment, primarily targeted at framework authors.

### Bot Protection

Security features that help identify and block malicious bots and crawlers from accessing your applications.

## C

### CDN (Content Delivery Network)

A distributed network of servers that stores static content in multiple locations around the globe to serve content from the closest server to users.

### CI/CD (Continuous Integration/Continuous Deployment)

Development practices where code changes are automatically built, tested, and deployed. Vercel provides built-in CI/CD through Git integrations.

### CLI (Command Line Interface)

The Vercel CLI is a command-line tool that allows you to deploy projects, manage deployments, and configure Vercel from your terminal.

### Compute

The processing power and execution environment where your application code runs. Vercel offers serverless compute through Functions and Routing Middleware.

### Concurrency

The ability to handle multiple requests simultaneously. Vercel Functions support concurrency scaling and [Fluid Compute](/docs/fluid-compute) offers enhanced concurrency.

### Core Web Vitals

Key metrics defined by Google that assess your web application's loading speed, responsiveness, and visual stability, including Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS).

### Cron Jobs

Scheduled tasks that run at specified intervals. Vercel supports cron jobs for automating recurring processes.

### Custom Domain

A domain that you own and configure to point to your Vercel deployment, replacing the default `.vercel.app` domain.

## D

### Data Cache

A specialized cache for the Next.js App Router that stores responses from data fetches, allowing for granular segment-level caching rather than per-route caching.

### DDoS (Distributed Denial of Service)

A type of cyber attack where multiple systems flood a target with traffic. Vercel provides built-in DDoS protection and mitigation.

### Deploy Hooks

URLs that accept HTTP POST requests to trigger deployments without requiring a new Git commit.

### Deployment

The result of a successful build of your project on Vercel. Each deployment generates a unique URL and represents a specific version of your application.

### Deployment Protection

Security features that restrict access to your deployments using methods like Vercel Authentication, Password Protection, or Trusted IPs.

### Directory

A file system structure used to organize and store files, also known as a folder. Often abbreviated as "dir" in programming contexts.

### Drains

A feature that allows you to send observability data (logs, traces, speed insights, and analytics) to external services for long-term retention and analysis.

## E

### Edge

The edge refers to servers closest to users in a distributed network. Vercel's CDN runs code and serves content from edge locations globally.

### Edge Config

A global data store that enables ultra-fast data reads in the region closest to the user (within 15ms at P99, often less than 1ms) for configuration data like feature flags.

### Edge Runtime

A minimal JavaScript runtime that exposes Web Standard APIs, used for Vercel Functions and Routing Middleware.

### Environment

A context for running your application, such as Local Development, Preview, or Production. Each environment can have its own configuration and environment variables.

### Environment Variables

Configuration values that can be accessed by your application at build time or runtime, used for API keys, database connections, and other sensitive information.

## F

### Fast Data Transfer

Data transfer between the Vercel CDN and user devices, optimized for performance and charged based on usage.

### Feature Flags

Configuration switches that allow you to enable or disable features without deploying new code. Vercel offers the [Flags SDK](/docs/feature-flags) for implementing flags in Next.js and SvelteKit, and Flags Explorer for managing flags through the Vercel Toolbar.

### Firewall

See [Vercel Firewall](#vercel-firewall).

### Fluid Compute

An enhanced execution model for Vercel Functions that provides in-function concurrency, and a new pricing model where you only pay for the actual CPU time your functions use while executing, rather than provisioned capacity.

### Framework

A software library that provides a foundation for building applications. Vercel supports over 30 frameworks including Next.js, React, Vue, and Svelte.

### Framework Preset

A configuration setting that tells Vercel which framework your project uses, enabling automatic optimization and build configuration.

### Functions

See [Vercel Functions](#vercel-functions).

## G

### Git Integration

Automatic connection between your Git repository (GitHub, GitLab, Bitbucket, Azure DevOps) and Vercel for continuous deployment.

## H

### Headers

HTTP headers that can be configured to modify request and response behavior, improving security, performance, and functionality.

### HTTPS/SSL

Secure HTTP protocol that encrypts communication between clients and servers. All Vercel deployments automatically use HTTPS with SSL certificates.

## I

### I/O-bound

Processes limited by input/output operations rather than CPU speed, such as database queries or API requests. Optimized through concurrency.

### Image Optimization

Automatic optimization of images including format conversion, resizing, and compression to improve performance and reduce bandwidth.

### Incremental Static Regeneration (ISR)

A feature that allows you to update static content without redeployment by rebuilding pages in the background on a specified interval.

### Install Command

The command used to install dependencies before building your project, such as `npm install` or `pnpm install`.

### Integration

Third-party services and tools that connect with Vercel to extend functionality, available through the Vercel Marketplace.

## J

### JA3/JA4 Fingerprints

TLS fingerprinting techniques used by Vercel's security systems to identify and restrict malicious traffic patterns.

## M

### Managed Infrastructure

Vercel's fully managed platform that handles server provisioning, scaling, security, and maintenance automatically.

### MCP (Model Context Protocol)

A protocol for AI applications that enables secure and standardized communication between AI models and external data sources.

### Middleware

See [Routing Middleware](#routing-middleware).

### Microfrontends

A development approach that allows you to split a single application into smaller, independently deployable units that render as one cohesive application for users. Different teams can use different technologies to develop, test, and deploy each microfrontend independently.

### Monorepo

A version control strategy where multiple packages or modules are stored in a single repository, facilitating code sharing and collaboration.

### Multi-repo

A version control strategy where each package or module has its own separate repository, also known as "polyrepo."

### Multi-tenant

Applications that serve multiple customers (tenants) from a single codebase, with each tenant getting their own domain or subdomain.

## N

### Node.js

A JavaScript runtime environment that Vercel supports for Vercel Functions and applications.

## O

### Observability

Tools and features that help you monitor, analyze, and understand your application's performance, traffic, and behavior in production.

### OIDC (OpenID Connect)

A federation protocol that issues short-lived, non-persistent tokens for secure backend access without storing long-lived credentials.

### Origin Server

The server that stores and runs the original version of your application code, where requests are processed when not served from cache.

### Output Directory

The folder containing your final build output after the build process completes, such as `dist`, `build`, or `.next`.

## P

### Package

A collection of files and directories grouped together for a common purpose, such as libraries, applications, or development tools.

### Password Protection

A deployment protection method that restricts access to deployments using a password, available on Enterprise plans or through the Advanced Deployment Protection add-on for Pro plans.

### Points of Presence (PoPs)

Distributed servers in Vercel's CDN that provide the first point of contact for requests, handling routing, DDoS protection, and SSL termination.

### Preview Deployment

A deployment created from non-production branches that allows you to test changes in a live environment before merging to production.

### Production Deployment

The live version of your application that serves end users, typically deployed from your main branch.

### Project

An application that you have deployed to Vercel, which can have multiple deployments and is connected to a Git repository.

## R

### Real Experience Score (RES)

A performance metric in Speed Insights that uses real user data to measure your application's actual performance in production.

### Redirects

HTTP responses that tell clients to make a new request to a different URL, useful for enforcing HTTPS or directing traffic.

### Region

Geographic locations where Vercel can run your functions and store data. Vercel has 20 compute-capable regions globally.

### Repository

A location where files and source code are stored and managed in version control systems like Git, maintaining history of all changes.

### Rewrites

URL transformations that change what the server fetches internally without changing the URL visible to the client.

### Routing Middleware

Code that executes before a request is processed, running on [Fluid Compute](/docs/fluid-compute) to modify responses, implement authentication, or perform redirects.

### Runtime

The execution environment for your functions, such as Node.js, Edge Runtime, Python, or other supported runtimes.

### Runtime Logs

Logs generated by your functions during execution, useful for debugging and monitoring application behavior.

## S

### SAML SSO (Single Sign-On)

An authentication protocol that allows teams to log into Vercel using their organization's identity provider. Available on Enterprise plans and as a Pro add-on.

### Sandbox

See [Vercel Sandbox](#vercel-sandbox).

### Secure Compute

An Enterprise add-on that creates private connections between Vercel Functions and backend infrastructure using dedicated static IP addresses, VPC peering, and isolated networks.

### Serverless

A cloud computing model where code runs without managing servers, automatically scaling based on demand and charging only for actual usage.

### Speed Insights

Performance monitoring that provides detailed insights into your website's Core Web Vitals and loading performance metrics.

### Storage

Vercel's suite of storage products including [Vercel Blob](/docs/vercel-blob) for large file storage, [Edge Config](/docs/edge-config) for low-latency configuration data, and the [Vercel Marketplace](/docs/marketplace) for databases like Postgres, KV, and NoSQL from providers such as Neon and Upstash.

### Streaming

A technique for sending data progressively from functions to improve perceived performance and responsiveness.

## T

### Trusted IPs

A deployment protection method that restricts access to deployments based on IP address allowlists, available on Enterprise plans.

### Turborepo

A high-performance build system for monorepos that provides fast incremental builds and remote caching capabilities.

## V

### v0

An AI-powered tool that converts natural language descriptions into React code and UI components, integrated with Vercel for deployment.

### Vercel Authentication

A deployment protection method that restricts access to team members and authorized users with Vercel accounts.

### Vercel Blob

Scalable object storage service for static assets like images, videos, and files, optimized for global content delivery.

### Vercel Firewall

A multi-layered security system that protects applications from threats, including platform-wide DDoS protection and customizable WAF rules.

### Vercel Functions

Serverless compute that allows you to run server-side code without managing servers. Functions automatically scale based on demand and offer enhanced concurrency through [Fluid Compute](/docs/fluid-compute) for AI workloads and I/O-bound tasks.

### Vercel Sandbox

An ephemeral compute primitive for safely running untrusted or user-generated code in isolated Linux VMs, designed for AI agents, code generation, and developer experimentation.

### Virtual Experience Score (VES)

A predictive performance metric that anticipates the impact of changes on application performance before deployment.

## W

### WAF (Web Application Firewall)

A customizable security layer that allows you to define rules to protect against attacks, scrapers, and unwanted traffic.

### Web Analytics

Privacy-friendly analytics that provide insights into website visitors, page views, and user behavior without using cookies.

### Workspace

In JavaScript, an entity in a repository that can be either a single package or a collection of packages, often at the repository root.


---

[View full sitemap](/docs/sitemap)
