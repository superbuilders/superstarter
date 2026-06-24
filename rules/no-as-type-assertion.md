---
globs: *.ts
alwaysApply: false
---
### No `as` Type Assertions

The `as` keyword for type assertions is disallowed because it bypasses TypeScript's type checker, creating unsafe typecasts that can hide bugs.

**Allowed exceptions:**
- `as const` for const assertions
- Assertions to browser/DOM types (e.g., `as HTMLElement`, `as MouseEvent`)

**Instead of `as`, prefer:**
- Runtime validation with Zod schemas
- Type guards and type narrowing
- Proper generic type parameters

See also: [Type Safety](type-safety.md)
