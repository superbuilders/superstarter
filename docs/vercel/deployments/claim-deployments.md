---
title: Claim Deployments
product: vercel
url: /docs/deployments/claim-deployments
type: conceptual
prerequisites:
  - /docs/deployments
related:
  - /docs/projects/transferring-projects
  - /docs/integrations/create-integration/marketplace-flows
  - /docs/rest-api/reference/endpoints/projects/create-project-transfer-request
  - /docs/rest-api/reference/endpoints/projects/accept-project-transfer-request
  - /docs/rest-api/reference/endpoints/deployments/upload-deployment-files
summary: Learn how to take ownership of deployments on Vercel with the Claim Deployments feature.
---

# Claim Deployments

The Claim Deployments feature enables users to take control of deployments by transferring them to their Vercel accounts. Users can generate and share a claim URL, which allows others to assume ownership of these deployments. This feature is particularly helpful for AI-generated deployments and facilitates the transfer of projects between different accounts with different owners.

However, when transferring a project between two teams owned by the same user, it is recommended to use the [Project Transfer flow](/docs/projects/transferring-projects#starting-a-transfer) instead of the Claim Deployments flow.

## Get started

- [Claim deployments template](https://github.com/vercel/claim-deployments-demo)
- [Demo](https://claim-deployments-demo.vercel.app)
- [Demo with resource claims](https://claim-deployments-demo-with-resource.vercel.app/)

## Associated resources

When a user claims a deployment, Vercel also transfers any associated resources (limited to specific providers) to the new owner's account. These resources maintain their connections to the project, ensuring a seamless transition of both the deployment and its dependencies.

The resource provider that currently supports resource transfer is [Prisma](https://vercel.com/marketplace/prisma).

For more details on the transfer process, see [Resources with Claim Deployments flows](/docs/integrations/create-integration/marketplace-flows#resources-with-claim-deployments).

## Important endpoints

- **Claim Deployments URL:** `https://vercel.com/claim-deployment?[...]`

- **Initiate a project transfer request:** [POST /projects/:idOrName/transfer-request](/docs/rest-api/reference/endpoints/projects/create-project-transfer-request)

- **Complete a project transfer:** [PUT /projects/transfer-request/:code](/docs/rest-api/reference/endpoints/projects/accept-project-transfer-request)
  - *This endpoint is not needed if you are using the Claim Deployments URL*

## Example use case: automated AI-generated deployment

1. **File upload:** The AI agent uploads the deployment files using the Vercel API: [POST /files](/docs/rest-api/reference/endpoints/deployments/upload-deployment-files).

2. **Deployment creation:**
   - Create a new deployment using the [Vercel CLI](/docs/cli/deploying-from-cli)
   - Or create a deployment with the Vercel API: [POST /files](/docs/rest-api/reference/endpoints/deployments/upload-deployment-files) followed by [POST /deployments](/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment).

3. **Project transfer request:**
   - The agent initiates a transfer request with: [POST /projects/:idOrName/transfer-request](/docs/rest-api/reference/endpoints/projects/create-project-transfer-request).
   - This returns a `code` (valid for 24 hours) that allows the agent to transfer the project to another team, typically the end user who initiated the request.

4. **Generate claim URL:**
   - The agent generates a claim URL and shares it with the user:
     `https://vercel.com/claim-deployment?code=xxx&returnUrl=https://xxx`

5. **User claims the deployment:**
   - The user accesses the claim page using the URL and selects a team within their Vercel account to transfer the deployment.

6. **Project transfer completion:**
   - After the user clicks **Transfer**, the Vercel API ([PUT /projects/transfer-request/:code](/docs/rest-api/reference/endpoints/projects/accept-project-transfer-request)) completes the project transfer, assigning it to the user’s selected team. This step is not necessary if you are using the Claim Deployments Flow.

Get started with [this template](https://github.com/vercel/claim-deployments-demo) of claiming deployments ([demo](https://claim-deployments-demo.vercel.app)).

## Team restructuring

When reorganizing teams, you can easily transfer ownership of projects to another team using the Claim Deployments feature.

## Migrating personal projects to a company account

Freelancers or employees can move deployments from their personal accounts to a company’s Vercel account by generating and sharing a claim URL.


---

[View full sitemap](/docs/sitemap)
