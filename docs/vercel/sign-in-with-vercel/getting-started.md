---
title: Getting started with Sign in with Vercel
product: vercel
url: /docs/sign-in-with-vercel/getting-started
type: how-to
prerequisites:
  - /docs/sign-in-with-vercel
related:
  - /docs/sign-in-with-vercel/manage-from-dashboard
  - /docs/environment-variables
  - /docs/cli
  - /docs/cli/env
  - /docs/sign-in-with-vercel/consent-page
summary: Learn how to get started with Sign in with Vercel
---

# Getting started with Sign in with Vercel

This guide uses Next.js App Router. You'll create a Sign in with Vercel button that redirects to the authorization endpoint, add a callback route to exchange the authorization code for tokens, and set authentication cookies.

> **💡 Note:** View a live version of this tutorial to see the sign in flow in action.

### Prerequisites

- A Vercel account
- A project deployed to Vercel
- An App [created from the dashboard](/docs/sign-in-with-vercel/manage-from-dashboard#create-an-app)
- A client secret [generated from the dashboard](/docs/sign-in-with-vercel/manage-from-dashboard#generate-a-client-secret)
- An authorization callback URL [configured from the dashboard](/docs/sign-in-with-vercel/manage-from-dashboard#configure-the-authorization-callback-url)
  - This should be configured to be
    - `http://localhost:3000/api/auth/callback` for running the application locally
    - `https://<your-apps-domain>/api/auth/callback` for running the application in production
- The necessary permissions [configured from the dashboard](/docs/sign-in-with-vercel/manage-from-dashboard#configure-the-necessary-permissions)

- ### Add environment variables
  Add the following variables to your `.env.local` at your project's root:
  ```env filename=".env.local"
  NEXT_PUBLIC_VERCEL_APP_CLIENT_ID="your-client-id-from-the-dashboard"
  VERCEL_APP_CLIENT_SECRET="your-client-secret-from-the-dashboard"
  ```
  > **💡 Note:** When you are ready to go to production, add your [environment
  > variables](/docs/environment-variables) to your project from the dashboard. If
  > you have [Vercel CLI](/docs/cli) installed, you can run [`vercel env
  >   pull`](/docs/cli/env) to pull the values from your project settings into your
  > local file.

- ### Create your folder structure for the API routes
  Create a folder structure for the API routes in your project. Each API route will be in a folder with the name of the route.
  - `app/api/auth/authorize`: This route will be used to redirect the user to the authorization endpoint.
  - `app/api/auth/callback`: This route will be used to exchange the `code` for tokens.
  - `app/api/auth/signout`: This route will be used to sign the user out.
  - `app/api/validate-token`: This route is **optional** and will be used to validate the access token.

- ### Create an `authorize` API route
  Use the `authorize` route to redirect the user to the authorization endpoint.
  - Generate a secure random string for the `state`, `nonce`, and `code_verifier`.
  - Create a cookie for the `state`, `nonce`, and `code_verifier`.
  - Redirect the user to the authorization endpoint with the required parameters.
  ```ts filename="app/api/auth/authorize/route.ts"
  import crypto from 'node:crypto';
  import { type NextRequest, NextResponse } from 'next/server';
  import { cookies } from 'next/headers';

  function generateSecureRandomString(length: number) {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomBytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomBytes, (byte) => charset[byte % charset.length]).join(
      '',
    );
  }

  export async function GET(req: NextRequest) {
    const state = generateSecureRandomString(43);
    const nonce = generateSecureRandomString(43);
    const code_verifier = crypto.randomBytes(43).toString('hex');
    const code_challenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64url');
    const cookieStore = await cookies();

    cookieStore.set('oauth_state', state, {
      maxAge: 10 * 60, // 10 minutes
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
    cookieStore.set('oauth_nonce', nonce, {
      maxAge: 10 * 60, // 10 minutes
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
    cookieStore.set('oauth_code_verifier', code_verifier, {
      maxAge: 10 * 60, // 10 minutes
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });

    const queryParams = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID as string,
      redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
      state,
      nonce,
      code_challenge,
      code_challenge_method: 'S256',
      response_type: 'code',
      scope: 'openid email profile offline_access',
    });

    const authorizationUrl = `https://vercel.com/oauth/authorize?${queryParams.toString()}`;
    return NextResponse.redirect(authorizationUrl);
  }
  ```

- ### Create a `callback` API route
  Use the `callback` route to exchange the authorization code for tokens.
  - Validate the `state` and `nonce`.
  - Exchange the `code` for tokens using the stored `code_verifier`.
  - Set the authentication cookies.
  - Clear the temporary cookies (`state`, `nonce`, and `code_verifier`).
  - Redirect the user to the profile page.
  ```ts filename="app/api/auth/callback/route.ts"
  import type { NextRequest } from 'next/server';
  import { cookies } from 'next/headers';

  interface TokenData {
    access_token: string;
    token_type: string;
    id_token: string;
    expires_in: number;
    scope: string;
    refresh_token: string;
  }

  export async function GET(request: NextRequest) {
    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        throw new Error('Authorization code is required');
      }

      const storedState = request.cookies.get('oauth_state')?.value;
      const storedNonce = request.cookies.get('oauth_nonce')?.value;
      const codeVerifier = request.cookies.get('oauth_code_verifier')?.value;

      if (!validate(state, storedState)) {
        throw new Error('State mismatch');
      }

      const tokenData = await exchangeCodeForToken(
        code,
        codeVerifier,
        request.nextUrl.origin,
      );
      const decodedNonce = decodeNonce(tokenData.id_token);

      if (!validate(decodedNonce, storedNonce)) {
        throw new Error('Nonce mismatch');
      }

      await setAuthCookies(tokenData);

      const cookieStore = await cookies();

      // Clear the state, nonce, and oauth_code_verifier cookies
      cookieStore.set('oauth_state', '', { maxAge: 0 });
      cookieStore.set('oauth_nonce', '', { maxAge: 0 });
      cookieStore.set('oauth_code_verifier', '', { maxAge: 0 });

      return Response.redirect(new URL('/profile', request.url));
    } catch (error) {
      console.error('OAuth callback error:', error);
      return Response.redirect(new URL('/auth/error', request.url));
    }
  }

  function validate(
    value: string | null,
    storedValue: string | undefined,
  ): boolean {
    if (!value || !storedValue) {
      return false;
    }
    return value === storedValue;
  }

  function decodeNonce(idToken: string): string {
    const payload = idToken.split('.')[1];
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    const nonceMatch = decodedPayload.match(/"nonce":"([^"]+)"/);
    return nonceMatch ? nonceMatch[1] : '';
  }

  async function exchangeCodeForToken(
    code: string,
    code_verifier: string | undefined,
    requestOrigin: string,
  ): Promise<TokenData> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID as string,
      client_secret: process.env.VERCEL_APP_CLIENT_SECRET as string,
      code: code,
      code_verifier: code_verifier || '',
      redirect_uri: `${requestOrigin}/api/auth/callback`,
    });

    const response = await fetch('https://api.vercel.com/login/oauth/token', {
      method: 'POST',
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to exchange code for token: ${JSON.stringify(errorData)}`,
      );
    }

    return await response.json();
  }

  async function setAuthCookies(tokenData: TokenData) {
    const cookieStore = await cookies();

    cookieStore.set('access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in,
    });

    cookieStore.set('refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  ```

- ### Create a profile page
  Create a profile page to display the user's information.
  ```tsx filename="app/profile/page.tsx"
  import { cookies } from 'next/headers';
  import Link from 'next/link';
  import SignOutButton from '../components/sign-out-button';

  export default async function Profile() {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    const result = await fetch('https://api.vercel.com/login/oauth/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const user = result.status === 200 ? await result.json() : undefined;

    if (!user) {
      return (
        <main className="p-10">
          <h1 className="text-3xl font-semibold">Error</h1>
          <p className="mt-4">
            An error occurred while trying to fetch your profile.
          </p>
          Go{' '}
          <Link className="underline" href="/">
            back to the home page
          </Link>{' '}
          and sign in again.
        </main>
      );
    }

    return (
      <main className="p-10">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="mt-4">
          Welcome to your profile page <strong>{user.name}</strong>.
        </p>
        <div>
          <h2 className="text-xl font-semibold mt-8">User Details</h2>
          <ul className="mt-4">
            <li>
              <strong>Name:</strong> {user.name}
            </li>
            <li>
              <strong>Email:</strong> {user.email}
            </li>
            <li>
              <strong>Username:</strong> {user.preferred_username}
            </li>
            <li>
              <strong>Picture URL:</strong> {user.picture}
            </li>
          </ul>
        </div>
        <SignOutButton />
      </main>
    );
  }
  ```

- ### Create an error page
  Create an error page to display when an error occurs.
  ```tsx filename="app/auth/error/page.tsx"
  import Link from 'next/link';

  export default function ErrorPage() {
    return (
      <div>
        <h1>Error</h1>
        <p>An error occurred while trying to sign in.</p>
        <Link href="/">Back to the home page</Link>
      </div>
    );
  }
  ```

- ### Create a `signout` API route
  Use the `signout` route to revoke the token and sign the user out.
  - Revoke the access token.
  - Clear the `access_token` and `refresh_token` cookies.
  - Return a JSON response.
  ```ts filename="app/api/auth/signout/route.ts"
  import { cookies } from 'next/headers';

  export async function POST() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return Response.json({ error: 'No access token found' }, { status: 401 });
    }

    const credentials = `${process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID}:${process.env.VERCEL_APP_CLIENT_SECRET}`;

    const response = await fetch(
      'https://api.vercel.com/login/oauth/token/revoke',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
        },
        body: new URLSearchParams({
          token: accessToken,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error revoking token:', errorData);
      return Response.json(
        { error: 'Failed to revoke access token' },
        { status: response.status },
      );
    }

    cookieStore.set('access_token', '', { maxAge: 0 });

    return Response.json({}, { status: response.status });
  }
  ```

- ### Add Sign in and Sign out buttons
  Add two components to start the OAuth flow (and sign in) and to sign out:
  ```tsx filename="app/components/sign-in-with-vercel-button.tsx"
  export default function SignInWithVercelButton() {
    return <a href="/api/auth/authorize">Sign in with Vercel</a>;
  }
  ```
  ```tsx filename="app/components/sign-out-button.tsx"
  'use client';
  import { useTransition } from 'react';

  export default function SignOutButton() {
    const [isPending, startTransition] = useTransition();

    return (
      <button
        onClick={() =>
          startTransition(async () => {
            await fetch('/api/auth/signout', { method: 'POST' });
          })
        }
        disabled={isPending}
      >
        {isPending ? 'Signing out...' : 'Sign out'}
      </button>
    );
  }
  ```

- ### Run your application
  Run your application locally using the following command:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm run dev
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn run dev
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm run dev
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun run dev
      ```
    </Code>
  </CodeBlock>
  Open <http://localhost:3000> and Sign in with Vercel. You will be redirected to the [consent page](/docs/sign-in-with-vercel/consent-page) where you can review the permissions and click **Allow**. Once you have signed in, you will be redirected to the profile page.

- ### Create a token introspection API route (Optional)
  The `validate-token` API route can be used to validate the access token. This is optional, but it can be useful to validate the access token.
  ```ts filename="app/api/validate-token/route.ts"
  import { cookies } from 'next/headers';

  interface IntrospectionResponse {
    active: boolean;
    aud?: string;
    client_id?: string;
    token_type?: 'bearer';
    exp?: number;
    iat?: number;
    sub?: string;
    iss?: string;
    jti?: string;
    session_id?: string;
  }

  export async function GET(): Promise<Response> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('access_token')?.value;

      if (!token) {
        return Response.json({ error: 'No access token found' }, { status: 401 });
      }

      const introspectResponse = await fetch(
        'https://api.vercel.com/login/oauth/token/introspect',
        {
          method: 'POST',
          body: new URLSearchParams({ token }),
        },
      );

      if (!introspectResponse.ok) {
        return Response.json(
          { error: 'Failed to introspect token' },
          { status: 500 },
        );
      }

      const introspectionData: IntrospectionResponse =
        await introspectResponse.json();

      if (!introspectionData.active) {
        return Response.json({ error: 'Token is not active' }, { status: 401 });
      }

      return Response.json({
        message: 'Token is valid!',
        tokenInfo: introspectionData,
      });
    } catch (error) {
      console.error('Token validation error:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
  ```

- ### Create a token introspection component (Optional)
  The `TokenIntrospection` component can be used to validate the access token. This is optional, but it can be useful to validate the access token.
  ```tsx filename="app/components/token-introspection.tsx"
  'use client';

  import { useState } from 'react';

  interface ValidationResponse {
    message: string;
    tokenInfo: {
      active: boolean;
      clientId?: string;
      tokenType?: string;
      subject?: string;
      issuer?: string;
      tokenId?: string;
      sessionId?: string;
      expiresAt?: number;
      issuedAt?: number;
    };
  }

  export default function TokenIntrospection() {
    const [validationData, setValidationData] =
      useState<ValidationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleValidateToken = async () => {
      setLoading(true);
      setError(null);
      setValidationData(null);

      try {
        const response = await fetch('/api/validate-token');

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        setValidationData(data as ValidationResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const formatTimestamp = (timestamp?: number) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp * 1000).toLocaleString();
    };

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Token Introspection</h2>
        <p className="mt-2 text-sm">
          Validate your access token using Vercel&apos;s token introspection
          endpoint.
        </p>

        <button
          onClick={handleValidateToken}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded-lg border ${
            loading
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer hover:opacity-80'
          }`}
        >
          {loading ? 'Validating Token...' : 'Validate Token'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error: {error}</p>
          </div>
        )}

        {validationData && (
          <div className="mt-4 p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 text-green-800">
              ✓ {validationData.message}
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Token Active:</strong>{' '}
                <span className="text-green-600">
                  {validationData.tokenInfo.active ? 'Yes' : 'No'}
                </span>
              </div>

              {validationData.tokenInfo.active && (
                <>
                  <div>
                    <strong>Client ID:</strong>{' '}
                    {validationData.tokenInfo.clientId || 'N/A'}
                  </div>
                  <div>
                    <strong>Token Type:</strong>{' '}
                    {validationData.tokenInfo.tokenType || 'N/A'}
                  </div>
                  <div>
                    <strong>Subject (User ID):</strong>{' '}
                    {validationData.tokenInfo.subject || 'N/A'}
                  </div>
                  <div>
                    <strong>Issuer:</strong>{' '}
                    {validationData.tokenInfo.issuer || 'N/A'}
                  </div>
                  <div>
                    <strong>Token ID (JTI):</strong>{' '}
                    {validationData.tokenInfo.tokenId || 'N/A'}
                  </div>
                  <div>
                    <strong>Session ID:</strong>{' '}
                    {validationData.tokenInfo.sessionId || 'N/A'}
                  </div>
                  <div>
                    <strong>Issued At:</strong>{' '}
                    {formatTimestamp(validationData.tokenInfo.issuedAt)}
                  </div>
                  <div>
                    <strong>Expires At:</strong>{' '}
                    {formatTimestamp(validationData.tokenInfo.expiresAt)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  ```
  Add this component to your profile page.
  ```tsx filename="app/profile/page.tsx"
  import TokenIntrospection from '../components/token-introspection';

  export default function Profile() {
    //...rest of your profile page code
    return (
      //...rest of your profile page code
      <TokenIntrospection />
    );
  }
  ```


---

[View full sitemap](/docs/sitemap)
