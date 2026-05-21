---
name: teach-alpha-style
description: One-time setup that gathers Alpha-specific product context and saves it to your AI config file. Run once to establish persistent Alpha design guidance for this project.
user-invocable: true
---

Gather local Alpha product context for this project, then persist it for future sessions.

## Step 1: Explore the Codebase

Before asking questions, thoroughly scan the project to discover what you can:

- **README and docs**: Project purpose, target audience, any stated goals
- **Package.json / config files**: Tech stack, dependencies, existing design libraries
- **Existing components**: Current design patterns, spacing, typography in use
- **Brand assets**: Logos, favicons, color values already defined
- **Design tokens / CSS variables**: Existing color palettes, font stacks, spacing scales
- **Any style guides or brand documentation**
- **Whether this is flagship Alpha, a local campaign variant, or an internal product surface**

Note what you've learned and what remains unclear.

## Step 2: Ask Focused Questions

This skill already assumes Alpha's baseline brand system. ask the user directly to clarify what you cannot infer. Focus only on what you could not infer from the codebase or what appears product-specific:

### Surface & Audience
- Which Alpha surface is this: flagship marketing, local campaign, dashboard, enrollment flow, or something else?
- Who is primary here: parents, staff, students, or another audience?
- What job are they trying to get done in this specific flow?

### Product-Specific Tone
- Should this stay close to flagship Alpha or intentionally lean into a local/sub-brand variant?
- What should this explicitly NOT look like for this project?
- Are there any pages, references, or campaigns we should match more closely?

### Constraints
- Any accessibility, compliance, or reduced-motion requirements?
- Any colors, typography choices, or assets that must be used or avoided?
- Are there implementation constraints that should affect the design system guidance?

Skip questions where the answer is already clear from the codebase exploration or Alpha defaults.

## Step 3: Write Design Context

Synthesize your findings and the user's answers into a `## Design Context` section:

```markdown
## Design Context

### Users
[Who they are, their context, the job to be done]

### Brand Personality
[How this product should express Alpha's voice and emotional tone]

### Aesthetic Direction
[How closely it should track flagship Alpha vs any local/product-specific variation]

### Design Principles
[3-5 principles derived from the conversation that should guide all design decisions]
```

Write this section to `.alpha-style.md` in the project root. If the file already exists, update the Design Context section in place.

Then ask the user directly to clarify what you cannot infer. whether they'd also like the Design Context appended to .github/copilot-instructions.md. If yes, append or update the section there as well.

Confirm completion and summarize the key design principles that will now guide all future work.