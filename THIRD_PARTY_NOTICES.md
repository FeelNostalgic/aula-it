# Third-Party Notices

The MIT License in [`LICENSE`](LICENSE) covers the **Aula IT application source code only**.

It does **not** cover the third-party agent skills vendored in this repository under
`.agent/`, `.agents/` and `.claude/`. Those directories contain material authored by third
parties and redistributed here under their own terms. This file records what those terms are.

---

## Vendored agent skills

Each skill appears in three identical copies (`.agent/`, `.agents/`, `.claude/`) kept in
sync by `scripts/sync-agents.ps1`. The `skills-lock.json` file records the upstream source
and content hash of each one.

### Apache License 2.0 — 9 skills

Redistributed under the Apache License, Version 2.0. A copy of the license is included at
[`licenses/Apache-2.0.txt`](licenses/Apache-2.0.txt). These works are provided on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

| Skill | Upstream |
|---|---|
| `conventional-commits` | local |
| `nextjs-16` | local |
| `playwright` | local |
| `react-19` | local |
| `skill-creator` | local |
| `tailwind-4` | local |
| `typescript` | local |
| `zod-4` | local |
| `zustand-5` | local |

### MIT License — 13 skills

Redistributed under the MIT License. The full text is reproduced in the root [`LICENSE`](LICENSE)
file; the copyright notice of each original work remains in its `SKILL.md` header.

| Skill | Upstream |
|---|---|
| `sdd-apply` | local |
| `sdd-archive` | local |
| `sdd-design` | local |
| `sdd-explore` | local |
| `sdd-init` | local |
| `sdd-propose` | local |
| `sdd-spec` | local |
| `sdd-tasks` | local |
| `sdd-verify` | local |
| `supabase-postgres-best-practices` | `supabase/agent-skills` (github) |
| `vercel-composition-patterns` | `vercel-labs/agent-skills` (github) |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` (github) |
| `web-design-guidelines` | `vercel-labs/agent-skills` (github) |

### Unresolved — 2 skills

These two are **not clearly licensed** and require attention before this repository is
redistributed further:

- **`frontend-design`** — its `SKILL.md` header declares
  `license: Complete terms in LICENSE.txt`, but **no `LICENSE.txt` is vendored** in the
  repository, so the referenced terms cannot be located. The upstream source must be
  identified and the license file added, or the skill must be removed.
- **`josechifflet-shadcn-ui`** — its `SKILL.md` header declares **no license at all**.
  Under default copyright, an unlicensed work is not redistributable.

### Agent personas — 9 files

The files in `.agents/agents/`, `.claude/agents/` and `.agent/agents/` (`architect-reviewer`,
`code-improver`, `devops-engineer`, `documentation-engineer`, `e2e-test-architect`,
`nextjs-developer`, `react-specialist`, `test-automator`, `typescript-pro`) declare no
license and are treated as project-authored work covered by the root MIT License.

---

## Runtime dependencies

The application depends on packages distributed under permissive open source licenses
(MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause and others). These are not vendored
into this repository; they are installed from the npm registry and remain under the terms
of their respective authors. Run `npx license-checker --summary` for a full inventory of
the transitive dependency tree.

Notable direct dependencies and their licenses:

| Package | License |
|---|---|
| `next`, `react`, `react-dom` | MIT |
| `@supabase/supabase-js`, `@supabase/ssr` | MIT |
| `tailwindcss` | MIT |
| `zod` | MIT |
| `zustand` | MIT |
| `@xyflow/react` | MIT |
| `framer-motion` | MIT |
| `gsap` | GreenSock Standard (no-charge) License |
| `recharts` | MIT |
| `jspdf` | MIT |
| `googleapis` | Apache-2.0 |
| `katex` | MIT |
| `highlight.js` | BSD-3-Clause |
| `@playwright/test` | Apache-2.0 |
| `vitest` | MIT |

Note: `gsap` and its related plugins are distributed under the
**GreenSock Standard "no charge" License**, which is not an OSI-approved open source
license. They are used unmodified as npm dependencies and are not vendored here. If you
intend to redistribute this repository, review that license against your intended use.

---

## Reporting a licensing problem

If you believe third-party material here is misattributed or improperly licensed, please
open an issue on the repository.
