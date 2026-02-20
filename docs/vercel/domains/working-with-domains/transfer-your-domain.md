---
title: Transferring Domains to Another Team or Project
product: vercel
url: /docs/domains/working-with-domains/transfer-your-domain
type: how-to
prerequisites:
  - /docs/domains/working-with-domains
  - /docs/domains
related:
  - /docs/cli/alias
  - /docs/rbac/access-roles
  - /docs/domains/pre-generating-ssl-certs
  - /docs/domains/managing-dns-records
summary: Domains can be transferred to another team or project within Vercel, or to and from a third-party registrar. Learn how to transfer domains with this...
---

# Transferring Domains to Another Team or Project

## Transfer a domain to another Vercel user or Team

- ### Select the Domains tab
  You can move domains to another team using the [**Domains** tab of your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page).

- ### Select the domain
  Once on the **Domains** tab, select the context menu next to the domain you wish to move, and click **Move**. You can also use checkbox next to each domain to select more than one domain

  ![Image](https://vercel.com/front/docs/domains/move-light.png)

- ### Select the team
  After selecting the domain(s) and clicking **Move**, you will be asked to confirm which profile or team you wish to move them to.

  ![Image](https://vercel.com/front/docs/domains/move-modal.png)

  When selecting the input field, you will be provided with a list of teams you belong to. If the profile or team you wish to move the domain(s) to is not present, enter the `slug` value instead. You can find the `slug` value in **Settings** page for both profiles and teams.
  > **💡 Note:** When moving domains to another team or user, all existing project domains
  > associated with them will remain and not be moved to prevent service
  > disruption. However, any [custom aliases](/docs/cli/alias) that are not part
  > of project domains will be removed immediately.

- ### Confirm the change
  To confirm the change, select **Move**. The domains will be transferred to the new profile of team immediately.

## Transferring domains between projects

You can use the Dashboard to remove a domain from a project and then re-add it to another. However, this could potentially end up with some site down-time. For more information on transferring domains with zero downtime, see [How to move a domain between Vercel projects with "Zero Downtime"?](/kb/guide/how-to-move-a-domain-between-vercel-projects-with-zero-downtime)

## Transferring domains out of Vercel

- ### Verifying Transfer Eligibility
  Due to [ICANN rules](https://www.icann.org/resources/pages/text-2012-02-25-en#:~:text=Please%20note%20that%20you%20may,60%20days%20after%20a%20transfer), a domain must be registered with a registrar for 60 days before it can be transferred to another.

  You can verify that your domain has been registered with Vercel for at least 60 days by visiting the team's [Domains Dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page). If the registrar is Vercel and the age greater than 60 days, it is eligible to transfer.

- ### Select the  tab
  For domains that are registered with Vercel, you can retrieve an authorization code for transferring out to another registrar from the  tab of the Dashboard.

- ### Select the "Transfer out" option
  Once on the  tab, click on the triple-dot menu button for the relevant domain. A menu-item button to transfer the domain out will be presented if the domain is registered with Vercel.

  ![Image](https://vercel.com/front/docs/domains/transfer-light.png)
  > **💡 Note:** If under a Team scope, only [Team Owners](/docs/rbac/access-roles#owner-role)
  > will see the menu-item button.

- ### Use the authorization code with the new registrar
  After clicking the menu-item button, a modal will open up with the authorization code required to transfer the domain. Use this authorization code with your new registrar to confirm that you want to transfer the domain. There is no additional confirmation that you need to do on the Vercel side. Transferring a domain can take up to a week.

  If you encounter problems with the transfer code, ensure you've entered it correctly without typos or extra spaces. If the code seems correct but still doesn't work, please contact [Vercel support](/help) for further assistance.

  ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/transfer-out-modal.png`)

## Transfer a domain to Vercel

By transferring your domain into Vercel, you allow Vercel to manage the DNS records for the domain and can use it with any Projects listed under the account the domain is owned by.

- ### Verifying Transfer Eligibility
  Due to [ICANN rules](https://www.icann.org/resources/pages/text-2012-02-25-en#:~:text=Please%20note%20that%20you%20may,60%20days%20after%20a%20transfer), a domain must be registered with a registrar for 60 days before it can be transferred to another. You will need to confirm this with your registrar before attempting the transfer to Vercel.

  If the domain has not been registered with the current registrar for at least 60 days, the domain transfer will fail.

  NOTE: To find further information on ICANN rules, visit the [ICANN website](https://www.icann.org/resources/pages/text-2012-02-25-en#:~:text=Please%20note%20that%20you%20may,60%20days%20after%20a%20transfer).

- ### Unlock the Domain
  Once you have verified your domain's eligibility to transfer, proceed with unlocking your domain in your registrar's domain settings. Most domains are usually locked by default to prevent unauthorized changes.

  The domain lock feature appears in different forms across registrars. Sign into the host where your domain is registered and look for a Domain Lock or similar option to unlock your domain. If this option is not available, contact your registrar to change this.

- ### Obtain Authorization Code
  After unlocking the domain, you will need to obtain an authorization code. The code will be sent to the email address associated with your domain by your registrar. In some cases, your authorization code pops up on your dashboard. This may be available in the domain registrars dashboard. If it is not available, contact your registrar to obtain this.

- ### Transferring to Vercel
  When transferring a domain, you will have two options to choose from. Either using the Vercel Dashboard or Vercel CLI.

  **Option 1: Using Vercel Dashboard**

  After obtaining the authorization code, click on the Transfer in button in the Vercel Domains Dashboard and enter in your domain and respective authorization code.

  **Option 2: Using Vercel CLI**

  With Vercel CLI, you can run the following command from your terminal.
  ```bash
  vercel domains transfer-in [your-domain]
  ```
  You will be requested to provide an authorization code from your registrar after running this command. Once you get the authorization code from your registrar, paste it into the prompt and the transfer will begin.
  > **💡 Note:** In a case where your domain cannot be transferred, check that it has been over
  > 60 days since the domain has been registered or previously transferred. If it
  > still does not work, contact your registrar.

- ### Configure domain
  Follow these steps to ensure that there is no downtime while the domain is transferred to Vercel.

  **Pre-generate SSL certificates**

  If you are migrating a deployment to Vercel, require zero downtime, and aren't using Vercel's nameservers, you can pre-generate and issue SSL certificates to your domain.
  If you have enabled Vercel DNS by pointing your domain's nameserver to Vercel and have generated an SSL certificate, you can ignore this step.

  Follow the [detailed guide](/docs/domains/pre-generating-ssl-certs) to set up SSL certificates before finalizing the domain transfer.

  **Set DNS records in your registrar**

  Once you have pre-generated the SSL certificates, you need to add the new TXT records to your DNS records in your domain registrar dashboard. Learn how to do that [here](/docs/domains/managing-dns-records#migrating-dns-records-from-an-external-registrar).

- ### Deploy the domain
  You can deploy your app with Vercel once the domain has been successfully added to your account.

  By setting a production domain from your projects' Domains dashboard, you will be able to use the following command with Vercel CLI:
  ```bash
  vercel --prod
  ```
  This command will deploy your project and make it accessible at the production domain that you have setup.


---

[View full sitemap](/docs/sitemap)
