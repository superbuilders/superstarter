---
title: Two-factor Authentication
product: vercel
url: /docs/two-factor-authentication
type: conceptual
prerequisites:
  []
related:
  - /docs/accounts/create-an-account
  - /docs/two-factor-enforcement
summary: Learn how to configure two-factor authentication for your Vercel account.
---

# Two-factor Authentication

To add an additional layer of security to your Vercel account, you can enable two-factor authentication (2FA).
This feature requires you to provide a second form of verification when logging in to your account. There are two
methods available for 2FA on Vercel:

- **Authenticator App**: Use an authenticator app like Google Authenticator to generate a time-based one-time password (TOTP).
- **Passkey**: Authenticate using any WebAuthN compatible device, such as a security key or biometric key.

## Enabling Two-factor Authentication

1. Navigate to your [account settings](https://vercel.com/account/settings/authenticate#two-factor-authentication) on Vercel
2. Toggle the switch to enable 2FA
3. Set up your 2FA methods
4. Confirm your setup
5. Save your recovery codes

![Image](https://vercel.com/front/docs/two-factor/two-factor-settings.png)

### Configuring an Authenticator App (TOTP)

Scan the QR code with your authenticator app or manually enter the provided key.
Once added, enter the generated 6-digit code to verify your setup.

![Image](https://vercel.com/front/docs/two-factor/totp.png)

### Configuring a Passkey

See the [Login with passkeys](/docs/accounts/create-an-account#login-with-passkeys) for more information on setting up a security key or biometric key.

### Recovery Codes

After setting up two-factor authentication (2FA), you will be prompted to save your recovery codes.
Store these codes in a safe place, as they can be used to access your account if you lose access to your 2FA methods.

Each recovery code can only be used once, and you can generate a new set of codes at any time.

![Image](https://vercel.com/front/docs/two-factor/recovery-codes.png)

## Enforcing Two-Factor Authentication

Teams can enforce two-factor authentication (2FA) for all members. Once enabled, team members must configure 2FA before accessing team resources.
Visit the [Two-Factor Enforcement](/docs/two-factor-enforcement) documentation for more information on how to enforce 2FA for your team.


---

[View full sitemap](/docs/sitemap)
