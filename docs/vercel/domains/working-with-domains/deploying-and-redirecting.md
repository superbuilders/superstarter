---
title: Deploying & Redirecting Domains
product: vercel
url: /docs/domains/working-with-domains/deploying-and-redirecting
type: how-to
prerequisites:
  - /docs/domains/working-with-domains
  - /docs/domains
related:
  - /docs/git
  - /docs/domains/working-with-domains
  - /docs/projects/overview
  - /docs/cdn
  - /docs/redirects
summary: Learn how to deploy your domains and set up domain redirects with this guide.
---

# Deploying & Redirecting Domains

## Deploying your Domain

Once the domain has been added to your project and configured, it is **automatically applied to your latest production deployment**.

> **💡 Note:** The first deployment of a new project will be marked as production and
> subsequently assigned with your custom domain automatically.

When you assign a custom domain to a project that's using [Git](/docs/git), each push (including merges) that you make to the [production branch](/docs/git#production-branch) (commonly `main`) will trigger a deployment to the domain.

When you assign a domain to a *different* branch, you'll need to make a new deployment to the desired branch for the domain to resolve correctly.

Reverts take effect immediately, assigning the **Custom Domain** to the deployment made prior to the point the revert is effective from.

## Redirecting domains

You can add domain redirects from the **Domains** tab when more than one domain is present in the project. This provides a way to, for example, redirect a `www` **subdomain** to an **apex domain**, but can be used in a variety of ways.

> **💡 Note:** If a user visits your domain with or without the "www" subdomain prefix, we
> will attempt to redirect automatically. You might still want to add this
> redirect explicitly.

To add a redirect, navigate to the **Domains** tab within **Project Settings**, then select **Edit** on the domain you want to redirect from. Use the **Redirect to** dropdown to select the domain you want to redirect to:

![Image](`/docs-assets/static/docs/domains/redirect-domain-light.png`)

*A domain redirect that redirects requests made to \`www.acme.com\` to
\`acme.com\`.*

## Redirecting `www` domains

Adding an [apex domain](/docs/domains/working-with-domains#apex-domain) to a [Project](/docs/projects/overview) on Vercel will automatically suggest adding its `www` counterpart. Using both of these domains ensures that visitors can always access your site, regardless of whether or not they use `www` when entering the URL.

We recommend using the `www` subdomain as your primary domain, with a redirect from the non-`www` domain to it. This allows the [Vercel CDN](/docs/cdn) more control over incoming traffic for improved reliability, speed, and security. The redirect is also cached on visitor's browsers for faster subsequent visits.

Some browsers like Google Chrome automatically hide the `www` subdomain from the address bar, so this redirect may not affect your URL appearance.

Choosing to redirect the `www` domain to the non-`www` also works but provides Vercel less control over incoming traffic. Alternatively, you can choose to add only the domain you typed.

## Additional technical information about Domain redirects

The DNS spec forbids using CNAME records on apex domains like `example.com`. They are, however, allowed for subdomains like `www.example.com`. This is why Vercel recommends primarily using a `www` domain with a CNAME record, and adding a redirect from the non-`www` domain to it.

Using CNAME instead of A records ensures that domains on Vercel are fast, reliable, and fault-tolerant. Unlike A records, CNAME records avoid hard-coding a specific IP address in favor of an additional lookup at the DNS level. This means that Vercel can quickly steer traffic in the case of DDoS attacks or for performance optimizations.

While we recommend using `www` as described above, Vercel maximizes the reliability and performance of your apex domain if you choose to use it as your primary domain by leveraging the [Anycast methodology](https://en.wikipedia.org/wiki/Anycast). This means Vercel still supports geographically routed traffic at infinite scale if you use an A record.

## Programmatic redirects

You can also add redirects programmatically using frameworks and Vercel Functions. [Learn more](/docs/redirects).


---

[View full sitemap](/docs/sitemap)
