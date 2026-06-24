---
alwaysApply: true
---

# No Inline Styles

The `style={{}}` prop is banned. Use Tailwind classes for everything.

## Why

CSS is dead. Tailwind handles all styling. Inline styles:
1. Break the single-paradigm approach
2. Require `as React.CSSProperties` type assertions
3. Don't work with Tailwind modifiers (hover, responsive, etc.)
4. Create inconsistent patterns

## How to Fix

### CSS Variables → Tailwind Arbitrary Properties

```tsx
// ❌ BANNED
<div style={{ "--subject-color": `var(--color-${color})` }}>

// ✅ CORRECT
<div className={`[--subject-color:var(--color-${color})]`}>
```

### Multiple Variables

```tsx
// ❌ BANNED
const style = {
  "--subject-color": `var(--color-${color})`,
  "--subject-shadow": `color-mix(...)`
} as React.CSSProperties
<div style={style}>

// ✅ CORRECT
<div className={`[--subject-color:var(--color-${color})] [--subject-shadow:color-mix(...)]`}>
```

Or better - let CSS derive the shadow from the base color (already in globals.css).

### Dynamic Dimensions

```tsx
// ❌ BANNED
<div style={{ width: `${percent}%` }}>

// ✅ CORRECT
<div className={`w-[${percent}%]`}>
```

### Font Families

```tsx
// ❌ BANNED
<div style={{ fontFamily: '"Comic Sans", serif' }}>

// ✅ CORRECT
<div className="font-['Comic_Sans',serif]">
```

Or define in Tailwind config and use `font-comic`.

## No Exceptions

There are no exceptions. Every use case has a Tailwind solution.
