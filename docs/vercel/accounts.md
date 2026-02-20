---
title: Account Management
product: vercel
url: /docs/accounts
type: conceptual
prerequisites:
  []
related:
  - /docs/plans/hobby
  - /docs/plans/pro-plan
  - /docs/plans/enterprise
  - /docs/git/vercel-for-github
  - /docs/git/vercel-for-gitlab
summary: Learn how to manage your Vercel account and team members.
---

# Account Management

When you first sign up for Vercel, you'll create an account. This account is used to manage your Vercel resources. Vercel has three types of plans:

- [Hobby](/docs/plans/hobby)
- [Pro](/docs/plans/pro-plan)
- [Enterprise](/docs/plans/enterprise)

Each plan offers different features and resources, allowing you to choose the right plan for your needs.

When signing up for Vercel, you can choose to sign up with an email address or a Git provider.

## Sign up with email

To sign up with email:

1. Enter your email address to receive the six-digit one-time password (OTP)
2. Enter the OTP to proceed with logging in successfully.

When signing up with your email, no Git provider will be connected by default. See [login methods and connections](#login-methods-and-connections) for information on how to connect a Git provider. If no Git provider is connected, you will be asked to verify your account on every login attempt.

## Sign up with a Git provider

You can sign up with any of the following supported Git providers:

- [**GitHub**](/docs/git/vercel-for-github)
- [**GitLab**](/docs/git/vercel-for-gitlab)
- [**Bitbucket**](/docs/git/vercel-for-bitbucket)

Authorize Vercel to access your Git provider account. **This will be the default login connection on your account**.

Once signed up you can manage your login connections in the [authentication section](/account/authentication) of your dashboard.

## Login methods and connections

You can manage your login connections in the **Authentication** section of [your account settings](/account/authentication). To find this section:

1. Select your profile picture near the top-right of the dashboard
2. Select **Settings** in the dropdown that appears
3. Select **Authentication** in the list near the left side of the page

![Image](https://vercel.com/docs-assets/static/docs/accounts/authentication-page-light.png)

### Login with passkeys

Passkeys allow you to log into your Vercel account using biometrics such as face or fingerprint recognition, PINs, hardware security keys, and more.

To add a new passkey:

1. From the dashboard, click your account avatar and select **Settings**. In your [account settings](/account/authentication), go to the **Authentication** item
2. Under **Add New**, select the **Passkey** button and then click **Continue**
3. Select the authenticator of preference. This list depends on your browser and your eligible devices. By default, Vercel will default to a password manager if you have one installed on your browser and will automatically prompt you to save the passkey
4. Follow the instructions on the device or with the account you've chosen as an authenticator

When you're done, the passkey will appear in a list of login methods on the **Authentication** page, alongside your other connections.

### Logging in with SAML Single Sign-On

SAML Single Sign-On enables you to log into your Vercel team with your organization's identity provider which manages your credentials.

SAML Single Sign-On is available to Enterprise teams, or Pro teams can purchase it as a paid add-on from their [Billing settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbilling%23paid-add-ons). The feature can be configured by team Owners from the team's Security & Privacy settings.

### Choosing a connection when creating a project

When you create an account on Vercel, you will be prompted to create a project by either importing a Git repository or using a template.

Either way, you must connect a Git provider to your account, which you'll be able to use as a login method in the future.

### Using an existing login connection

Your Hobby team on Vercel can have only one login connection per third-party service. For example, you can only log into your Hobby team with a single GitHub account.

For multiple logins from the same service, create a new Vercel Hobby team.

## Teams

Teams on Vercel let you collaborate with other members on projects and access additional resources.

### Creating a team

#### \['Dashboard'

1. Click on the scope selector at the top left of the nav bar
2. Choose to create a new team
3. Name your team
4. Depending on the types of team plans that you have already created, you'll be able to select a team plan option:

![Image](https://vercel.com/docs-assets/static/docs/concepts/teams/new-team-light.png)

#### 'cURL'

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```bash filename="cURL"
curl --request POST \
  --url https://api.vercel.com/v1/teams \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
  "slug": "<team-slug>",
  "name": "<team-name>"
}'
```

#### 'SDK']

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```ts filename="createTeam"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.teams.createTeam({
    slug: 'team-slug',
    name: 'team-name',
  });

  // Handle the result
  console.log(result);
}

run();
```

Collaborating with other members on projects is available on the [Pro](/docs/plans/pro-plan) and [Enterprise](/docs/plans/enterprise) plans.

Upgrade from the [Hobby](/docs/plans/hobby) plan to [Pro](/docs/plans/hobby#upgrading-to-pro) to add team members.

After [creating a new trial](/docs/plans/pro-plan/trials), you'll have 14 days of Pro premium features and collaboration for free.

### Team membership

You can join a Vercel team through an invitation from a [team owner](/docs/rbac/access-roles#owner-role), automatic addition by a team's [identity provider](/docs/saml), or by requesting access yourself. To request access, you can push a commit to a private Git repository owned by the team.

### Leaving a team

> **💡 Note:** You can't leave a team if you are the last remaining
> [owner](/docs/rbac/access-roles#owner-role) or the last confirmed
> [member](/docs/rbac/access-roles#member-role).

To leave a team:

1. If there isn't another owner for your team, you must assign a different confirmed member as the team owner
2. Go to your team's dashboard and select the **Settings** tab
3. Scroll to the **Leave Team** section and select the **Leave Team** button
4. Click **Confirm**
5. If you are the only remaining member, you should delete the team instead

### Deleting a team

To delete a team:

1. Remove all team domains
2. Go to your team's dashboard and select the **Settings** tab
3. Scroll to the **Delete Team** section and select the **Delete Team** button
4. Click **Confirm**

If you'd prefer to cease payment instead of deleting your team, you can [downgrade to Hobby](/docs/plans/pro-plan#downgrading-to-hobby).

### Default team

Your default team will be used when you make a request through the [API](/docs/rest-api) or [CLI](/docs/cli) and don’t specify a specific team. It will also be the team shown whenever you first log in to Vercel or navigate to `/dashboard`. The first Hobby or Pro team you create will automatically be nominated as the default team.

#### How to change your default team

If you delete, leave, or are removed from your default team, Vercel will automatically choose a new default team for you. However, you may want to choose a default team yourself. To do that:

1. Navigate to [vercel.com/account/settings](https://vercel.com/account/settings)
2. Under **Default Team**, select your new default team from the dropdown
3. Press **Save**

### Find your team ID

Your Team ID is a unique and unchangeable identifier that's automatically assigned when your team is created.

There are a couple of methods you can use to locate your Team ID:

- **Vercel API**: Use the [Vercel API](/docs/rest-api/reference/endpoints/teams/list-all-teams) to retrieve your Team ID
- **Dashboard**: Find your Team ID directly from your team's Dashboard on Vercel:
  - Navigate to the following URL, replacing `your_team_name_here` with your actual team's name: `https://vercel.com/teams/your_team_name_here/settings#team-id`.
    If you're unable to locate your Team ID using the URL method, follow these steps:
  - Open your team's dashboard and head over to the **Settings** tab
  - Choose **General** from the left-hand navigation
  - Scroll down to the Team ID section and your Team ID will be there ready for you to copy

## Managing emails

To access your email settings from the dashboard:

1. Select your avatar in the top right corner of the [dashboard](/dashboard).
2. Select **Account Settings** from the list.
3. Select the **Settings** tab and scroll down to the **Emails** section.
4. You can then [add](/docs/accounts#adding-a-new-email-address), [remove](/docs/accounts#removing-an-email-address), or [change](/docs/accounts#changing-your-primary-email-address) the primary email address associated with your account.

## Adding a new email address

To add a new email address

1. Follow the steps above and select the **Add Another** button in the **Emails** section of your account settings.
2. Once you have added the new email address, Vercel will send an email with a verification link to the newly added email. Follow the link in the email to verify your new email address.
3. Once verified, all email addresses can be used to log in to your account, including your primary email address.

You can add up to three emails per account, with a single email domain shared by two emails at most.

![Image](https://vercel.com/docs-assets/static/docs/accounts/account-emails-2-light.png)

## Changing your primary email address

Your primary email address is the email address that will be used to send you notifications, such as when you receive a new [preview comment](/docs/comments) or when you are [invited to a team](/docs/rbac/managing-team-members#invite-link).

Once you have added and verified a new email address, you can change your primary email address by selecting **Set as Primary** in the dot menu.

![Image](https://vercel.com/docs-assets/static/docs/accounts/account-emails-set-primary-2-light.png)

## Removing an email address

To remove an email address select the **Delete** button in the dot menu.

If you wish to remove your primary email address, you will need to set a new primary email address first.


---

[View full sitemap](/docs/sitemap)
