// lib/audit-engine.ts
// Single source of truth for all audit logic.
// Imported by: auditpage, recommendations, audit/[id], and tests.

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type ToolEntry = {
    tool: string        // normalised key: 'claude', 'cursor', 'chatgpt', …
    plan: string        // normalised key: 'pro', 'max_5x', 'business', …
    task: string        // comma-separated use cases: 'coding, writing'
    users: string       // stringified int: '3'
    price: string       // stringified float: '60.00'
    DailyUsage: string  // 'light' | 'medium' | 'heavy'
}

export type FitBreakdown = {
    workload: number
    pricing: number
    task: number
    collaboration: number
}

export type Alternative = {
    tool: string
    plan: string
    price: number
    savings: number
    taskFit: number
}

export type AuditStatus = 'optimal' | 'downgrade' | 'switch' | 'upgrade'

export type AuditResult = {
    toolEntry: ToolEntry
    currentScore: number
    optimizedScore: number
    fitBreakdown: FitBreakdown
    status: AuditStatus
    bestAlternative: Alternative | null
    monthlySavings: number
    insights: string[]
    planFound: boolean
}

// ─── TOOL DATABASE ────────────────────────────────────────────────────────────
// Pricing verified against official pages — see PRICING_DATA.md

export const toolDatabase: Record<string, Record<string, {
    price: number | null
    recommendedUsers: number
    workload: string
    tasks: string[]
}>> = {
    chatgpt: {
        plus:       { price: 20,   recommendedUsers: 1,   workload: 'medium',     tasks: ['coding','research','writing','image generation'] },
        pro_100:    { price: 100,  recommendedUsers: 1,   workload: 'heavy',      tasks: ['coding','deep research','automation','agentic workflows'] },
        pro_200:    { price: 200,  recommendedUsers: 1,   workload: 'power',      tasks: ['parallel workflows','bulk research','advanced automation'] },
        business:   { price: 20,   recommendedUsers: 5,   workload: 'heavy',      tasks: ['team collaboration','coding','research','compliance'] },
        enterprise: { price: 60,   recommendedUsers: 150, workload: 'enterprise', tasks: ['enterprise automation','compliance','scaling','data residency'] },
        api_direct: { price: 0,    recommendedUsers: 1,   workload: 'medium',     tasks: ['coding','automation','research','custom integration'] },
    },
    claude: {
        free:       { price: 0,    recommendedUsers: 1,   workload: 'light',      tasks: ['writing','analysis','coding','research'] },
        pro:        { price: 20,   recommendedUsers: 1,   workload: 'medium',     tasks: ['writing','analysis','coding','research'] },
        max_5x:     { price: 100,  recommendedUsers: 1,   workload: 'heavy',      tasks: ['large context','analysis','coding','agentic workflows'] },
        max_20x:    { price: 200,  recommendedUsers: 1,   workload: 'power',      tasks: ['large projects','parallel agents','enterprise coding','automation'] },
        team:       { price: 25,   recommendedUsers: 5,   workload: 'heavy',      tasks: ['team collaboration','coding','analysis','enterprise'] },
        enterprise: { price: null, recommendedUsers: 20,  workload: 'enterprise', tasks: ['compliance','scaling','infrastructure','HIPAA'] },
        api_direct: { price: 0,    recommendedUsers: 1,   workload: 'medium',     tasks: ['coding','automation','custom integration','research'] },
    },
    gemini: {
        pro:        { price: 19.99,  recommendedUsers: 1, workload: 'medium', tasks: ['research','writing','Google Workspace integration','long context'] },
        ultra:      { price: 249.99, recommendedUsers: 1, workload: 'power',  tasks: ['video generation','research','enterprise','agentic browsing'] },
        api:        { price: 0,      recommendedUsers: 1, workload: 'medium', tasks: ['coding','automation','research','custom integration'] },
    },
    perplexity: {
        pro:        { price: 20,  recommendedUsers: 1,  workload: 'research',   tasks: ['deep research','web search','multi-model access','citations'] },
        max:        { price: 200, recommendedUsers: 1,  workload: 'power',      tasks: ['agentic research','automation','multi-model workflows','browser agent'] },
        enterprise: { price: 40,  recommendedUsers: 10, workload: 'enterprise', tasks: ['team research','compliance','analytics','admin controls'] },
    },
    copilot: {
        free:       { price: 0,  recommendedUsers: 1,  workload: 'light',      tasks: ['code completions','basic chat','learning'] },
        individual: { price: 10, recommendedUsers: 1,  workload: 'coding',     tasks: ['development','code review','IDE completions','agentic coding'] },
        pro:        { price: 10, recommendedUsers: 1,  workload: 'coding',     tasks: ['development','code review','IDE completions','agentic coding'] },
        pro_plus:   { price: 39, recommendedUsers: 1,  workload: 'heavy',      tasks: ['advanced coding','all models access','engineering','large context'] },
        business:   { price: 19, recommendedUsers: 5,  workload: 'coding',     tasks: ['team development','engineering','code review','admin controls'] },
        enterprise: { price: 39, recommendedUsers: 20, workload: 'enterprise', tasks: ['enterprise engineering','compliance','scaling','infrastructure'] },
    },
    cursor: {
        hobby:      { price: 0,  recommendedUsers: 1,  workload: 'light',      tasks: ['coding','learning','prototyping'] },
        pro:        { price: 20, recommendedUsers: 1,  workload: 'coding',     tasks: ['coding','development','AI completions','debugging'] },
        business:   { price: 40, recommendedUsers: 5,  workload: 'heavy',      tasks: ['team coding','engineering','admin','privacy mode'] },
        enterprise: { price: 60, recommendedUsers: 20, workload: 'enterprise', tasks: ['enterprise engineering','compliance','custom models','SSO'] },
    },
    windsurf: {
        free:       { price: 0,  recommendedUsers: 1, workload: 'light',  tasks: ['coding','learning'] },
        pro:        { price: 15, recommendedUsers: 1, workload: 'coding', tasks: ['coding','agentic workflows','debugging','fast completions'] },
        teams:      { price: 35, recommendedUsers: 5, workload: 'heavy',  tasks: ['team coding','collaboration','engineering'] },
    },
    anthropic_api: {
        api_direct: { price: 0, recommendedUsers: 1, workload: 'medium', tasks: ['coding','automation','research','custom integration','large context'] },
    },
    openai_api: {
        api_direct: { price: 0, recommendedUsers: 1, workload: 'medium', tasks: ['coding','automation','research','custom integration','image generation'] },
    },
}

