---
title: Entities
product: vercel
url: /docs/flags/vercel-flags/dashboard/entities
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/dashboard
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/dashboard/segments
  - /docs/flags/vercel-flags/dashboard/feature-flag
  - /docs/flags/vercel-flags/sdks/flags-sdk
summary: Learn about entities on Vercel.
---

# Entities

Entities represent the things your application knows about: users, teams, devices, or requests. By defining entities in the dashboard, you enable precise targeting in your feature flags.

Each entity has attributes that can be used in targeting rules. For example, a User entity might have `email`, `plan`, and `country` attributes. A Team entity might have `id`, `name`, and `tier`.

You must define entities before you can use their attributes in targeting rules or segments. Once defined, the dashboard shows your specific attributes when building rules.

> **💡 Note:** Entities in Vercel Flags are sometimes called "evaluation contexts" in other feature flag systems.

## How to define entities

Before you can use targeting rules, you need to define your entities in the dashboard:

1. Navigate to the **Flags** tab in your project
2. Click **Entities** in the sidebar
3. Click **Create Entity**
4. Enter a name (e.g., "User", "Team")
5. Add attributes with their types

### Attribute types

Each attribute has a type that determines how it can be used in targeting rules:

| Type         | Description     | Example values                    |
| ------------ | --------------- | --------------------------------- |
| String       | Text values     | `"user@example.com"`, `"premium"` |
| Number       | Numeric values  | `42`, `3.14`                      |
| Boolean      | True or false   | `true`, `false`                   |
| String Array | List of strings | `["admin", "editor"]`             |

## Entity evaluation behavior

Entities are evaluated fresh for each flag call. There's no automatic merging or persistence between evaluations.

- If you don't provide an entity or attribute, rules targeting it won't match
- Each evaluation uses exactly the context you supply
- Previously sent attributes aren't remembered

Provide the full context on every evaluation. If a targeting rule references an attribute that is missing from the context, that rule is skipped.

## How to provide entities in code

When evaluating flags, your application must pass the entity data. This is the evaluation context.

### With the Flags SDK

Use the `identify` function to provide evaluation context:

```ts filename="flags.ts"
import { flag, dedupe } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

type Entities = {
  user?: {
    id: string;
    email: string;
    plan: string;
  };
  team?: {
    id: string;
    name: string;
  };
};

const identify = dedupe(async (): Promise<Entities> => {
  const session = await getSession();
  return {
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          plan: session.user.plan,
        }
      : undefined,
    team: session?.team
      ? {
          id: session.team.id,
          name: session.team.name,
        }
      : undefined,
  };
});

export const premiumFeature = flag<boolean, Entities>({
  key: 'premium-feature',
  adapter: vercelAdapter(),
  identify,
});
```

### With OpenFeature

```ts
const entities = {
  targetingKey: 'user-123',
  user: { id: 'user-123', email: 'user@example.com', plan: 'premium' }
};

const enabled = await client.getBooleanValue(
  'premium-feature', // name of flag
  false, // default value
  entities, // evaluation context
);
```

Vercel Flags entities correspond to the OpenFeature [Evaluation Context](https://openfeature.dev/docs/reference/concepts/evaluation-context). The [Targeting Key](https://openfeature.dev/docs/reference/concepts/evaluation-context/#targeting-key) is not used because Vercel Flags can target on any attribute, not only an ID.

### With the core library

Pass entities as the third argument to `evaluate`:

```ts
const entities = { user: { id: 'user-123', email: 'user@example.com', plan: 'premium' } };
const result = await client.evaluate<boolean>(
  'premium-feature', // name of flag
  false, // default value
  entities, // evaluation context
);
```

## How to add labels

By default, the dashboard shows attribute values like IDs directly. Labels make the UI more readable by mapping IDs to friendly names. Labels are used by the targeting rules sections in flag details and segments.

1. Go to the **Entities** page
2. Select an entity
3. Add a label mapping (e.g., ID `team-123` → Label "Acme Corp")
4. Press **Continue**
5. Save the entities page

Labels make it easier to understand who is being targeted without needing to memorize IDs.

> **💡 Note:** Labels are currently added manually. Automatic label syncing may be available in a future update.

## How to target users with entities

Once entities are defined, you can use them to:

- **Build flag targeting rules**: Target users where `user.plan` equals `"enterprise"`
- **Create segments**: Define reusable groups like "Premium Users" based on entity attributes
- **Run percentage rollouts**: Roll out to a percentage of users based on `user.id`

See [Segments](/docs/flags/vercel-flags/dashboard/segments) for creating reusable targeting groups.

## Next steps

- [Create segments](/docs/flags/vercel-flags/dashboard/segments) using your entities
- [Configure flag targeting](/docs/flags/vercel-flags/dashboard/feature-flag)
- [Set up the Flags SDK](/docs/flags/vercel-flags/sdks/flags-sdk) to pass evaluation context


---

[View full sitemap](/docs/sitemap)
