---
title: SAML Single Sign-On
product: vercel
url: /docs/saml
type: conceptual
prerequisites:
  []
related:
  - /docs/rbac/managing-team-members
  - /docs/deployments/preview-deployments
  - /docs/directory-sync
  - /docs/rbac/access-roles/team-level-roles
summary: Learn how to configure SAML SSO for your organization on Vercel.
---

# SAML Single Sign-On

> **🔒 Permissions Required**: SAML

To manage the [members](/docs/rbac/managing-team-members) of your team through a third-party identity provider like [Okta](https://www.okta.com/) or [Auth0](https://auth0.com/), you can set up the Security Assertion Markup Language (SAML) [feature](#configuring-saml-sso) from your team's settings.

Once enabled, all team members will be able to log in or access [Preview](/docs/deployments/preview-deployments) and Production Deployments using your [selected identity provider](/docs/saml#saml-providers). Any new users signing up with SAML will automatically be added to your team.

For Enterprise customers, you can also automatically manage team member roles and provisioning by setting up [Directory Sync](/docs/directory-sync).

![Image](`/docs-assets/static/docs/concepts/teams/saml-options.png`)

## Configuring SAML SSO

1. To configure SAML SSO for your team, you must be an [owner](/docs/rbac/access-roles/team-level-roles) of the team
2. From your [dashboard](/dashboard), ensure your team is selected in the scope selector
3. Navigate to the **Settings** tab and select **Security & Privacy**
4. Navigate to the **SAML Single Sign-On** section. Click **Configure** and follow the walkthrough to configure SAML SSO for your team with your identity provider of choice
5. As a further step, you may want to [enforce SAML SSO](#enforcing-saml) for your team

> **💡 Note:** Pro teams will first need to purchase the SAML SSO add-on from their [Billing settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbilling%23paid-add-ons) before it can be configured.

## Enforcing SAML

For additional security, SAML SSO can be enforced for a team so that all [team members](/docs/rbac/managing-team-members) **cannot access any team information** unless their current session was authenticated with SAML SSO.

1. To enforce SAML SSO for your team, you must be an [owner](/docs/rbac/access-roles/team-level-roles) and currently be authenticated with SAML SSO. This ensures that your configuration is working properly before tightening access to your team information
2. From your [dashboard](/dashboard), navigate to the **Settings** tab and select **Security & Privacy**. Then go to the **SAML Single Sign-On** section
3. Toggle the **Require Team Members to login with SAML** switch to **Enabled**

![Image](`/docs-assets/static/docs/concepts/teams/saml-enforced.png`)

> **💡 Note:** When modifying your SAML configuration, the option for enforcing will
> automatically be turned off. Please verify your new configuration is working
> correctly by re-authenticating with SAML SSO before re-enabling the option.

## Authenticating with SAML SSO

Once you have configured SAML, your [team members](/docs/rbac/managing-team-members) can use SAML SSO to log in or sign up to Vercel. To login:

1. Select the **Continue with SAML SSO** button on the authentication page, then enter your team's URL.
   Your team slug is the identifier in the URLs for your team. For example, the identifier for vercel.com/acme is `acme`.
2. Select **Continue with SAML SSO** again to be redirected to the third-party authentication provider to finish authenticating. Once completed, you will be logged into Vercel.

SAML SSO sessions last for 24 hours before users must re-authenticate with the third-party SAML provider.

### Customizing the login page

You can choose to share a Vercel login page that only shows the option to log in with SAML SSO. This prevents your team members from logging in with an account that's not managed by your identity provider.

To use this page, you can set the `saml` query param to your team URL. For example:

```text
https://vercel.com/login?saml=team_id
```

![Image](`/docs-assets/static/docs/concepts/teams/saml-login-custom-light.png`)

## Managing team members

When using SAML SSO, team members can authenticate through your identity provider, but team membership must be managed manually through the Vercel dashboard.

For automatic provisioning and de-provisioning of team members based on your identity provider, consider upgrading to [Directory Sync](/docs/directory-sync), which is available on Enterprise plans.

## SAML providers

Vercel supports the following third-party SAML providers:

- [Okta](https://www.okta.com/)
- [Auth0](https://auth0.com/)
- [Google](https://accounts.google.com/)
- [Microsoft Entra (formerly Azure Active Directory)](https://www.microsoft.com/en-in/security/business/identity-access/microsoft-entra-single-sign-on)
- [Microsoft ADFS](https://docs.microsoft.com/en-us/windows-server/identity/active-directory-federation-services)
- [OneLogin](https://onelogin.com/)
- [Duo](https://duo.com/product/single-sign-on-sso/)
- [JumpCloud](https://jumpcloud.com/)
- [PingFederate](https://www.pingidentity.com/en/platform/capabilities/single-sign-on.html)
- [ADP](https://apps.adp.com/en-US/home)
- [Keycloak](https://www.keycloak.org/)
- [Cyberark](https://www.cyberark.com/products/single-sign-on/)
- [OpenID](https://openid.net/)
- [VMware](https://kb.vmware.com/s/article/2034918)
- [LastPass](https://www.lastpass.com/)
- [miniOrange](https://www.miniorange.com/products/single-sign-on-sso)
- [NetIQ](https://www.microfocus.com/en-us/cyberres/identity-access-management/secure-login)
- [Oracle Cloud](https://docs.oracle.com/en/cloud/paas/content-cloud/administer/enable-single-sign-sso.html)
- [Salesforce](https://help.salesforce.com/s/articleView?id=sf.sso_about.htm\&type=5)
- [CAS](https://www.apereo.org/projects/cas)
- [ClassLink](https://www.classlink.com/)
- [Cloudflare](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/dash-sso-apps/)
- [SimpleSAMLphp](https://simplesamlphp.org/)


---

[View full sitemap](/docs/sitemap)