// ─── WORKLOAD RANKING ─────────────────────────────────────────────────────────

const WORKLOAD_RANK: Record<string, number> = {
    light: 1, research: 2, coding: 2, medium: 3, heavy: 4, power: 5, enterprise: 6,
}

// ─── PURE SCORING FUNCTIONS (exported for unit tests) ─────────────────────────

export function normalizePlanKey(raw: string): string {
    return raw.toLowerCase().trim().replace(/[\s-]+/g, '_')
}

export function normalizeToolKey(raw: string): string {
    return raw.toLowerCase().trim().replace(/[\s-]+/g, '_')
}

export function getTaskKeywords(taskStr: string): string[] {
    return taskStr.toLowerCase().split(/[,/\s]+/).map(s => s.trim()).filter(Boolean)
}

export function calcTaskFit(keywords: string[], planTasks: string[]): number {
    if (keywords.length === 0) return 70
    let hits = 0
    keywords.forEach(kw => {
        if (planTasks.some(t => t.toLowerCase().includes(kw) || kw.includes(t.toLowerCase()))) hits++
    })
    return Math.min(100, Math.max(20, 30 + Math.round((hits / keywords.length) * 70)))
}

export function usageKey(raw: string): 'light' | 'medium' | 'heavy' {
    const s = raw.toLowerCase()
    if (s === 'light') return 'light'
    if (s === 'heavy' || s === 'power') return 'heavy'
    return 'medium'
}

export function workloadFitScore(usage: 'light' | 'medium' | 'heavy', planWorkload: string): number {
    const planRank  = WORKLOAD_RANK[planWorkload] ?? 3
    const usageRank = { light: 1, medium: 3, heavy: 4 }[usage]
    const diff = planRank - usageRank
    if (diff === 0)  return 95   // perfect match
    if (diff === 1)  return 80   // one tier above — fine
    if (diff >= 2)   return 40   // over-provisioned
    if (diff === -1) return 70   // usage slightly exceeds plan
    return 45                    // plan clearly too weak
}

