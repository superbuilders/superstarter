---
title: WAF Managed Rulesets
product: vercel
url: /docs/vercel-firewall/vercel-waf/managed-rulesets
type: how-to
prerequisites:
  - /docs/vercel-firewall/vercel-waf
  - /docs/vercel-firewall
related:
  - /docs/rbac/access-roles
  - /docs/projects/project-dashboard
  - /docs/bot-management
  - /docs/vercel-firewall/firewall-concepts
  - /docs/vercel-firewall/vercel-waf/rule-configuration
summary: Learn how to use WAF Managed Rulesets with the Vercel Web Application Firewall (WAF)
---

# WAF Managed Rulesets

WAF Managed Rulesets are collections of predefined WAF rules based on standards such as [Open Worldwide Application Security Project (OWASP) Top Ten](https://owasp.org/www-project-top-ten/) that you can enable and configure in your project's Firewall dashboard.

The following ruleset(s) are currently available:

- [OWASP core ruleset](#configure-owasp-core-ruleset)
- [Bot Protection Managed Ruleset](#configure-bot-protection-managed-ruleset)
- [AI Bots Managed Ruleset](#configure-ai-bots-managed-ruleset)

## Access roles

- You need to be a [Developer](/docs/rbac/access-roles#developer-role) or viewer ([Viewer Pro](/docs/rbac/access-roles#viewer-pro-role) or [Viewer Enterprise](/docs/rbac/access-roles#viewer-enterprise-role)) in the team to view the Firewall overview page and list the rules
- You need to be a [Project administrator](/docs/rbac/access-roles#project-administrators) or [Team member](/docs/rbac/access-roles#member-role) to configure, save and apply any rule and configuration

## Configure OWASP core ruleset

> **🔒 Permissions Required**: OWASP core ruleset

To enable and configure [OWASP Core Ruleset](https://owasp.org/www-project-top-ten/) for your project, follow these steps:

1. From your [project's dashboard](/docs/projects/project-dashboard), select the **Firewall** tab
2. Select the **Rules** tab
3. From the **WAF Managed Rulesets** section, enable **OWASP Core Ruleset**
4. You can apply the changes with the OWASP rules enabled by default:
   - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
   - Select **Review Changes** and review the changes to be applied
   - Select **Publish** to apply the changes to your production deployment
5. Or select what OWASP rules to enable first by selecting **Configure** from the **OWASP Core Ruleset** list item
6. For the **OWASP Core Ruleset** configuration page, enable or disable the rule that you would like to apply
7. For each enabled rule, select **Log** or **Deny** from the action drop-down
   - Use **Log** first and monitor the live traffic on the **Firewall** overview page to check that the rule has the desired effect when applied
8. Apply the changes
9. Monitor the live traffic on the **Firewall** overview page

## Configure Bot Protection Managed Ruleset

> **🔒 Permissions Required**: Bot Protection Managed Ruleset

To enable and configure [bot protection](/docs/bot-management#bot-protection-managed-ruleset) for your project, follow these steps:

1. From your [project's dashboard](/docs/projects/project-dashboard), select the [**Firewall**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Ffirewall\&title=Firewall+tab) tab.
2. Select the **Rules** tab.
3. From the **Bot Management** section, select **Log** or **Challenge** on the **Bot Protection** rule to choose what action should be performed when an unwanted bot is identified.
   - When enabled in challenge mode, the Vercel WAF will serve a JavaScript challenge to traffic that is unlikely to be a browser.
4. You can then apply as follows:
   - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
   - Select **Review Changes** and review the changes to be applied
   - Select **Publish** to apply the changes to your production deployment

## Configure AI Bots Managed Ruleset

> **🔒 Permissions Required**: AI Bots Managed Ruleset

To manage AI bots for your project, follow these steps:

1. From your [project's dashboard](/docs/projects/project-dashboard), select the [**Firewall**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Ffirewall\&title=Firewall+tab) tab.
2. Select the **Rules** tab.
3. From the **Bot Management** section, select **Log** or **Deny** on the **AI Bots Ruleset** rule to choose what action should be performed when an AI bot is identified.
   - **Log**: This action records AI bot traffic without blocking it. It's useful for monitoring.
   - **Deny**: This action blocks all traffic identified as coming from AI bots.
4. You can then apply as follows:
   - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
   - Select **Review Changes** and review the changes to be applied
   - Select **Publish** to apply the changes to your production deployment

## Bypassing rulesets

Sometimes, you may need to allow specific requests that a WAF Managed Ruleset is blocking. For example, [Bot Protection](/docs/bot-management#bot-protection-managed-ruleset) could be blocking a custom user agent that you are using.
In this case, use the [bypass](/docs/vercel-firewall/firewall-concepts#bypass) [action](/docs/vercel-firewall/vercel-waf/rule-configuration#actions) in a [WAF Custom Rule](/docs/vercel-firewall/vercel-waf/custom-rules) to target the traffic you want to allow.
In the case of the custom user agent, you would use the "User Agent" parameter with a value of the user agent name in the custom rule.

### Bypassing custom rules

If you need to allow requests being blocked by your own custom rule set up in your project, you can add another custom rule with a bypass action targeting the blocked requests. Make sure that the bypass rule executes before the blocking custom rule by placing it higher in the custom rules section of the [**Firewall rules** page](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Ffirewall%2Frules\&title=Go+to+the+Firewall+Rules) of your project dashboard.

### Rules execution order

The Vercel WAF executes rules on incoming traffic in the following order:

1. Custom rules set up in the project
2. WAF Managed Rulesets configured in the project


---

[View full sitemap](/docs/sitemap)
