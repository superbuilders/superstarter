# Alpha Design Guide

A comprehensive design reference for building Alphaschool products. Distilled from the `alpha-style` skill suite. Drop this into a project (root, `docs/`, or `.claude/`) so any AI assistant has Alpha's full design context in one document.

---

## 1. Purpose & Brand Core

### Who Alpha Builds For

- **Primary**: Parents evaluating, enrolling in, and managing Alphaschool programs for their children.
- **Secondary**: Staff and operators managing camps, registrations, discounts, pricing, and family records.
- **Tertiary (where applicable)**: Students themselves, in product surfaces designed for them.

### Brand Personality

Three words, in this order: **confident, premium, human.**

- **Confident** — Alpha is not tentative. Claims are stated plainly with proof.
- **Premium** — Restraint, polish, intentional details. Never busy or budget.
- **Human** — Warmth, plain language, parent-to-parent tone. Not corporate, not robotic.

### Emotional Goal

Make high-stakes family decisions feel **clear, credible, and supported.** Parents are spending real money on their child's education and time. Every surface either earns or erodes that trust.

### Core Promise

**Trustworthy clarity for high-stakes family decisions.** When a design choice has to break a tie, this is the tie-breaker.

---

## 2. The Three Surface Types

Alpha has three coexisting visual systems. Pick the right one before writing code.

### A. Flagship Marketing (Alpha Summer, primary product pages)

- Light-first, editorial art direction.
- Sans + editorial serif pairing. Display type uses `clamp()` and feels intentional.
- Deep indigo and cobalt accents over lavender-tinted neutral backgrounds.
- Floating nav shells, layered media, asymmetric composition.
- Purposeful reveal animations and polished media framing.
- Generous breathing room. Strong section rhythm.

### B. Authenticated Product Surfaces (dashboard, account, registrations)

- Same token system as marketing, **dialed down**.
- Quiet white and near-white surfaces, minimal shadows.
- Brand blue used as accent only — never as background fill.
- Denser, more operational, more systematized than marketing.
- Still polished — should never read as a separate product.

### C. Local Campaign Variants (Hamptons-style sub-brands)

- Warmer, sunnier, photo-forward, lifestyle-driven.
- Playful secondary font usage allowed.
- **Bounded variant.** Use only when the product explicitly calls for it.
- Must still read as Alpha — same shape language, structure, polish standards.

> **Default to flagship Alpha** unless context says otherwise. Local variants are an exception, not a starting point.

---

## 3. Color & Theme

### Palette

Anchor colors (use these unless the project already defines a tighter token system):

| Token | Hex | Role |
|-------|-----|------|
| Alpha cobalt | `#1e00ff` | Primary brand accent |
| Deep indigo | `#0D0050` | Dominant headline / dark surface |
| Secondary indigo | `#110068` | Supporting depth |
| Vivid mid-blue | `#4F46E5` | CTA / interactive accent |
| Sky accent | `#06B6D4` | Bright callout / data |
| Pale accent | `#A5B4FC` | Soft accent / chip / hover |
| Light lavender bg | `#F5F4FB` | Quiet section background |
| Lavender border | `#E5E3F5` | Dividers, card borders, input borders |

### Color Rules

- **Use OKLCH (or LCH) for new tokens, not HSL.** OKLCH is perceptually uniform — equal lightness steps look equal. As you move toward white or black, reduce chroma so colors don't go garish.
- **Tinted neutrals only.** Never pure gray or pure black. Tint all neutrals slightly toward Alpha's blue-violet hue (~0.005–0.01 chroma at hue 250). This creates subconscious cohesion.
- **Blue is an accent, not a wash.** Anchor brand surfaces in tinted lavender/near-white. Use cobalt and indigo for type, CTAs, and deliberate moments.
- **No gradient text. No neon dark mode. No generic purple/cyan AI gradients.** These are the AI-slop tells we're explicitly avoiding.
- **Don't put cool gray text on colored backgrounds.** Use a harmonized darker shade of the surface color, or transparency.
- **Alpha (transparency) is a smell.** Heavy `rgba()` usually means an incomplete palette. Define explicit overlay colors per context. Acceptable for focus rings and interactive states.

