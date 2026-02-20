---
title: Clean Up After Rollout
product: vercel
url: /docs/flags/vercel-flags/cli/clean-up-after-rollout
type: reference
prerequisites:
  - /docs/flags/vercel-flags/cli
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/dashboard/archive
summary: Learn about clean up after rollout on Vercel.
---

# Cleaning Up After a Full Rollout

Once a feature is stable and the flag has been enabled in all environments for a while, remove it from your codebase and dashboard.

## 1. Audit active flags

```bash filename="terminal"
vercel flags list --state active
```

## 2. Inspect the candidate

```bash filename="terminal"
vercel flags inspect old-onboarding-flow
```

Check the output to confirm the flag is enabled in all environments and hasn't been changed recently.

## 3. Find all references in code

Search your codebase for the flag key and its camelCase variant:

```bash filename="terminal"
rg "old-onboarding-flow" --type ts
rg "oldOnboardingFlow" --type ts
```

## 4. Remove the flag definition

Delete the `flag()` declaration from your `flags.ts` file.

## 5. Remove conditionals from components

Keep only the code path that was behind the enabled flag:

```tsx filename="Before"
const show = await oldOnboardingFlow();
return show ? <NewOnboarding /> : <OldOnboarding />;
```

```tsx filename="After"
return <NewOnboarding />;
```

Delete any component files that are no longer referenced.

## 6. Deploy to preview and verify

```bash filename="terminal"
vercel deploy
```

Visit the preview URL to confirm the feature still works without the flag.

## 7. Archive the flag

Once archived, the flag stops evaluating and your application falls back to the `decide` default defined in code.

```bash filename="terminal"
vercel flags archive old-onboarding-flow --yes
```

See [Archive](/docs/flags/vercel-flags/dashboard/archive) for details on what happens when you archive.

## 8. Deploy to production

```bash filename="terminal"
vercel deploy --prod
```


---

[View full sitemap](/docs/sitemap)
