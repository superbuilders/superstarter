---
title: Archive
product: vercel
url: /docs/flags/vercel-flags/dashboard/archive
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/dashboard
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/dashboard/feature-flag
  - /docs/flags/vercel-flags/dashboard
summary: Learn about archive on Vercel.
---

# Archive

The Archive is where you find feature flags that are no longer active. Archiving removes a flag from evaluation while preserving its configuration for later.

Archive a flag after it is no longer used in code. For example when a feature has fully rolled out, an experiment has concluded, or you want to clean up your flags list without losing the configuration. If a feature might return, archiving lets you restore its configuration and history intact rather than rebuilding from scratch.

Vercel Flags requires you to archive flags before you can delete them. This gives you a safety net if you change your mind.

## Archiving vs. deleting

| Action      | What happens                                                    | Reversible? |
| ----------- | --------------------------------------------------------------- | ----------- |
| **Archive** | Flag stops being served; configuration and history is preserved | Yes         |
| **Delete**  | Flag and all configuration are permanently removed              | No          |

Archive flags when you're done with a feature but might want to restore it later. Delete flags only when you're certain you won't need them again.

## What happens when you archive

When you archive a flag:

1. **Evaluation stops**: The flag is no longer served by the SDK
2. **Your application falls back**: It uses the default value defined in code
3. **Configuration is preserved**: All variants, rules, and targeting settings are saved
4. **The flag moves to Archive**: It no longer appears in the main flags list

> **💡 Note:** If your code doesn't define a default value for the flag, evaluation will throw an error. Make sure your flag definitions include a `defaultValue` or handle missing flags gracefully.

```ts filename="flags.ts"
export const archivedFeature = flag({
  key: 'archived-feature',
  adapter: vercelAdapter(),
  // This default is used when the flag is archived
  defaultValue: false,
});
```

## How to archive a flag

1. Navigate to the **Flags** tab in your project
2. Click on the flag you want to archive
3. Open the Dot menu on the top right
4. Click the **Archive** button
5. Confirm the action

The flag will immediately stop being served and move to the Archive section.

## How to restore a flag

1. Go to the **Archive** section in the Flags tab
2. Click on the flag you want to restore
3. Open the Dot menu on the top right
4. Click the **Unarchive** button
5. Confirm the action

The flag returns to your active flags list with all its previous configuration intact. You can then modify it or enable it as needed.

## How to delete an archived flag

1. Go to the **Archive** section
2. Click on the flag you want to delete
3. Click **Delete**
4. Confirm the permanent deletion

> **⚠️ Warning:** Deleting a flag is permanent and cannot be undone. All configuration, including variants, targeting rules, and change history, will be lost.

## Next steps

- [Configure feature flags](/docs/flags/vercel-flags/dashboard/feature-flag)
- [Manage flags in the dashboard](/docs/flags/vercel-flags/dashboard)


---

[View full sitemap](/docs/sitemap)
