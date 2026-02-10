---
alwaysApply: true
---

# No Object Module

The preferred unit of modularity is the ESM module, not classes or object literals. This is enforced by `super-lint.ts` rule `no-object-module`.

This rule catches three anti-patterns:
1. **Object namespaces** - objects containing only functions
2. **Object classes** - objects mixing functions and state
3. **Class definitions** - class declarations and expressions

All three should be converted to ESM modules with exported functions and module-level state.

## Why

1. **ESM modules are simpler** - Module-level state and exported functions achieve the same goals without OOP ceremony
2. **No `this` confusion** - Arrow functions in classes, binding issues, and `this` context bugs disappear
3. **Better tree-shaking** - Bundlers can eliminate unused exports; class methods are bundled together
4. **Functional composition** - Functions compose more naturally than class hierarchies
5. **Testability** - Pure functions are easier to test than stateful objects

## The Rule

### Object Namespace (functions only)

```typescript
// BAD: Object namespace
const utils = {
  formatDate: (d: Date) => d.toISOString(),
  parseDate: (s: string) => new Date(s),
}

// GOOD: ESM exports
export function formatDate(d: Date): string {
  return d.toISOString()
}

export function parseDate(s: string): Date {
  return new Date(s)
}
```

### Object Class (functions + state)

```typescript
// BAD: Object with functions and state
const counter = {
  count: 0,
  increment: () => { counter.count++ },
  getCount: () => counter.count,
}

// GOOD: ESM module with state
let count = 0

export function increment(): void {
  count++
}

export function getCount(): number {
  return count
}
```

### Class Definition

```typescript
// BAD: Class-based service
class UserService {
  #db: Database

  constructor(db: Database) {
    this.#db = db
  }

  async getUser(id: string): Promise<User> {
    return this.#db.query("SELECT * FROM users WHERE id = ?", [id])
  }
}

// GOOD: ESM module with exported functions
import { db } from "./database"

export async function getUser(id: string): Promise<User> {
  return db.query("SELECT * FROM users WHERE id = ?", [id])
}
```

## Converting to ESM Modules

### Instance State → Module State

```typescript
// BAD
class Counter {
  #count = 0
  increment() { this.#count++ }
  getCount() { return this.#count }
}

// GOOD
let count = 0

export function increment(): void {
  count++
}

export function getCount(): number {
  return count
}
```

### Constructor Dependencies → Module Imports

```typescript
// BAD
class EmailService {
  constructor(private smtp: SmtpClient) {}
  send(to: string, body: string) { return this.smtp.send(to, body) }
}

// GOOD
import { smtp } from "./smtp-client"

export function send(to: string, body: string): Promise<void> {
  return smtp.send(to, body)
}
```

### Private Methods → Unexported Functions

```typescript
// BAD
class Parser {
  parse(input: string) { return this.#buildAst(this.#tokenize(input)) }
  #tokenize(input: string) { /* ... */ }
  #buildAst(tokens: Token[]) { /* ... */ }
}

// GOOD
function tokenize(input: string): Token[] { /* ... */ }
function buildAst(tokens: Token[]): Ast { /* ... */ }

export function parse(input: string): Ast {
  return buildAst(tokenize(input))
}
```

### Multiple Instances → Factory Functions

```typescript
// BAD
class Logger {
  constructor(private prefix: string) {}
  log(msg: string) { console.log(`${this.prefix}: ${msg}`) }
}

// GOOD: Factory returning closure
export function createLogger(prefix: string) {
  function log(msg: string): void {
    console.log(`${prefix}: ${msg}`)
  }
  return { log }
}
```

## LRU Cache Example

```typescript
// BAD: Class-based cache
class LRUCache<K, V> {
  #entries = new Map<K, V>()
  #maxSize: number
  constructor(maxSize: number) { this.#maxSize = maxSize }
  get(key: K): V | undefined { /* ... */ }
  set(key: K, value: V): void { /* ... */ }
}

// GOOD: Module-based cache
interface CacheEntry<V> {
  value: V
  lastAccessed: number
}

const entries = new Map<string, CacheEntry<unknown>>()
let maxSize = 1000

export function configure(size: number): void {
  maxSize = size
}

export function get<V>(key: string): V | undefined {
  const entry = entries.get(key)
  if (!entry) return undefined
  entry.lastAccessed = Date.now()
  return entry.value as V
}

export function set<V>(key: string, value: V): void {
  if (entries.size >= maxSize) evictLRU()
  entries.set(key, { value, lastAccessed: Date.now() })
}

function evictLRU(): void {
  let oldest: string | undefined
  let oldestTime = Infinity
  for (const [key, entry] of entries) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed
      oldest = key
    }
  }
  if (oldest) entries.delete(oldest)
}
```

## Quick Reference

| You want... | Use instead... |
|-------------|----------------|
| Encapsulated state | Module-level variables (unexported) |
| Multiple instances | Factory function returning object |
| Inheritance | Function composition |
| Polymorphism | Union types + switch or function parameters |
| Constructor | Module initialization or factory function |
| Private methods | Unexported functions |

## Summary

1. No object namespaces - use ESM exports
2. No object classes - use ESM modules with module-level state
3. No class definitions - use ESM modules
4. Convert methods to exported functions
5. Convert private members to unexported functions/variables
6. Use factory functions if you need multiple "instances"
