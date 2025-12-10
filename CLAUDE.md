# WorkTime - AI Assistant Guidelines

## Project Overview

A React + TypeScript time tracking web app using Firebase, Tailwind CSS, and Vite.

## Code Philosophy

### 1. Clean Code

- Write self-documenting code with meaningful names
- Keep functions small and focused (single responsibility)
- Avoid deep nesting; prefer early returns
- No magic numbers/strings; use named constants
- DRY (Don't Repeat Yourself) - extract common patterns

### 2. Architecture

- **Business logic in services** (`src/services/`), not in components
- **Feature folders** for services (e.g., `balance/`, `schedule/`, `scroll/`)
- **Components are presentational**: receive props, render UI, emit events
- **Custom hooks** for reusable stateful logic
- **Pure functions** are preferred - easier to test and reason about

### 3. Test-Driven Development (TDD)

When doing TDD:

1. Write tests first, before implementing the real code
2. Run tests to confirm they fail
3. Implement the minimum code to make tests pass
4. Refactor if needed
5. Run tests again to confirm they still pass

General testing guidelines:

- Keep tests focused and fast
- Pure functions in services are easier to test
- Tests live in `tests/` mirroring `src/` structure

### 4. React Best Practices (These Take Precedence)

- Functional components with hooks (no class components)
- Separate container logic from presentational components
- Keep components small and focused
- Lift state up only when necessary
- Use TypeScript strictly (avoid `any`)
- Props over context for explicit dependencies (when practical)

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level components
├── services/       # Business logic (feature folders)
│   ├── auth/
│   ├── balance/
│   ├── scroll/
│   └── ...
└── types/          # TypeScript types

tests/
└── services/       # Mirrors src/services structure
```

## Commands

- **Dev server**: `npm run dev`
- **Run all tests**: `npm test`
- **Run specific tests**: `npm test -- --testPathPattern="<pattern>"`
- **Build**: `npm run build`
- **Lint**: `npm run lint`

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Firebase (auth + Firestore)
- Jest (testing)

## Git Workflow

- Show commit message drafts before committing
- Use semantic commit messages (feat:, fix:, refactor:, etc.)
- Don't push or create PRs without explicit approval
