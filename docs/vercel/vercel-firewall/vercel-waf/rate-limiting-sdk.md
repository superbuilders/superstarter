---
title: Rate Limiting SDK
product: vercel
url: /docs/vercel-firewall/vercel-waf/rate-limiting-sdk
type: how-to
prerequisites:
  - /docs/vercel-firewall/vercel-waf
  - /docs/vercel-firewall
related:
  - /docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
  - /docs/environment-variables/system-environment-variables
summary: Learn how to configure a custom rule with rate limit in your code.
---

# Rate Limiting SDK

You can configure a custom rule with rate limit in your code by using the [`@vercel/firewall`](https://github.com/vercel/vercel/tree/main/packages/firewall/docs) package. This can be useful in the following cases:

- You need to set a rate limit on requests in your backend
- You want to use additional conditions with the rate limit that are not possible in the custom rule configuration of the dashboard

## Using `@vercel/firewall`

- ### Create a `@vercel/firewall` rule
  1. From your [dashboard](https://vercel.com/dashboard/), select the project that you'd like to configure rate limiting for. Then select the **Firewall** tab
  2. Select **Configure** on the top right of the Firewall overview page. Then, select **+ New Rule**
  3. Complete the fields for the rule as follows
     1. Type a name such as "Firewall api rule"
     2. In the **Configure** section, for the first **If** condition, select `@vercel/firewall`
     3. Use `update-object` as the **Rate limit ID**
     4. Use the default values for **Rate Limit** and **Then**
  4. Select **Save Rule**
  5. Apply the changes:
     - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
     - Select **Review Changes** and review the changes to be applied
     - Select **Publish** to apply the changes to your production deployment

- ### Configure rate limiting in code
  You can now use the Rate limit ID `update-object` set up above with `@vercel/firewall` to rate limit any request based on your own conditions. In the example below, you rate limit a request based on its IP.
  ```ts filename="rate-limit.ts"
  import { checkRateLimit } from '@vercel/firewall';

  export async function POST(request: Request) {
    const { rateLimited } = await checkRateLimit('update-object', { request });
    if (rateLimited) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Otherwise, continue with other tasks
  }
  ```

- ### Test in a preview deployment
  For your code to run when deployed in a preview deployment, you need to:
  - Enable [Protection Bypass for Automation](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) in your project
  - Ensure [System Environment Variables are automatically exposed](/docs/environment-variables/system-environment-variables#system-environment-variables)

## Target a user's organization

For example, you can include an additional filter for a request header and check whether this header matches a key from the user's authentication, to apply the rate limit. This filter is not possible in the custom rule dashboard.

### Update the custom rule filters

Edit the custom rule in the dashboard and add an **If** condition with the following values, and click **Save Rule**:

- Filter dropdown: **#Request Header**
- Value: `xrr-internal-header`
- Operator: Equals
- Match value: `internal`

### Use the `rateLimitKey` in code

Use the following code to apply the rate limit only to users of the organization.

```ts filename="rate-limit.ts"
import { checkRateLimit } from '@vercel/firewall';
import { authenticateUser } from './auth';

export async function POST(request: Request) {
  const auth = await authenticateUser(request);
  const { rateLimited } = await checkRateLimit('update-object', {
    request,
    rateLimitKey: auth.orgId,
  });
  if (rateLimited) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
```


---

[View full sitemap](/docs/sitemap)
