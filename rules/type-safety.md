---
globs: *.ts
alwaysApply: false
---
### Type Safety

#### ⚠️ CRITICAL: Strict Type Safety Requirements

NEVER use explicit `any` or implicit `any` types. Always create proper interfaces or type definitions, even for complex objects. Do not bypass TypeScript errors with comments or flags; fix the underlying issue. When working with external libraries that have complex types, import and use those types directly. NEVER use the `as` keyword for type assertions; it is an unsafe typecast that bypasses TypeScript's type checker. Prefer runtime validation with Zod to ensure type safety without compromising runtime integrity.