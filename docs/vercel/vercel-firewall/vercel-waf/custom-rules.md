---
title: WAF Custom Rules
product: vercel
url: /docs/vercel-firewall/vercel-waf/custom-rules
type: how-to
prerequisites:
  - /docs/vercel-firewall/vercel-waf
  - /docs/vercel-firewall
related:
  - /docs/security/vercel-waf/rate-limiting
  - /docs/rbac/access-roles
  - /docs/security/vercel-waf/rule-configuration
  - /docs/vercel-firewall/firewall-concepts
  - /docs/security/vercel-waf
summary: Learn how to add and manage custom rules to configure the Vercel Web Application Firewall (WAF).
---

# WAF Custom Rules

You can [configure](#custom-rule-configuration) specific rules to log, deny, challenge, bypass, or [rate limit](/docs/security/vercel-waf/rate-limiting) traffic to your site. When you apply the configuration, it takes effect immediately and does not require re-deployment.

[Get started](#get-started) by reviewing the [Best practices for applying rules](#best-practices-for-applying-rules) section.

> **🔒 Permissions Required**: WAF Custom Rules

## Access roles

- You need to be a [Developer](/docs/rbac/access-roles#developer-role) or viewer ([Viewer Pro](/docs/rbac/access-roles#viewer-pro-role) or [Viewer Enterprise](/docs/rbac/access-roles#viewer-enterprise-role)) in the team to view the Firewall overview page and list the rules
- You need to be a [Project administrator](/docs/rbac/access-roles#project-administrators) or [Team member](/docs/rbac/access-roles#member-role) to configure, save and apply any rule and configuration

## Custom Rule configuration

You can create multiple Custom Rules for the same project. Each rule can perform the following actions according to one or more logical condition(s) that you set based on the value of specific [parameters](/docs/security/vercel-waf/rule-configuration) in the incoming request:

- [log](/docs/vercel-firewall/firewall-concepts#log)
- [deny](/docs/vercel-firewall/firewall-concepts#deny)
- [challenge](/docs/vercel-firewall/firewall-concepts#challenge)
- [bypass](/docs/vercel-firewall/firewall-concepts#bypass)
- redirect

You can **save**, **delete**, or **disable** a rule at any time and these actions have immediate effect. You also have the ability to re-order the precedence of each custom rule.

## Custom Rule execution

When a rule denies or challenges the traffic to your site and the client has not previously solved the challenge (in the case of challenge mode), the rule execution stops and blocks or challenges the request.

After a **Log** rule runs, the rule execution continues. If no other rule matches and acts on the request, the **Log** rule that is last matched is reported.

When you apply a [rate limiting](/docs/security/vercel-waf/rate-limiting) rule, you need to include a follow up action that will log, deny, challenge, or return a 429 response.

## Persistent actions

> **🔒 Permissions Required**: Persistent Actions

When a custom rule blocks a client's request, future requests that do not match the rule's condition from the same client, are allowed through. If you want to deny all requests from the client whose first request was blocked, you will need to identify who this client is through [traffic monitoring](/docs/security/vercel-waf#traffic-monitoring) and create an IP Address rule for that purpose.

With persistent actions, you can automatically block potential bad actors by adding a time-based block to the **Challenge** or **Deny** action of your custom rule. When you do so, any client whose request is challenged or denied, will be blocked for a period of time that you specify.

Notes about this time-based block:

- It is applied to the IP address of the client that originally triggered the rule to match.
- It happens before the firewall processes the request, so that none of the requests blocked by persistent actions count towards your [CDN](/docs/cdn) and traffic usage.

### Enable persistent actions

You can enable persistent actions for any challenge, deny or rate limit action when you create or edit a custom rule. From your project's page in the dashboard:

1. Select the **Firewall** tab followed by **Configure** on the top right of the Firewall overview page.
2. Select a Custom Rule you would like to edit from the list or select **+ New Rule** and follow the [steps](#get-started) for configuring a rule.

When you select challenge, deny or rate limit for the [action](/docs/vercel-firewall/vercel-waf/rule-configuration#actions) dropdown (**Then**) of any condition, you will see an additional dropdown for timeframe (**for**) that defaults to **1 minute**. You have the following options:

3. Select a time value from the available options
4. Remove the timeframe (If you don't want to enable persistent actions)

Once you're happy with the changes:

5. Select **Save Rule** to apply it
6. Apply the changes with the **Review Changes** button

## Best practices for applying rules

To ensure your Custom Rule behaves as intended:

1. Test a Custom Rule by setting it up with a **log** action
2. Observe the 10-minute live traffic to check the behavior
3. Update the Custom Rule condition if needed. Once you're happy with the behavior, update the rule with a
   **challenge**, **deny**, or **bypass**, or **rate limit** action

## Get started

Learn how to create, test, and apply a Custom Rule.

1. From your dashboard, select the project that you'd like to configure a rule for and then select the **Firewall** tab

2. Select **⋯** > **Configure** on the top right of the Firewall overview page

3. Select **Add New...** > **Rule** to start creating a new rule

4. Type a name to help you identify the purpose of this rule for future reference

5. In the **Configure** section, add as many **If** conditions as needed. For each condition you add, choose how you will combine it with the previous condition using the **AND** (Both conditions need to be met) or the **OR** operator (One of the conditions need to be met).

   ![Image](`/docs-assets/static/docs/security/vercel-waf-custom-rule-configure-and-or-light.png`)

6. Select **Log** for the **Then** action
   - For **Rate Limit**, review [WAF Rate Limiting](/docs/security/vercel-waf/rate-limiting#get-started)

7. Select **Save Rule** to apply it

8. Apply the changes:
   - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
   - Select **Review Changes** and review the changes to be applied
   - Select **Publish** to apply the changes to your production deployment

9. Go to the Firewall overview page, select your Custom Rule from the traffic grouping drop-down and select the paramater(s) related to the condition(s) of your Custom Rule to observe the traffic:

   ![Image](`/docs-assets/static/docs/security/waf-overview-custom-rule-light.png`)

10. If you are satisfied with the traffic behavior, select **Configure**

11. Select the Custom Rule that you created

12. Update the **Then** action to **Challenge**, **Deny** or **Bypass** as needed

13. Select **Save Rule** to apply it

14. Apply the changes with the **Review Changes** button

Review [Common Examples](/docs/security/vercel-waf/examples) for the application of specific rules in common situations.

## Configuration in vercel.json

You can configure custom WAF rules directly in your `vercel.json` file using the `routes` property. This allows you to define firewall rules as part of your deployment configuration.

### Supported actions

When configuring WAF rules in `vercel.json`, you can use the following actions:

- **challenge**: Challenge the request with a security check
- **deny**: Block the request entirely

> **💡 Note:** This is a subset of the actions available in the dashboard - `log`, `bypass`,
> and `redirect` actions are not supported in `vercel.json` configuration.

### Example configuration

The following example shows how to deny requests that contain a specific header:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/(.*)",
      "has": [
        {
          "type": "header",
          "key": "x-react-router-prerender-data"
        }
      ],
      "mitigate": {
        "action": "deny"
      }
    }
  ]
}
```

In this example:

- The route matches all paths (`/(.*)`)
- The `has` condition checks for the presence of a specific header
- The `mitigate` property specifies the action to take (deny the request)

### Route configuration

For complete documentation on route configuration options, including `has`, `missing`, and other conditional matching properties, see the [routes documentation](/docs/project-configuration#routes).


---

[View full sitemap](/docs/sitemap)
