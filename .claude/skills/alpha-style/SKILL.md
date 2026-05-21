---
name: alpha-style
description: Apply Alpha's premium, light-first editorial design system to frontend experiences. Create parent-trust marketing pages, polished dashboards, and Alpha-branded flows that feel cohesive across the product family while avoiding generic AI aesthetics. Use when building or redesigning Alpha interfaces, pages, components, campaigns, or enrollment flows.
license: Apache 2.0. Based on Anthropic's frontend-design skill and the Impeccable project. See NOTICE.md for attribution.
---

This skill encodes Alpha's design language from reviewed Alpha frontend surfaces, content docs, and brand assets. Use it to build real production code that feels unmistakably Alpha: calm, premium, human, and highly intentional.

## Alpha Defaults

Start from these defaults unless the local project context explicitly overrides them:

- **Primary users**: Parents evaluating, enrolling in, and managing Alpha programs for their children
- **Secondary users**: Staff and operators managing camps, registrations, discounts, and family data
- **Brand personality**: Confident, premium, human
- **Aesthetic direction**: Light-first, editorial, polished. Floating layers, rounded forms, crisp blue accents, restrained motion
- **Core promise**: Trustworthy clarity for high-stakes family decisions

These defaults come from reviewed Alpha source material. Read [reference/alpha-brand.md](reference/alpha-brand.md) before making major design decisions.

## Context Gathering Protocol

Alpha work still needs local context, but you should not re-ask basic brand questions when the project is clearly Alpha-branded.

**Gathering order:**
1. **Check current instructions**: If a `## Design Context` section is already loaded, proceed.
2. **Check `.alpha-style.md`**: If it exists in the project root and contains the needed context, proceed.
3. **Use embedded Alpha defaults**: If the repo is clearly Alpha-branded and no local context file exists, proceed with the defaults in this skill and only ask about product-specific exceptions, sub-brands, or campaign needs.
4. **Run teach-alpha-style when unclear**: If the project is not clearly Alpha, or if the brand/product context is conflicted, run /teach-alpha-style before doing design work.

---

## Design Direction

Choose a precise Alpha-appropriate direction before writing code:

- **Surface type**: flagship marketing page, campaign microsite, authenticated product surface, dashboard, or enrollment flow
- **Audience moment**: curiosity, evaluation, conversion, reassurance, management, or operations
- **Intensity**: flagship Alpha should feel refined and premium; seasonal/local variants may add warmth or play, but should still read as Alpha
- **Constraints**: framework, performance, accessibility, and mobile usability
- **Differentiation**: the design should feel authored, not templated, without drifting into gimmicks

Then implement working code that is:

- Production-grade and functional
- Cohesive with Alpha's brand system
- Visually memorable without feeling loud for the sake of it
- Meticulously refined in typography, spacing, layering, and trust signals

## Frontend Aesthetics Guidelines

### Typography
→ *Consult [typography reference](reference/typography.md) for scales, pairing, and loading strategies.*

Alpha typography should balance authority and warmth.

**DO**: Pair a clean sans body with an editorial serif accent for flagship marketing surfaces
**DO**: Use clamp-based display sizing on marketing pages and tighter fixed scales on app/dashboard surfaces
**DO**: Let italics or serif accents create emotional lift instead of extra decoration
**DON'T**: Default to generic system styling on flagship Alpha surfaces
**DON'T**: Use playful script fonts except for explicit local campaign variants
**DON'T**: Use monospace as a shortcut for "AI" or "technical" vibes

### Color & Theme
→ *Consult [color reference](reference/color-and-contrast.md) for OKLCH, palettes, and dark mode.*

Alpha color should feel disciplined and intentional.

**DO**: Anchor to Alpha blues and indigos: `#1e00ff`, `#0D0050`, `#110068`, `#06B6D4`
**DO**: Use lavender-tinted light backgrounds and borders such as `#F5F4FB` and `#E5E3F5`
**DO**: Tint neutrals toward blue-violet so the brand feels cohesive even in quiet areas
**DO**: Use blue as a deliberate accent, not a blanket treatment
**DON'T**: Wash the whole interface in saturated royal blue
**DON'T**: Use generic purple/cyan AI gradients, neon dark mode, or gradient text
**DON'T**: Put cool gray text on colored backgrounds; use a harmonized shade of the surface color instead

