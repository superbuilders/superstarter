---
alwaysApply: true
---

# No Inline Styles

The `style={{}}` prop is banned. Every style is a Tailwind class.

## Why

Tailwind handles all styling. Inline styles:

1. Break the single-paradigm approach
2. Require `as React.CSSProperties` type assertions
3. Don't work with Tailwind modifiers (hover, responsive, etc.)
4. Create inconsistent patterns

## Classes are whole in the source

Tailwind generates a class only when it reads the whole class in the source. A class assembled at runtime, such as `` `w-[${percent}%]` `` or `` `bg-${tone}` ``, never exists in the stylesheet. The style linter refuses an interpolation inside a class (`no-dynamic-class`) and a class expression typed as a plain `string` (`no-unverifiable-class`), because neither can be checked against the theme.

So state never flows into a class's text. Map each state to a complete class, or a complete class string:

```tsx
// BAD: the class is built at runtime and never generated
<div style={{ width: `${percent}%` }}>
<div className={`w-[${percent}%]`}>
<div className={`bg-${tone}`}>

// GOOD: a fixed class per state
<div className={wide ? "w-full" : "w-1/2"}>

// GOOD: a closed table, read through its literal types
const TONES = { calm: "bg-muted text-muted-foreground", alarm: "bg-destructive text-primary-foreground" } as const

<div className={TONES[tone]}>
```

A value that is truly continuous, such as a progress bar's width, belongs to a primitive that takes it as data (`<progress value={percent} max={100}>`), not to a class.

## Font families

```tsx
// BAD
<div style={{ fontFamily: '"Comic Sans", serif' }}>

// GOOD: a theme token in globals.css (`--font-comic`), used as a class
<div className="font-comic">
```

## No exceptions

Every use case has a Tailwind solution.
