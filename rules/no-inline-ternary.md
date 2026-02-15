---
alwaysApply: true
---

# No Inline Ternary

Ternary expressions are banned except when directly assigned to a `const` or `let` variable, or used directly in a `return` statement.

## Why

Ternaries hide branching logic inside expressions. When inlined into returns, JSX, or function arguments, they:

1. **Hide intent** - The reader must mentally evaluate the condition to understand what value is being used
2. **Encourage nesting** - One inline ternary invites another, creating unreadable chains
3. **Lack semantic names** - `isLocked ? "text-hare" : "text-eel"` doesn't tell you this is the "text color"

Named variables force you to document intent:

```typescript
// ❌ What is this? Have to read the whole expression
className={cn("flex", isLocked ? "text-hare" : "text-eel")}

// ✅ Clear: it's the text color based on lock state
const textColor = isLocked ? "text-hare" : "text-eel"
className={cn("flex", textColor)}
```

## Allowed

Ternaries that immediately assign to a variable or are directly returned:

```typescript
const accuracy = totalAnswered > 0 ? (correct / totalAnswered) * 100 : 0
const statusColor = isCompleted ? "bg-owl" : "bg-hare"
const icon = passed ? <Trophy /> : <Star />
let result = condition ? valueA : valueB
return accuracy >= 80 ? 1 : 0
```

## Banned

Ternaries used as expressions anywhere else:

### JSX Attributes

```typescript
// ❌ BANNED
className={cn("flex", isLocked ? "text-hare" : "text-eel")}

// ✅ FIX
const textColor = isLocked ? "text-hare" : "text-eel"
// ...
className={cn("flex", textColor)}
```

### JSX Children

```typescript
// ❌ BANNED
{passed ? <Trophy /> : <Star />}

// ✅ FIX
const ResultIcon = passed ? <Trophy /> : <Star />
// ...
{ResultIcon}
```

### Function Arguments

```typescript
// ❌ BANNED
foo(condition ? a : b)

// ✅ FIX
const value = condition ? a : b
foo(value)
```

### Object Properties

```typescript
// ❌ BANNED
{ prop: condition ? a : b }

// ✅ FIX
const propValue = condition ? a : b
{ prop: propValue }
```

## Edge Cases

### Chained Assignment is Allowed

```typescript
// ✅ This is fine - it's still a direct assignment
const x = a ? b : c ? d : e  // Though noNestedTernary may ban this
```

### IIFE Workaround is Not Allowed

```typescript
// ❌ Don't try to work around with IIFE
const x = (() => condition ? a : b)()

// ✅ Just use the ternary directly
const x = condition ? a : b
```

## Summary

| Context | Allowed? |
|---------|----------|
| `const x = a ? b : c` | ✅ Yes |
| `let x = a ? b : c` | ✅ Yes |
| `return a ? b : c` | ✅ Yes |
| `fn(a ? b : c)` | ❌ No - extract to const |
| `{ prop: a ? b : c }` | ❌ No - extract to const |
| `[a ? b : c]` | ❌ No - extract to const |
| JSX `{a ? <B/> : <C/>}` | ❌ No - extract to const |
| JSX `attr={a ? b : c}` | ❌ No - extract to const |