### Layout & Space
→ *Consult [spatial reference](reference/spatial-design.md) for grids, rhythm, and container queries.*

Alpha layouts should feel composed and premium, not crowded or template-based.

**DO**: Use generous breathing room, floating layers, and strong section rhythm
**DO**: Favor asymmetry and editorial composition on marketing pages
**DO**: Keep app surfaces quieter, denser, and more systematized than marketing
**DO**: Let campaign pages vary while preserving recognizable Alpha structure and polish
**DON'T**: Wrap every decision in a card or stack cards inside cards
**DON'T**: Use interchangeable icon-card grids as the default pattern
**DON'T**: Center everything by default when left alignment would increase credibility and scanability
**DON'T**: Let campaign variants drift so far that they stop feeling like Alpha

### Visual Details
**DO**: Reuse Alpha motifs such as rounded nav shells, layered media, serif callouts, and refined shadows
**DO**: Keep decorative elements purposeful and brand-reinforcing
**DON'T**: Use decorative glass, glows, or side-border accents as generic polish
**DON'T**: Use childish camp graphics on core Alpha surfaces unless the page is explicitly seasonal or local
**DON'T**: Use anonymous SaaS rectangles and stock "AI dashboard" aesthetics

### Motion
→ *Consult [motion reference](reference/motion-design.md) for timing, easing, and reduced motion.*

Alpha motion should support confidence and comprehension.

**DO**: Use smooth reveals, subtle parallax or layer shifts, and deliberate CTA emphasis
**DO**: Prefer transform and opacity with polished easing curves
**DO**: Respect reduced motion and keep loops subdued
**DON'T**: Use bounce, elastic, or attention-seeking motion on trust-critical surfaces
**DON'T**: Add animation that competes with pricing, dates, forms, or parent decision-making

### Interaction
→ *Consult [interaction reference](reference/interaction-design.md) for forms, focus, and loading patterns.*

Alpha interactions should feel guided and reassuring.

**DO**: Make next steps obvious in enrollment, checkout, and account-management flows
**DO**: Use summary panels, trust cues, and contextual helper copy where parents need confidence
**DO**: Keep forms crisp, legible, and emotionally calm
**DON'T**: Hide important dates, pricing, policy, or availability behind weak affordances
**DON'T**: Make every CTA primary or every surface equally loud
**DON'T**: Repeat headings with filler paragraphs that add no new information

### Responsive
→ *Consult [responsive reference](reference/responsive-design.md) for mobile-first, fluid design, and container queries.*

**DO**: Adapt the composition, not just the scale
**DO**: Preserve trust signals and key conversion details on mobile
**DO**: Keep sticky CTAs purposeful and non-intrusive
**DON'T**: Remove critical content or squeeze premium layouts into cramped mobile stacks without reconsidering hierarchy

### UX Writing
→ *Consult [ux-writing reference](reference/ux-writing.md) for labels, errors, and empty states.*

**DO**: Write with confident clarity and human warmth
**DO**: Translate Alpha claims into proof, next steps, and concrete outcomes
**DO**: Make every word earn its place
**DON'T**: Use startup filler, vague superlatives, or generic empowerment copy
**DON'T**: Repeat what the user can already see

---

## Alpha Slop Test

Before shipping, ask:

- Would a parent trust this experience with their child and money?
- Does this feel like Alpha, not generic SaaS or generic summer camp?
- Do marketing and authenticated surfaces still feel like one brand family?
- Would someone call out obvious AI tropes on sight?

---

## Implementation Principles

Match implementation complexity to the surface:

- Flagship marketing: rich composition, stronger typography, immersive media, more motion
- Dashboard and account surfaces: quieter, more tokenized, highly legible
- Campaign variants: preserve Alpha DNA while adjusting tone to local needs

Prefer building on existing Alpha tokens, colors, assets, and UI primitives before inventing new ones. If a sub-brand needs deviation, make it explicit and bounded.

Remember: the goal is not maximal decoration. The goal is Alpha-level trust, polish, and clarity with a distinct point of view.