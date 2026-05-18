# Alpha Brand Reference

This reference captures the Alpha design language derived from the reviewed Alpha Summer frontend, content files, brand assets, and local design notes.

## Source Review

The following sources informed this skill:

- Local design context in `.alpha-style.md` from the Alpha Summer app
- Shared tokens in `tailwind.config.ts` and `src/app/globals.css`
- Marketing surfaces in `src/app/summer-camp/*`
- Localized campaign surface in `src/app/hamptons/*`
- Shared app/dashboard UI in `src/app/components/ui/*`, `src/app/dashboard/*`, and authenticated routes
- Supporting brand/content docs in `public/alpha-summer.md` and `public/hamptons.md`

One mismatch from the review is important: there was no root `/_docs` folder in the reviewed project checkout. The effective style guide lived in `.alpha-style.md`, the frontend source, and the content markdown files.

## Brand Core

### Users

- Parents evaluating whether Alpha is right for their child
- Parents actively enrolling in or managing registrations for Alpha programs
- Staff/operators managing camp inventory, pricing, registrations, and family records

### Brand Personality

- Confident
- Premium
- Human

### Emotional Goal

Make high-stakes family decisions feel clear, credible, and supported.

## Visual Systems Already Present In Alpha

### 1. Shared App Shell

Used in account, registration, and dashboard surfaces.

- Restrained token system
- Quiet white and near-white surfaces
- Minimal shadows
- Brand blue used as an accent, not a background color everywhere
- Straightforward utility components and information density

### 2. Flagship Summer Marketing

Used in the main Alpha Summer pages.

- Light-first editorial art direction
- Inter plus Playfair-style serif contrast
- Deep indigo and cobalt accents
- Lavender-tinted backgrounds and borders
- Floating nav shells and rounded layered cards
- Purposeful reveal animations and polished media framing

### 3. Local Campaign Variant

Used in the Hamptons pages.

- Warmer, sunnier, more lifestyle-driven tone
- Photo-forward compositions and seasonal accents
- Playful secondary font usage

This is a bounded variant, not the default Alpha expression.

## Palette

Prefer these Alpha tones unless the product already defines a tighter token system:

- `#1e00ff` Alpha cobalt
- `#0D0050` deep indigo
- `#110068` secondary indigo
- `#4F46E5` vivid mid-blue
- `#06B6D4` sky accent
- `#A5B4FC` pale accent
- `#F5F4FB` light lavender background
- `#E5E3F5` lavender border

Quiet surfaces should use tinted neutrals instead of flat gray whenever possible.

## Typography

- Clean sans for body and UI controls
- Editorial serif for emphasis, pull quotes, or headline moments on marketing pages
- Dashboard and form surfaces can be simpler, but should still feel related to marketing
- Large display sizes should feel tight and intentional, not oversized for drama alone

## Layout And Components

- Rounded nav shells, buttons, and panels are part of the Alpha language
- Marketing surfaces benefit from asymmetry, layered media, and breathing room
- Dashboard/account surfaces should be denser and more operational, but still polished
- Avoid repetitive icon-card grids when a stronger composition is available

## Motion

- Favor smooth fades, y-translates, subtle stagger, and purposeful CTA emphasis
- Motion should guide attention, not perform for its own sake
- Reduced motion support matters on trust-critical surfaces

## Copy Principles

- Be direct, calm, and confident
- Convert abstract claims into proof and next steps
- Speak to parents as capable decision-makers
- Avoid buzzwords, generic AI language, and hollow inspiration

## Anti-Patterns To Avoid

- Generic AI gradients, neon dark mode, or glow-heavy glass effects
- Nested cards, card soups, or off-the-shelf SaaS section layouts
- Gray text on brand-colored backgrounds
- Overly campy kid-focused visuals on flagship Alpha pages
- Marketing pages that feel unrelated to the dashboard/account experience
- Hard-coded one-off colors when Alpha tokens already exist
- System-font-only flagship pages that lose Alpha's editorial polish

## Practical Guidance

- Default to flagship Alpha, not the Hamptons variant
- Use local campaign energy only when the product explicitly calls for it
- When in doubt, prioritize clarity and trust over novelty
