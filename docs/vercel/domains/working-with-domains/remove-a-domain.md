---
title: Removing a Domain from a Project
product: vercel
url: /docs/domains/working-with-domains/remove-a-domain
type: how-to
prerequisites:
  - /docs/domains/working-with-domains
  - /docs/domains
related:
  - /docs/rest-api/reference/welcome
summary: Learn how to remove a domain from a Project and from your account completely with this guide.
---

# Removing a Domain from a Project

When you add a domain to any project, it will be connected to your account until you choose to delete it. This guide demonstrates how to remove a domain from a Project and from your account completely.

- ### Navigate to the Domains tab
  To remove a domain that is assigned to a project, navigate to the **Domains** tab from the **Project Overview** and click the **More Options** button for the domain you want to remove.

- ### Click remove button
  Once the **• • •** menu button has been clicked, you will be presented with further options. Click the **Delete** menu button to remove the domain from the project.

- ### Remove domain from your account
  Optionally, if you wish to remove a domain from all Projects, as well as your Account, navigate to the **Domains** section of your dashboard. In the list of all the domains under your account, find the domain you wish to remove. Then, from the context menu, click the **Delete** menu item.

  ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/remove-domains.png`)
  > **💡 Note:** If the domain was purchased through Vercel, you must first wait for the domain
  > to expire before you can remove it from your account.

## Using cURL

To remove a domain from a project using cURL, you can use the following command. To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```bash filename="cURL"
curl --request DELETE \
  --url https://api.vercel.com/v9/projects/<project-id-or-name>/domains/<domain-name> \
  --header "Authorization: Bearer $VERCEL_TOKEN"
```


---

[View full sitemap](/docs/sitemap)
