# Decisions

The required decisions section now lives in the root `README.md`, because the assignment asks evaluators to read root-level Markdown files. I am keeping this file as a small pointer instead of duplicating a second, potentially inconsistent decision log.

Key decisions documented in `README.md`:

- Next.js App Router for pages, dynamic routes, and API routes in one project.
- Deterministic audit logic instead of LLM-driven savings math.
- Anthropic only for the personalized summary paragraph.
- localStorage for MVP draft/history persistence.
- Supabase for lead capture, with public audit sharing stripped of identifying details.