export function collaborationFit(users: number, recommended: number): number {
    if (users === 1 && recommended >= 5) return 30   // solo on team plan
    if (users <= recommended)            return 95
    if (users <= recommended * 1.5)      return 80
    if (users <= recommended * 2)        return 60
    return 40                                        // severely over plan
}

export function pricingFit(entered: number, listed: number): number {
    if (listed === 0) return 90
    const ratio = entered / listed
    if (ratio <= 1.0)  return 90
    if (ratio <= 1.1)  return 80
    if (ratio <= 1.25) return 65
    return 50
}

// ─── MAIN ENGINE ──────────────────────────────────────────────────────────────

export function runAuditEngine(tools: ToolEntry[]): AuditResult[] {
    return tools.map(item => {
        const toolKey = normalizeToolKey(item.tool)
        const planKey = normalizePlanKey(item.plan)
        const taskKws = getTaskKeywords(item.task)
        const users   = Math.max(1, Number(item.users) || 1)
        const entered = Number(item.price) || 0
        const usage   = usageKey(item.DailyUsage)
        const insights: string[] = []

        // Unknown tool
        const toolData = toolDatabase[toolKey]
        if (!toolData) {
            return {
                toolEntry: item, currentScore: 50, optimizedScore: 50,
                fitBreakdown: { workload: 50, pricing: 50, task: 50, collaboration: 50 },
                status: 'optimal', bestAlternative: null, monthlySavings: 0,
                insights: [`"${item.tool}" is not in our database — manual review recommended.`],
                planFound: false,
            }
        }

        // Flexible plan key matching
        let resolvedPlanKey = planKey
        if (!toolData[resolvedPlanKey]) {
            const match = Object.keys(toolData).find(k =>
                k === planKey ||
                k.replace(/_/g, '') === planKey.replace(/_/g, '') ||
                k === item.plan.toLowerCase()
            )
            resolvedPlanKey = match ?? ''
        }

        const currentPlan = toolData[resolvedPlanKey]
        if (!currentPlan) {
            return {
                toolEntry: item, currentScore: 50, optimizedScore: 50,
                fitBreakdown: { workload: 50, pricing: 50, task: 50, collaboration: 50 },
                status: 'optimal', bestAlternative: null, monthlySavings: 0,
                insights: [`Plan "${item.plan}" not found for ${item.tool}. Check spelling.`],
                planFound: false,
            }
        }

        const listedPrice = currentPlan.price ?? entered

        // ── Fit scores ─────────────────────────────────────────────────────────
        const wFit = workloadFitScore(usage, currentPlan.workload)
        const tFit = calcTaskFit(taskKws, currentPlan.tasks ?? [])
        const cFit = collaborationFit(users, currentPlan.recommendedUsers ?? 1)
        const pFit = pricingFit(entered, listedPrice)
        const currentScore = Math.round((wFit + tFit + cFit + pFit) / 4)

        // ── Insight generation ─────────────────────────────────────────────────
        if (cFit <= 40)
            insights.push(`Team plan with only ${users} user${users !== 1 ? 's' : ''} — you're paying for unused seats.`)
        if (cFit >= 95 && users === 1)
            insights.push('Solo plan — good fit for your team size.')
        if (wFit <= 45 && usage === 'heavy')
            insights.push('Plan workload capacity may be insufficient for heavy daily usage.')
        if (wFit <= 45 && usage === 'light')
            insights.push('Plan capacity far exceeds your light usage — overpaying for headroom.')
        if (tFit < 60)
            insights.push(`This tool has limited support for "${item.task}" workflows.`)
        if (tFit >= 90)
            insights.push(`Strong task-to-tool match for ${item.task}.`)
        if (pFit < 65)
            insights.push('You appear to be paying above the standard listed price.')

        // ── Find alternatives ──────────────────────────────────────────────────
        let bestAlt: Alternative | null = null

        if (currentScore < 88) {
            // Same-tool cheaper plans first
            Object.entries(toolData).forEach(([pk, pd]) => {
                if (pk === resolvedPlanKey || pd.price === null) return
                const savings = (entered || listedPrice) - pd.price
                if (savings < 10) return
                if (workloadFitScore(usage, pd.workload) < 60) return
                if (collaborationFit(users, pd.recommendedUsers ?? 1) < 50) return
                const altTask = calcTaskFit(taskKws, pd.tasks ?? [])
                if (altTask < 65) return
                if (!bestAlt || savings > bestAlt.savings)
                    bestAlt = { tool: toolKey, plan: pk, price: pd.price, savings, taskFit: altTask }
            })

            // Cross-tool alternatives
            Object.entries(toolDatabase).forEach(([altTool, altPlans]) => {
                if (altTool === toolKey) return
                Object.entries(altPlans).forEach(([altPlan, altPd]) => {
                    if (altPd.price === null) return
                    const savings = (entered || listedPrice) - altPd.price
                    if (savings < 10) return
                    if (workloadFitScore(usage, altPd.workload) < 65) return
                    if (collaborationFit(users, altPd.recommendedUsers ?? 1) < 50) return
                    const altTask = calcTaskFit(taskKws, altPd.tasks ?? [])
                    if (altTask < 65) return
                    if (!bestAlt || savings > bestAlt.savings)
                        bestAlt = { tool: altTool, plan: altPlan, price: altPd.price, savings, taskFit: altTask }
                })
            })
        }

        // ── Optimised score + status ───────────────────────────────────────────
        let optimizedScore = currentScore
        let status: AuditStatus = 'optimal'

        const selectedAlt = bestAlt as Alternative | null

        if (selectedAlt) {
            const altTool = selectedAlt.tool
            const altPlan = selectedAlt.plan
            const altPlanData = toolDatabase[altTool]?.[altPlan] ?? {}
            const oW = workloadFitScore(usage, altPlanData.workload ?? 'medium')
            const oT = selectedAlt.taskFit
            const oC = collaborationFit(users, altPlanData.recommendedUsers ?? 1)
            const oP = 95
            optimizedScore = Math.round((oW + oT + oC + oP) / 4)
            status = altTool === toolKey ? 'downgrade' : 'switch'
            insights.push(
                `Switching to ${capitalize(altTool)} ${altPlan.replace(/_/g, ' ')} saves $${selectedAlt.savings.toFixed(2)}/mo with comparable capabilities.`
            )
        } else {
            insights.push(
                currentScore >= 85
                    ? 'Current setup is well-optimised for your workflow.'
                    : 'No meaningful cheaper alternative found — current setup is your best option.'
            )
        }

        return {
            toolEntry: item,
            currentScore,
            optimizedScore,
            fitBreakdown: { workload: wFit, pricing: pFit, task: tFit, collaboration: cFit },
            status,
            bestAlternative: selectedAlt,
            monthlySavings: selectedAlt?.savings ?? 0,
            insights,
            planFound: true,
        }
    })
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatPlanLabel(plan: string): string {
    return plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function buildFallbackSummary(
    results: AuditResult[],
    totalMonthly: number,
    totalSavings: number,
): string {
    const toolCount   = results.length
    const actionCount = results.filter(r => r.status !== 'optimal').length
    const topTool     = results.reduce(
        (a, b) => Number(a.toolEntry.price) > Number(b.toolEntry.price) ? a : b,
        results[0],
    )
    if (!topTool) return 'No tools audited.'

    if (actionCount === 0) {
        return `Your AI stack of ${toolCount} tool${toolCount !== 1 ? 's' : ''} looks well-configured, spending $${totalMonthly.toFixed(2)}/month. Each plan aligns closely with your usage patterns and team size. No immediate changes are recommended — continue monitoring as your workload evolves and new pricing tiers emerge.`
    }

    return `Your ${toolCount}-tool AI stack costs $${totalMonthly.toFixed(2)}/month. We found ${actionCount} optimisation${actionCount !== 1 ? 's' : ''} that could save you $${totalSavings.toFixed(2)}/month — $${(totalSavings * 12).toFixed(0)}/year. Your highest spend is ${capitalize(topTool.toolEntry.tool)} at $${Number(topTool.toolEntry.price).toFixed(2)}/month${topTool.bestAlternative ? ', which has a cheaper alternative with similar capabilities' : ', which is appropriately sized'}. Acting on these recommendations frees up budget without sacrificing productivity.`
}
