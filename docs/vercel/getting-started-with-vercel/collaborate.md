---
title: Collaborate on Vercel
product: vercel
url: /docs/getting-started-with-vercel/collaborate
type: tutorial
prerequisites:
  - /docs/getting-started-with-vercel
related:
  - /docs/deployments/generated-urls
  - /docs/deployments/builds
  - /docs/deployments
  - /docs/domains
  - /docs/comments
summary: "Amplify collaboration and productivity with Vercel's CI/CD tools, such as Comments. Empower your team to build and deploy together seamlessly."
---

# Collaborate on Vercel

Collaboration is key in successful development projects, and Vercel offers robust features to enhance collaboration among developers. From seamless code collaboration to real-time previews with Comments, Vercel empowers your team to work together effortlessly.

## Make Changes

Now that your project is publicly available on your domain of choice, it’s time to begin making changes to it. With Vercel's automatic deployments, this won't require any extra effort. By default, when your Vercel project is connected to a Git repository, Vercel will deploy **every** commit that is pushed to the Git repository, regardless of which branch you're pushing it to.

> **💡 Note:** A Production environment is one built from the `main` or development branch of
> your Git repository. A preview environment is created when you deploy from any
> other branch.

Vercel provides a [URL](/docs/deployments/generated-urls#generated-from-git) that reflects the latest pushes to that branch. You can find this either on your dashboard, or in a pull request, which you'll see in the next step

This connection was established for you automatically, so all you have to do is push commits, and you will start receiving links to deployments right on your Git provider.

## Create a preview deployment

- ### Make your changes
  Create a new branch in your project and make some changes

- ### Commit your changes
  Commit those changes and create a pull request. After a few seconds, Vercel picks up the changes and starts to build and deploy your project. You can see the status of the build through the bot comment made on your PR:

  ![Image](`/docs-assets/static/docs/concepts/deployments/git/github-comment-light.png`)

- ### Inspect your deployment information
  Select **Inspect** to explore the build within your dashboard. You can see the build is within the preview environment and additional information about the deployment including: [build information](/docs/deployments/builds), a [deployment summary](/docs/deployments#resources-tab-and-deployment-summary), checks, and [domain assignment](/docs/domains). These happen for every deployment

  ![Image](`/docs-assets/static/docs/getting-started-with-vercel/preview-dashboard-light.png`)

- ### View your deployment URL
  Return to your pull request. At this point your build should be deployed and you can select **Visit Preview**. You can now see your changes and share this preview URL with others.

## Commenting on previews

[Comments](/docs/comments) provide a way for your team [or friends](/docs/comments/how-comments-work#sharing) to give direct feedback on [preview deployments](/docs/deployments/environments#preview-environment-pre-production). Share with others by doing the following:

- ### Open your deployment
  Open the preview deployment that you’d like to share by selecting the **Domain** from the deployment information as shown in step 3 above. Alternatively, you can find it by selecting your project from the [dashboard](/dashboard), and selecting the most recent commit under **Active Branches**:

  ![Image](`/docs-assets/static/docs/getting-started-with-vercel/active-branches-light.png`)

- ### Authenticate with your Vercel account
  From the Comments toolbar at the bottom of the screen, select **Log in to comment** and sign in with your Vercel account.

- ### Adjust the share settings
  Select **Share** in the [Toolbar](/docs/vercel-toolbar) menu. Add the emails of people you would like to share the preview with. If you are previewing a specific commit, you may have the option to share the preview for your branch instead. This option allows you to share a preview that updates with the latest commit to the branch.

  To learn more, including other ways to share, see [Sharing Deployments](/docs/deployments/sharing-deployments).

- ### Collaborator needs to sign-in
  The person you are sharing the preview with needs to have a Vercel account. To do so, they'll need to select **Log in to comment** and then enter their email address.

- ### Collaborator can comment
  Once the person you are sharing the preview with goes through the security options, they'll be ready to comment. You'll be notified of new comments through email, or when you visit the deployment.

For more information on using Comments, see [Using comments](/docs/comments/using-comments).


---

[View full sitemap](/docs/sitemap)
