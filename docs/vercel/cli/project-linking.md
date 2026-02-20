---
title: Linking Projects with Vercel CLI
product: vercel
url: /docs/cli/project-linking
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/dashboard-features
  - /docs/projects/overview
  - /docs/cli/deploy
  - /docs/cli/link
summary: Learn how to link existing Vercel Projects with Vercel CLI.
---

# Linking Projects with Vercel CLI

When running `vercel` in a directory for the first time, Vercel CLI needs to know which [scope](/docs/dashboard-features#scope-selector) and [Vercel Project](/docs/projects/overview) you
want to [deploy](/docs/cli/deploy) your directory to. You can choose to either [link](/docs/cli/link) an existing Vercel Project or to create a new one.

```bash filename="terminal"
vercel
? Set up and deploy "~/web/my-lovely-project"? [Y/n] y
? Which scope do you want to deploy to? My Awesome Team
? Link to existing project? [y/N] y
? What’s the name of your existing project? my-lovely-project
🔗 Linked to awesome-team/my-lovely-project (created .vercel and added it to .gitignore)
```

*Linking an existing Vercel Project when running Vercel CLI in a new directory.*

Once set up, a new `.vercel` directory will be added to your directory. The `.vercel` directory contains
both the organization and `id` of your Vercel Project. If you want to [unlink](/docs/cli/link) your directory, you can remove the `.vercel` directory.

You can use the [`--yes` option](/docs/cli/deploy#yes) to skip these questions.

## Framework detection

When you create a new Vercel Project, Vercel CLI will [link](/docs/cli/link) the Vercel Project and automatically detect the framework you are using and offer
default Project Settings accordingly.

```bash filename="terminal"
vercel
? Set up and deploy "~/web/my-new-project"? [Y/n] y
? Which scope do you want to deploy to? My Awesome Team
? Link to existing project? [y/N] n
? What’s your project’s name? my-new-project
? In which directory is your code located? my-new-project/
Auto-detected project settings (Next.js):
- Build Command: \`next build\` or \`build\` from \`package.json\`
- Output Directory: Next.js default
- Development Command: next dev --port $PORT
? Want to override the settings? [y/N]
```

*Creating a new Vercel Project with the vercel
command.*

You will be provided with default **Build Command**, **Output Directory**, and **Development Command** options.

You can continue with the default Project Settings or overwrite them. You can also edit your Project Settings later in your Vercel Project dashboard.

## Relevant commands

- [deploy](/docs/cli/deploy)
- [link](/docs/cli/link)


---

[View full sitemap](/docs/sitemap)
