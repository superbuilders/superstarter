---
alwaysApply: true
---

# No Arrow Functions

Use named function declarations instead of arrow functions. This is enforced by the `no-arrow-functions.grit` rule.

## Why

1. **Stack traces** - Named functions appear in error stack traces; arrow functions show as `<anonymous>`
2. **Hoisting** - Function declarations are hoisted; arrow functions assigned to variables are not
3. **Self-documenting** - The function name describes intent at the definition site
4. **Consistency** - One way to define functions across the codebase

## The Rule

```typescript
// BAD: Arrow function
const processUser = (user: User) => {
  validate(user)
  return save(user)
}

// GOOD: Named function declaration
function processUser(user: User) {
  validate(user)
  return save(user)
}
```

## Fix Patterns

### 1. Top-Level Functions

```typescript
// BAD
const fetchData = async (id: string) => {
  const response = await api.get(id)
  return response.data
}

// GOOD
async function fetchData(id: string) {
  const response = await api.get(id)
  return response.data
}
```

### 2. Callbacks (Inline)

For simple inline callbacks, arrow functions are acceptable when they're short and the context is clear:

```typescript
// ACCEPTABLE: Simple inline callback
items.map((item) => item.id)
items.filter((x) => x.active)

// BETTER for complex callbacks: Extract to named function
function extractActiveIds(items: Item[]): string[] {
  function isActive(item: Item): boolean {
    return item.status === "active" && !item.deleted
  }

  function getId(item: Item): string {
    return item.id
  }

  return items.filter(isActive).map(getId)
}
```

### 3. React Components

```typescript
// BAD
const UserCard = ({ user }: Props) => {
  return <div>{user.name}</div>
}

// GOOD
function UserCard({ user }: Props) {
  return <div>{user.name}</div>
}
```

### 4. Event Handlers

```typescript
// BAD
const handleClick = (e: MouseEvent) => {
  e.preventDefault()
  submit()
}

// GOOD
function handleClick(e: MouseEvent) {
  e.preventDefault()
  submit()
}
```

### 5. Hooks

```typescript
// BAD
const useCustomHook = () => {
  const [state, setState] = useState(null)
  return { state, setState }
}

// GOOD
function useCustomHook() {
  const [state, setState] = useState(null)
  return { state, setState }
}
```

## Exceptions

Short inline callbacks in array methods are tolerated when:
- They fit on one line
- They perform a simple transformation or filter
- The intent is immediately clear

```typescript
// These are fine
users.map((u) => u.id)
items.filter((i) => i.active)
values.reduce((sum, v) => sum + v, 0)
```

## Summary

1. Use `function` declarations for all named functions
2. Arrow functions are tolerated only for trivial inline callbacks
3. Extract complex callbacks into named functions
4. React components must use function declarations
