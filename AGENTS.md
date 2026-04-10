# Codex Project Orchestrator

This repository uses Codex with a router pattern:
- `AGENTS.md` defines the global operating rules.
- `.codex/skills/*/SKILL.md` defines specialist capabilities.
- Codex should prefer the narrowest skill that matches the task.
- If a task spans multiple domains, Codex should sequence specialists instead of mixing responsibilities loosely.
- The global skill `napkin` ([blader/napkin](https://github.com/blader/napkin)) maintains per-repo learnings in `.claude/napkin.md` across sessions; use it alongside the specialists below.
- The global skill `interface-design` ([Dammyjay93/interface-design](https://github.com/Dammyjay93/interface-design)) guides intentional UI for dashboards, admin panels, and internal tools; pair it with `frontend-specialist` when building or refactoring those surfaces.

## Author

Public starter kit organized by **Leandro Santos**
Website: **https://leandrosantos.net.br**

## Persistent memory (Napkin)

Always follow the **`napkin`** skill when it is installed globally (for example under `~/.codex/skills/napkin` or `~/.claude/skills/napkin`):

- **Session start:** read `.claude/napkin.md` at the repository root if it exists; if it does not exist, create and structure it per the `napkin` skill instructions.
- **During work:** record mistakes (agent and user), corrections, tool or environment surprises, preferences, and approaches that worked—incrementally, not only at the end.
- **Scope:** this complements specialist routing; it does not replace `project-planner`, `frontend-specialist`, `backend-specialist`, or other specialists.

## Routing rules

### 1) Planning and discovery
Use `project-planner` first when:
- the request is broad, greenfield, or multi-step
- the team needs a task plan, folder structure, or dependency graph
- the work needs specialist assignment before implementation

Use `code-archaeologist` first when:
- the codebase is unfamiliar
- the request mentions legacy code, refactor, brownfield, reverse engineering, or hidden coupling
- the change would be risky without understanding the current behavior

### 2) Product and interface work
Use `frontend-specialist` for:
- React, Next.js, components, Tailwind, responsive UI, accessibility, web UI bugs
- **Dashboards, admin panels, and internal tools** (data tables, filters, forms, workflows)—implementation, wiring, and UI behavior in code

Use `interface-design` (global skill; [Dammyjay93/interface-design](https://github.com/Dammyjay93/interface-design)) when:
- the work is a **dashboard, admin panel, or internal tool** and you need **intentional** layout, hierarchy, density, and consistency—not generic “AI template” UI
- you should establish or follow project UI direction (for example `.interface-design/system.md`) before or while implementing
- use **together with** `frontend-specialist`: `interface-design` for craft and patterns; `frontend-specialist` for stack-specific implementation

Use `mobile-developer` for:
- React Native, Expo, Flutter, iOS, Android, mobile UX, offline flows, device capabilities

Use `designer-specialist` for:
- visual hierarchy, spacing, typography, CTA visibility, layout cleanup, responsive polish

Use `marketing-specialist` for:
- landing page copy, positioning, CTA improvements, benefit framing, proof sections, message clarity

Use `ptbr-language-reviewer` for:
- PT-BR microcopy, grammar, UX writing, UI labels, landing page review, tone consistency

### 3) Search and discoverability
Use `seo-specialist` for:
- technical SEO, schema, metadata, sitemap, robots, Core Web Vitals from search perspective, GEO/AI visibility

### 4) Application and data work
Use `backend-specialist` for:
- API design, auth, services, integrations, queues, validation, server-side debugging

Use `database-architect` for:
- schema design, migrations, indexing, SQL review, query optimization, vector search

### 5) Quality, security, and reliability
Use `qa-automation-engineer` for:
- Playwright/Cypress, E2E coverage, CI test flows, regression suites, flaky test reduction

Use `security-auditor` for:
- auth review, vulnerability assessment, OWASP-aligned audits, supply-chain review, hardening

Use `performance-optimizer` for:
- profiling, Lighthouse, bundle size, rendering cost, memory, Core Web Vitals optimization

Use `devops-engineer` for:
- deployment, CI/CD, production issues, rollback, server config, env validation

### 6) Explicit documentation requests only
Use `documentation-writer` only when the task explicitly asks for:
- README
- changelog
- ADR
- onboarding docs
- API docs
- code comments or user-facing documentation

## Collaboration order

When a task crosses domains, use this sequence:
0. **`napkin`:** keep `.claude/napkin.md` loaded at the start and updated as the session progresses (see **Persistent memory (Napkin)** above).
1. `project-planner` for broad or new work
2. `code-archaeologist` for understanding existing systems
3. implementation specialist (`frontend-specialist`, `mobile-developer`, `backend-specialist`, `database-architect`, `devops-engineer`)
4. **`interface-design`** for dashboards, admin panels, and internal tools when UI craft and consistency matter—typically **alongside** `frontend-specialist` (not instead of it)
5. `designer-specialist` and/or `marketing-specialist` for UX and messaging refinement
6. `ptbr-language-reviewer` for PT-BR review
7. `seo-specialist` for discoverability checks
8. `security-auditor` for hardening or risk review when relevant
9. `qa-automation-engineer` for regression safety nets
10. `performance-optimizer` for validation and optimization
11. `documentation-writer` only if documentation is requested

## Operating constraints

- Never start with a broad rewrite when a surgical change is possible.
- Preserve project conventions unless the task explicitly requests restructuring.
- Ask before destructive production actions.
- Run relevant validation after edits whenever the stack supports it.
- Prefer minimal, reviewable diffs.
- Mark assumptions explicitly.
- If the task is complex, plan first.

## Definitions of done

A task is only complete when all applicable items are satisfied:
- implementation matches the requested scope
- no obvious regressions were introduced
- lint/type/test/build checks were run when relevant
- user-visible copy is reviewed when changed
- security, SEO, and performance checks are applied when relevant
- the response explains what changed, where, and why

## Documentation and Examples
- Examples live in `docs/agents-examples.md`
- Multi-specialist flows live in `docs/recommended-workflows.md`
- Public setup instructions live in `docs/setup-guide.md`
