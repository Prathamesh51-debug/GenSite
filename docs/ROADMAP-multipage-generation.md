# Roadmap — award-winning, industry-aware, multi-page generation

> ✅ **IMPLEMENTED (all 4 phases).** Path B (true multi-file + ZIP), multi-model routing
> across free models, two-step (brief → build), a per-project **model picker**, per-file
> editing, and multi-page publish/ZIP. Built additively — single-file projects still work.
> Key files: `server/lib/{generate,prompts,models}.ts`, `configs/openai.ts`,
> `controllers/projectController.ts`; client `components/ProjectPreview.tsx`,
> `pages/{Home,Projects,View}.tsx`. Below is the original plan, kept for reference.

## Goal
Generation that (1) is *dedicated to the user's prompt* — coffee looks like coffee,
SaaS looks like SaaS; (2) is award-level (bold type, whitespace rhythm, motion,
micro-interactions); (3) produces **true multi-page** sites; (4) ships working
JavaScript (nav, tabs, sliders, modals, form validation, scroll animations).
Note: interactivity/JS already works today (sandbox `allow-scripts`); this deepens it.

## Multi-model routing (load distribution)
Use the free pool per task, all still wrapped in the existing 429-retry + fallback
helper (`configs/openai.ts`):
- **Brief model** → `openai/gpt-oss-120b:free` (best reasoning) → the design spec.
- **Page models** → round-robin each page across the free pool (page i → models[i % n])
  and run them **in parallel** (`Promise.all`) → spreads load + faster.
- **JS / element-edit model** → `qwen/qwen3-coder:free` (best at precise instructions).
- Add task-model constants: `BRIEF_MODEL`, `PAGE_MODEL(s)`, keep `EDIT_MODEL`.

## Two-step pipeline
1. **Design brief** (1 call) → structured JSON:
   `{ industry, vibe, palette{primary,accent,neutrals}, fonts{display,body},
      pages:[{path,title,purpose,sections[]}], components, imageryKeywords, tone }`.
2. **Build** (N parallel calls) → one full HTML file per page, all sharing the brief's
   design system + a consistent nav/footer + working JS.

## Phases
### Phase 1 — Data + generation (the foundation)
- Schema: add `files Json?` to `WebsiteProject` (and store the file set on `Version`);
  nullable — old projects fall back to `current_code` (= `index.html`). Migration.
- Rewrite `server/lib/prompts.ts`: an "analyze-the-prompt-first" step + an
  **industry-archetype rubric** (coffee/restaurant/SaaS/portfolio/agency/e-commerce…
  each with palette+type+layout+mood) + stronger award-level + interactivity direction.
- New two-step, multi-model, multi-file generation (replace/extend `streamGeneration`).
  Raise `max_tokens`, keep the `</html>`/JSON guards, stream per-page progress via SSE.
- Verify: generate a multi-page site end to end; single-page projects still work.

### Phase 2 — Multi-file preview
- Editor gets a **page switcher** (tabs/dropdown).
- Preview iframe injects a script that intercepts clicks on internal `*.html` links and
  `postMessage`s the target path to the parent, which swaps the iframe to that file's
  HTML (no real navigation). Keeps the single-iframe model.

### Phase 3 — Download + publish
- **ZIP** all files client-side (add `jszip`) for Download.
- `/view/:id` (community) renders the multi-page site with the same link-intercept nav.

### Phase 4 — Editor glue
- Per-file save; versioning/rollback of the whole file set; element-edit on the active page.

## Risks / notes
- Multi-session effort; keep the app buildable/green throughout.
- Free models can produce inconsistent styling across pages — the shared brief mitigates
  it; a paid model (flip `GEN_MODEL`) still looks better.
- Parallel multi-page = more tokens/latency per generation (spread across models).