### 60 / 30 / 10

This rule is about **visual weight**, not pixel count.

- 60% — neutral backgrounds, white space, base surfaces
- 30% — secondary: text, borders, inactive states
- 10% — accent: CTAs, highlights, focus

The accent works *because* it's rare. Overuse kills its power.

### Contrast (WCAG)

| Content | AA min | AAA target |
|---|---|---|
| Body text | 4.5:1 | 7:1 |
| Large text (18px+ or 14px bold) | 3:1 | 4.5:1 |
| UI components, icons | 3:1 | 4.5:1 |

Placeholder text still needs 4.5:1 — the common light-gray placeholder usually fails. Test with WebAIM Contrast Checker; emulate vision deficiencies in DevTools.

### Dark Mode (when supported)

Dark mode is **not inverted light mode**. Different design decisions:

- Depth via **lighter surfaces**, not shadows. Higher elevation = lighter surface.
- **Never pure black** — use dark gray at OKLCH 12–18% lightness, hue 250.
- **Reduce body weight slightly** (e.g., 350 instead of 400) — light-on-dark looks heavier.
- **Desaturate accents slightly** — full chroma vibrates on dark.
- Use a token hierarchy: primitives (`--blue-500`) and semantic (`--color-primary`). Only redefine semantic tokens for dark mode.

---

## 4. Typography

### Pairing

- **Body / UI**: clean sans (Inter is acceptable but generic; prefer Instrument Sans, Plus Jakarta Sans, Onest, DM Sans, or Figtree for distinctiveness).
- **Editorial accent**: serif for emphasis, pull quotes, headline moments on marketing surfaces. Playfair-style works; Fraunces, Newsreader, and Lora are stronger picks.
- Dashboard / form surfaces can drop the serif but should still feel related to marketing.
- **No monospace** as a shortcut for "AI" or "technical" feel.
- **No script fonts** except in explicit local campaign variants.
- **Two font families maximum.** Often one well-chosen family in multiple weights beats two competing typefaces.

### Scale

Use **fewer sizes with more contrast**. Five-step scale covers most needs:

| Role | Approx | Use |
|------|--------|-----|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem (min 16px) | Body |
| lg | 1.25–1.5rem | Subheadings, lead text |
| xl+ | 2–4rem | Headlines, hero |

Pick a ratio (1.25 / 1.333 / 1.5) and commit.

### Sizing Strategy

- **Fluid type (`clamp()`) on marketing pages** — display headlines benefit from breathing across viewports.
- **Fixed `rem` scales for app/dashboard surfaces** — predictable spatial behavior, what every major design system (Material, Polaris, Primer, Carbon) does in product UI.
- **Body text always fixed** — even on marketing pages. Viewport-driven body size adds no value.

### Vertical Rhythm

Line-height is the base unit for vertical spacing. If body is 16px / 1.5 → 24px line, all spacing is multiples of 24px (or your 4pt grid harmonized to it). Text and space share one math.

### Readability

- Line length: cap at **65ch**.
- Narrow columns get tighter leading; wide columns need more.
- Light text on dark: add **0.05–0.1 to line-height** — perceived weight is lighter.
- **Minimum 16px body** on mobile.
- Use `rem`/`em`, never `px`, for body type. Respects user browser settings.

### OpenType Polish

```css
.data-table { font-variant-numeric: tabular-nums; }
abbr        { font-variant-caps: all-small-caps; }
code        { font-variant-ligatures: none; }
body        { font-kerning: normal; }
```

### Loading

Use `font-display: swap` plus matched fallback metrics (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) to kill layout shift. Tools like Fontaine compute these automatically.

### Token Names

Semantic, not value-based: `--text-body`, `--text-heading-display`, never `--font-size-16`.

---

## 5. Layout & Space

### Spacing System

- **4pt base, not 8pt.** 8pt is too coarse — you'll need 12px values that don't fit. Scale: `4, 8, 12, 16, 24, 32, 48, 64, 96`.
- Name semantically: `--space-sm`, `--space-lg`. Not `--spacing-8`.
- Use `gap` for sibling spacing instead of margins — eliminates margin-collapse fixes.

