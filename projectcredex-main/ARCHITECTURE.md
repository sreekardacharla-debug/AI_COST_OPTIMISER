This project is built using Next.js App Router architecture for managing pages, API routes, and dynamic audit sharing.

The main core of this application is the audit engine. The audit engine checks how well the user’s current AI workspace matches the type of work they do. It analyses factors like pricing, workload usage, collaboration usage, and task requirements.

Based on these calculations, the application generates optimisation recommendations and calculates how much money the user can potentially save by switching plans or tools.

The application also contains API routes for:
- AI summary generation
- audit storage
- lead collection

The AI summary route uses Anthropic AI to generate personalised optimisation summaries based on the actual audit report of the user.

Audit history is stored locally using localStorage so users can revisit previous audits and compare savings over time.

Each audit also generates a unique shareable ID so users can share their audit reports publicly using dynamic routes.