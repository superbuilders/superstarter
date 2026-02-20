---
title: Segments
product: vercel
url: /docs/flags/vercel-flags/dashboard/segments
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/dashboard
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/dashboard/entities
  - /docs/flags/vercel-flags/dashboard/feature-flag
  - /docs/flags/vercel-flags/sdks
summary: Learn about segments on Vercel.
---

# Segments

Segments are reusable groups of users for targeting feature flags. Instead of recreating "email ends with @yourcompany.com" for every internal feature, you create an "Internal Team" segment and reference it wherever needed.

When you update a segment's rules, every flag using that segment updates automatically. This keeps targeting consistent and makes bulk changes simple.

## Common segment examples

| Segment              | Description                         | Example rules                      |
| -------------------- | ----------------------------------- | ---------------------------------- |
| Internal Team        | Your employees                      | Email ends with `@yourcompany.com` |
| Beta Users           | Early adopters testing new features | User has `beta: true` attribute    |
| Enterprise Customers | High-tier paying customers          | Plan equals `enterprise`           |
| US Users             | Users in the United States          | Country equals `US`                |

## How to create a segment

1. Navigate to the **Flags** tab in your project
2. Click **Segments** in the sidebar
3. Click **Create Segment**
4. Enter a name and description
5. Define the targeting rules

### Defining segment rules

Segment rules use [entities](/docs/flags/vercel-flags/dashboard/entities) to match users. Each rule checks an attribute against a condition.

**Building a rule:**

- **Attribute**: The entity property to check (e.g., `user.email`, `team.plan`)
- **Operator**: How to compare the value:
  - `equals` / `does not equal`
  - `contains` / `does not contain`
  - `starts with` / `ends with`
  - `is one of` / `is not one of` (for lists)
- **Value**: What to match against

**Combining rules:**

You can combine multiple conditions with AND or OR logic:

```
user.email ends with "@yourcompany.com"
OR
user.role equals "admin"
```

This segment matches anyone with a company email OR anyone with the admin role.

> **💡 Note:** Segments are available in all environments (Production, Preview, Development). If you need different targeting per environment, create separate segments with environment-specific names (e.g., "Beta Users - Production").

## How to use a segment in a flag

Once you've created a segment, you can use it when configuring flag targeting:

1. Go to a flag's configuration
2. Click the **Target** icon next to an environment
3. Click **Add a Target**
4. Select your segment from the dropdown
5. Choose which variant to serve to users in this segment

Segments can be combined with other rules and targets in your flag configuration.

## How to edit a segment

When you edit a segment's rules, the change applies everywhere the segment is used. This makes it easy to update targeting across multiple flags at once.

1. Go to **Segments** in the Flags tab
2. Click on the segment you want to edit
3. Modify the rules
4. Save your changes

All flags using this segment will immediately use the updated rules.

## How to delete a segment

To delete a segment, it must not be in use by any flags or other segments.

You can see the flags and segments currently referencing a segment on the Segment details page.

If a segment is referenced by a flag or segment:

1. Go to each flag (or segment) using the segment you want to delete
2. Remove the segment from the targeting rules
3. Return to Segments and delete it

## Next steps

- [Learn about entities](/docs/flags/vercel-flags/dashboard/entities) for defining targetable attributes
- [Configure flag targeting](/docs/flags/vercel-flags/dashboard/feature-flag)
- [Set up your SDK](/docs/flags/vercel-flags/sdks) to pass evaluation context


---

[View full sitemap](/docs/sitemap)