### Grids

- Self-adjusting grid: `repeat(auto-fit, minmax(280px, 1fr))` for responsive layouts without breakpoints.
- Complex layouts → named `grid-template-areas`, redefined at breakpoints.

### Hierarchy (the squint test)

Blur the screen. Can you still see #1, #2, and clear groupings? If everything looks equal, hierarchy is broken.

Combine **2–3 dimensions at once** for strong hierarchy: size + weight + space + color + position. Size alone is weak. Headings should be larger, bolder, AND have more space above.

### Cards Are Overused

Cards are a default, not a design decision. Use them only when:

- Content is genuinely distinct and actionable
- Items need side-by-side comparison
- Content needs clear interaction boundaries

**Never nest cards inside cards.** Use spacing, typography, and subtle dividers for hierarchy within a card. Generic icon-card grids are an Alpha anti-pattern — favor composition.

### Container Queries (the modern win)

Viewport queries → page layouts. Container queries → components.

```css
.card-container { container-type: inline-size; }
@container (min-width: 400px) {
  .card { grid-template-columns: 120px 1fr; }
}
```

A card in a sidebar stays compact; the same card in main content expands. No viewport hacks.

### Optical Adjustments

- Text at `margin-left: 0` looks indented — pull `-0.05em`.
- Geometrically centered icons aren't optically centered. Play icons shift right; arrows shift toward direction.
- Touch targets: min 44×44px even when visual is smaller — use padding or pseudo-element to expand.

### Depth & Elevation

- **Semantic z-index scale**: `dropdown (100) → sticky (200) → modal-backdrop (300) → modal (400) → toast (500) → tooltip (600)`. No `z-index: 9999` magic numbers.
- **Shadows are subtle**. If you can clearly see one, it's too strong. Build a small elevation scale: sm / md / lg / xl.

### Alpha-Specific Layout Cues

- Floating nav shells with rounded corners.
- Layered media with refined shadows.
- Editorial asymmetry on marketing surfaces.
- Quiet, denser, systematized app surfaces.
- Generous breathing room — never cramped.

---

## 6. Motion

### Duration: 100 / 300 / 500

| Time | Use | Examples |
|------|-----|----------|
| 100–150ms | Instant feedback | Button press, toggle, color shift |
| 200–300ms | State change | Menu, tooltip, hover |
| 300–500ms | Layout change | Accordion, modal, drawer |
| 500–800ms | Entrance | Page load, hero reveal |

Exits run at ~75% of entrance duration.

### Easing

**Don't use `ease`.** It's a compromise. Defaults:

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);   /* recommended default */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);
```

**No bounce. No elastic. No overshoot.** They feel tacky and amateurish, and they pull attention to the animation rather than the content. Real objects decelerate smoothly. This rule is non-negotiable on trust-critical Alpha surfaces (pricing, dates, forms, parent decision-making).

### What to Animate

Only **`transform` and `opacity`**. Everything else triggers layout. For accordions, animate `grid-template-rows: 0fr → 1fr`.

### Stagger

```html
<li style="--i: 0">…</li>
<li style="--i: 1">…</li>
```
```css
animation-delay: calc(var(--i, 0) * 50ms);
```

Cap total stagger at ~500ms. For long lists, reduce per-item delay or limit how many items animate.

### Reduced Motion (mandatory)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Or substitute crossfades for spatial movement. Functional animation (progress bars, focus indicators, slow-spinning loaders) should still work — just kill the spatial movement. Vestibular disorders affect ~35% of adults over 40.

### Perceived Performance

- 80ms threshold — under this, feels instant.
- Skeleton screens > spinners — preview content shape.
- Optimistic UI for low-stakes actions (likes, follows). **Never for payments or destructive actions.**
- Ease-in toward task completion makes it *feel* faster (peak-end effect).
- Some operations (search, analysis) can feel *too* fast — a brief delay signals "real work."

### Performance

- No preemptive `will-change`. Only on `:hover` or `.animating`.
- Scroll triggers → Intersection Observer, not scroll events. Unobserve after first run.

### Alpha-Specific Motion

- Smooth fades, y-translates, subtle stagger, deliberate CTA emphasis.
- Motion guides attention; never performs for itself.
- Subdued loops. No animation competing with pricing, dates, forms, or trust signals.

---

## 7. Interaction

### The Eight Interactive States

Every interactive element designs for: **default, hover, focus, active, disabled, loading, error, success.** Hover and focus are different — keyboard users never see hover.

### Focus Rings

```css
button:focus { outline: none; }
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

