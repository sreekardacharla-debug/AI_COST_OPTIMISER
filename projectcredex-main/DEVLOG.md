# Development Log

## Day 1 — 2026-05-07

**Hours worked:** 2

**What I did:**  
Planned the OptiBlue AI project structure and gathered pricing and AI tool information required for the audit engine.

**What I learned:**  
Learned how AI spend optimisation tools compare plans, pricing, and workload usage.

**Blockers / what I'm stuck on:**  
Initially struggled deciding the best frontend structure and audit workflow.

**Plan for tomorrow:**  
Start building the homepage and navigation layout.


## Day 2 — 2026-05-08

**Hours worked:** 3

**What I did:**  
Built the homepage layout and navigation bar with routes for Home, Audit, Recommendations, History, and About sections.

**What I learned:**  
Improved understanding of Next.js App Router structure and reusable components.

**Blockers / what I'm stuck on:**  
Responsive layout spacing issues.

**Plan for tomorrow:**  
Start building the audit input form.


## Day 3 — 2026-05-09

**Hours worked:** 4

**What I did:**  
Built the audit form using input fields and select options for plans, pricing, seats, and workload inputs.

**What I learned:**  
Learned better form state handling and validation approaches in React.

**Blockers / what I'm stuck on:**  
Managing dynamic form values and recommendation logic.

**Plan for tomorrow:**  
Connect the audit engine and recommendation calculations.


## Day 4 — 2026-05-10

**Hours worked:** 5

**What I did:**  
Connected the audit engine and recommendation system. Added monthly savings and annual savings calculations.

**What I learned:**  
Learned optimisation scoring and recommendation logic generation.

**Blockers / what I'm stuck on:**  
TypeScript typing errors and calculation mismatches.

**Plan for tomorrow:**  
Improve recommendations page UI and styling.


## Day 5 — 2026-05-11

**Hours worked:** 4

**What I did:**  
Improved UI design, animations, backgrounds, and responsive layouts using Tailwind CSS.

**What I learned:**  
Learned better Tailwind styling and responsive SaaS UI structuring.

**Blockers / what I'm stuck on:**  
Spacing consistency and layout responsiveness.

**Plan for tomorrow:**  
Add export and AI summary features.


## Day 6 — 2026-05-12

**Hours worked:** 5

**What I did:**  
Added AI summary generation, PDF export, audit history, and API integrations.

**What I learned:**  
Learned API route handling and Anthropic AI integration.

**Blockers / what I'm stuck on:**  
API route debugging and build issues.


## Day 7 — 2026-05-14

**Hours worked:** 2

**What I did:**  
- Deleted failing commit "Update README with professional content" from GitHub
- Fixed environment variable handling in production code
  - Modified `lib/supabase.ts` to gracefully handle missing Supabase environment variables
  - Modified `app/api/ai-summary/route.ts` to handle missing ANTHROPIC_API_KEY
- Tested local build - **BUILD PASSED** ✅
- Pushed fixes to GitHub main branch

**Current CI Status:**
- ✅ **GitHub Actions (CI/test):** PASSING - All tests successful
- ✅ **GitHub Pages build and deployment:** PASSING - Build deployed
- ✅ **Supabase Preview:** PASSING - Database setup verified
- ❌ **Vercel Deployment:** FAILING - Missing environment variables previous but now it is deploying

**What I learned:**  
Environment variables must be configured in Vercel dashboard for production deployment to succeed. Code-level fixes prevent crashes when env vars are missing, but Vercel still needs them configured.

**Blockers / what I'm stuck on:**  
Vercel deployment requires:
- `ANTHROPIC_API_KEY` to be set in Vercel project settings
- `NEXT_PUBLIC_SUPABASE_URL` to be set in Vercel project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` to be set in Vercel project settings

**Plan for next steps:**  
Configure Vercel environment variables in the dashboard to make all CI checks green ✅.

**Plan for tomorrow:**  
Deploy and fix remaining bugs.


## Day 7 — 2026-05-13

**Hours worked:** 4

**What I did:**  
Deployed the application to Vercel, fixed routing issues, TypeScript errors, and finalised documentation.

**What I learned:**  
Learned deployment debugging and production build handling.

**Blockers / what I'm stuck on:**  
Folder naming and deployment routing issues.

**Plan for tomorrow:**  
Submission and final review.