- 2–3px thick, **outside** the element, ≥3:1 contrast against neighbors.
- Consistent across all interactive elements.
- **Never `outline: none` without replacement** — accessibility violation.

### Forms

- **Always use `<label>`**. Placeholders are not labels — they vanish on input.
- Validate **on blur**, not every keystroke (exception: password strength meters).
- Errors **below** the field, connected via `aria-describedby`.
- Show format with placeholders, not paragraph instructions ("MM/DD/YYYY" inside the field).
- Crisp, legible, emotionally calm — Alpha forms are not loud.

### Loading

- Skeleton screens beat spinners.
- Optimistic UI for low-stakes; pessimistic for payment/destructive.

### Modals

- Use native `<dialog>` and `dialog.showModal()` — focus trap and Escape handling are free.
- For background, use the `inert` attribute, not z-index hacks.

### Popover & Anchor Positioning

For tooltips, dropdowns, menus — use the **Popover API + CSS Anchor Positioning**:

```html
<button popovertarget="menu">Open</button>
<div id="menu" popover>…</div>
```

```css
.trigger { anchor-name: --menu-trigger; }
.dropdown {
  position: fixed;
  position-anchor: --menu-trigger;
  position-area: block-end span-inline-end;
}
@position-try --flip-above {
  position-area: block-start span-inline-end;
}
```

Popovers render in the **top layer** — escape `overflow: hidden` and z-index wars automatically. For Firefox/Safari, fall back to a portal (`createPortal` / `<Teleport>`) + `position: fixed` with `getBoundingClientRect()` math.

**Anti-patterns**: `position: absolute` inside `overflow: hidden` (clipped), arbitrary `z-index: 9999`, inline dropdown markup with no escape from parent stacking context.

### Destructive Actions

**Undo > confirm.** Confirmation dialogs are clicked through mindlessly. Pattern: remove from UI immediately, show undo toast, actually delete after toast expires.

Confirm only for: account deletion, irreversible high-cost actions, batch operations. When you do confirm: name the action ("Delete project"), explain consequences ("This can't be undone"), label buttons specifically ("Delete project" / "Keep project").

### Keyboard Patterns

- **Roving tabindex** for tab/menu/radio groups: one item is `tabindex="0"`, arrows move within, Tab moves to next component.
- **Skip links** for keyboard users to bypass nav.

### Gesture Discoverability

Swipes are invisible. Hint with a partial reveal, coach mark on first use, or always provide a visible alternative. Never gesture-only.

### Alpha-Specific Interaction

- Make next steps obvious in enrollment, checkout, account flows.
- Use summary panels, trust cues, contextual helper copy where parents need confidence.
- Don't make every CTA primary. Don't make every surface equally loud.
- Don't hide pricing, dates, policy, or availability behind weak affordances.

---

## 8. Responsive

### Mobile-First

Base styles for mobile, layer up with `min-width`. Desktop-first means mobile loads styles it doesn't need.

### Content-Driven Breakpoints

Don't chase devices. Start narrow, stretch until the design breaks, add breakpoint there. **640 / 768 / 1024** covers most. `clamp()` for fluid values where breakpoints aren't justified.

### Detect Input, Not Just Size

```css
@media (pointer: coarse) { .button { padding: 12px 20px; } }
@media (hover: hover)    { .card:hover { transform: translateY(-2px); } }
@media (hover: none)     { /* No hover state — use :active */ }
```

A laptop with a touchscreen exists. Never rely on hover for functionality.

### Safe Areas

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.footer { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
```

### Responsive Images

```html
<img src="hero-800.jpg"
     srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
     sizes="(max-width: 768px) 100vw, 50vw"
     alt="…">
```

For different crops (not just sizes), use `<picture>` with `<source media="…">`.

### Patterns

- Nav: hamburger drawer (mobile) → horizontal compact (tablet) → full labels (desktop).
- Tables: collapse to cards on mobile via `display: block` + `data-label` attributes.
- Progressive disclosure with `<details>` / `<summary>` for content that compresses.

### Alpha-Specific Responsive

- **Adapt composition, not just scale.** Don't squeeze a premium layout into a cramped mobile stack.
- Preserve trust signals (pricing, dates, policy, social proof) on mobile.
- Sticky CTAs purposeful and non-intrusive — never blocking content.

### Testing

DevTools emulation misses real touch, real CPU/memory, real network, real font rendering, real browser chrome. Test on at least one real iPhone, one real Android, a tablet if relevant. Cheap Android phones reveal performance issues simulators hide.

---

## 9. UX Writing

### Voice & Tone

**Voice is consistent. Tone shifts.**

Voice (always Alpha): direct, calm, confident, warm. Speaks to parents as capable decision-makers.

Tone:

| Moment | Tone |
|---|---|
| Success | Celebratory, brief — "Done. Your changes are live." |
| Error | Empathetic, helpful — "That didn't work. Here's what to try…" |
| Loading | Reassuring, specific — "Saving your draft…" |
| Destructive confirm | Serious, clear — "Delete this project? This can't be undone." |

**Never use humor for errors.** Users are already frustrated. Be helpful.

### Button Labels

Verb + object. Never "OK", "Submit", "Yes/No", "Click here".

| Bad | Good |
|---|---|
| OK | Save changes |
| Submit | Create account |
| Yes | Delete message |
| Cancel (in destructive flow) | Keep editing |

For destructive actions: name the destruction. "Delete 5 items" — show the count.

### Error Formula

Every error answers: **(1) what happened, (2) why, (3) how to fix.**

| Situation | Template |
|---|---|
| Format | "[Field] needs to be [format]. Example: [example]." |
| Missing required | "Please enter [what's missing]." |
| Permission | "You don't have access to [thing]. [Alternative]." |
| Network | "We couldn't reach [thing]. Check your connection and [action]." |
| Server | "Something went wrong on our end. We're looking into it. [Alternative]." |

Never blame the user. "Please enter a date as MM/DD/YYYY" not "You entered an invalid date."

### Empty States Are Onboarding

(1) Acknowledge briefly. (2) Explain the value of filling. (3) Provide a clear action.

> "No registrations yet. Add your first child to start enrollment."

Not "No items."

### Accessibility in Copy

- **Link text has standalone meaning.** "View pricing plans," not "Click here."
- **Alt text describes information**, not the image. "Revenue grew 40% in Q4," not "Chart."
- `alt=""` for purely decorative images.
- **Icon buttons need `aria-label`.**

### Translation

- German is +30%, French +20%, Finnish +30–40%. Allocate space.
- Keep numbers separate: "New messages: 3" not "You have 3 new messages."
- Full sentences as single strings — word order varies by language.
- No abbreviations: "5 minutes ago" not "5 mins ago."

### Consistency

Pick one term per concept. Build a glossary. Enforce it.

| Inconsistent | Consistent |
|---|---|
| Delete / Remove / Trash | Delete |
| Settings / Preferences / Options | Settings |
| Sign in / Log in / Enter | Sign in |
| Create / Add / New | Create |

### Redundancy

If the heading explains it, drop the intro. If the button is clear, don't restate. Say it once, say it well. Don't repeat what the user can already see.

### Alpha-Specific Copy

- Confident clarity, human warmth.
- Translate Alpha claims into **proof, next steps, concrete outcomes** — not vague superlatives.
- No startup filler, generic empowerment, or "AI-speak."
- Make every word earn its place.

---

## 10. Anti-Patterns (the "Alpha Slop" list)

If a parent would call any of these out on sight, the design has failed.

**Visual**

- Generic AI gradients (purple→cyan), neon dark mode, glow-heavy glass.
- Gradient text.
- Nested cards, card soups, default icon-card grids.
- Decorative glass, side-border accents, glows used as generic polish.
- Cool gray text on colored backgrounds.
- Pure black `#000` or pure gray `oklch(50% 0 0)` for large areas.
- System-font-only on flagship marketing pages — loses Alpha's editorial feel.
- Anonymous SaaS rectangles, stock "AI dashboard" aesthetics.
- Childish camp graphics on flagship surfaces (only acceptable in explicit local/seasonal variants).
- Hard-coded one-off colors when Alpha tokens exist.

**Motion**

- Bounce, elastic, overshoot easing.
- Animation that competes with pricing, dates, forms, or parent decision-making.
- Animating `width`, `height`, `top`, `left` instead of `transform`.
- Ignoring `prefers-reduced-motion`.
- Animation as a cover for slow loading.

**Interaction**

- `outline: none` without a focus replacement.
- Placeholder used as label.
- Touch targets under 44×44px.
- Hover-only functionality.
- Confirmation dialogs where undo would be better.
- Hidden pricing, dates, policy, availability.
- Every CTA equally primary.

**Copy**

- "OK", "Submit", "Yes/No", "Click here".
- "Something went wrong" with no recovery.
- Blaming the user.
- Buzzwords, hollow inspiration, generic AI language.
- Repeating headings with filler paragraphs.

**System**

- Marketing pages that feel unrelated to the dashboard.
- Local campaign variants drifting so far they stop reading as Alpha.
- Inventing new tokens when Alpha tokens already exist.

---

## 11. The Alpha Slop Test

Before shipping, ask in this order:

1. **Would a parent trust this experience with their child and money?**
2. Does this feel like Alpha — not generic SaaS, not generic summer camp?
3. Do marketing and authenticated surfaces feel like one brand family?
4. Would someone call out obvious AI tropes on sight?

If any answer is "no" or "maybe," iterate before shipping.

---

## 12. Implementation Heuristics

### Match Complexity to Surface

- **Flagship marketing**: rich composition, stronger typography, immersive media, more motion.
- **Dashboard / account**: quiet, tokenized, highly legible, less motion.
- **Campaign variants**: preserve Alpha DNA; adjust tone within bounds.

### Build on Existing Tokens First

Always check for existing Alpha tokens, colors, assets, and UI primitives before inventing new ones. If a sub-brand truly needs deviation, **make it explicit and bounded** — document why and where.

### The Goal

Not maximal decoration. **Alpha-level trust, polish, and clarity, with a distinct point of view.**

---

## 13. Quick Reference: Checklist Before Shipping

- [ ] Surface type identified (flagship / app / campaign) and matched
- [ ] Palette uses Alpha anchors or harmonized OKLCH derivatives — no rogue colors
- [ ] Tinted neutrals everywhere — no pure gray or pure black
- [ ] Type scale ≤5 sizes, ≥1.25 ratio, body fixed-rem ≥16px
- [ ] Spacing on 4pt grid, named semantically
- [ ] Hierarchy uses 2–3 dimensions per level, passes the squint test
- [ ] No nested cards. Cards used only where genuinely needed
- [ ] All eight interactive states designed
- [ ] `:focus-visible` rings present, ≥3:1 contrast
- [ ] Forms: real `<label>`s, blur-validation, errors below with `aria-describedby`
- [ ] Motion uses transform/opacity only, polished easing, no bounce
- [ ] `prefers-reduced-motion` handled
- [ ] WCAG AA contrast verified (including placeholder)
- [ ] Mobile preserves trust signals; layout adapts, doesn't just shrink
- [ ] Touch targets ≥44×44px; `pointer: coarse` accommodated
- [ ] Buttons say what they do; errors say how to fix
- [ ] No AI-slop tropes (gradient text, neon dark, generic glass, etc.)
- [ ] Alpha Slop Test passed
