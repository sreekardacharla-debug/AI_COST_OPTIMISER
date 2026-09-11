'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Navbar from "../navbar/page"
import Link from 'next/link'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ─── TOOL DATABASE ────────────────────────────────────────────────────────────
type PlanData = {
    price: number | null
    recommendedUsers: number
    workload: string
    tasks: string[]
    deprecated?: boolean
}

const toolDatabase: Record<string, Record<string, PlanData>> = {
    chatgpt: {
        plus:       { price: 20,   recommendedUsers: 1,   workload: "medium",     tasks: ["coding","research","writing","image generation"] },
        pro_100:    { price: 100,  recommendedUsers: 1,   workload: "heavy",      tasks: ["coding","deep research","automation","agentic workflows"] },
        pro_200:    { price: 200,  recommendedUsers: 1,   workload: "power",      tasks: ["parallel workflows","bulk research","advanced automation"] },
        business:   { price: 20,   recommendedUsers: 5,   workload: "heavy",      tasks: ["team collaboration","coding","research","compliance"] },
        enterprise: { price: 60,   recommendedUsers: 150, workload: "enterprise", tasks: ["enterprise automation","compliance","scaling","data residency"] },
    },
    claude: {
        pro:        { price: 20,   recommendedUsers: 1,   workload: "medium",     tasks: ["writing","analysis","coding","research"] },
        max_5x:     { price: 100,  recommendedUsers: 1,   workload: "heavy",      tasks: ["large context","analysis","coding","agentic workflows"] },
        max_20x:    { price: 200,  recommendedUsers: 1,   workload: "power",      tasks: ["large projects","parallel agents","enterprise coding","automation"] },
        team:       { price: 25,   recommendedUsers: 5,   workload: "heavy",      tasks: ["team collaboration","coding","analysis","enterprise"] },
        enterprise: { price: null, recommendedUsers: 20,  workload: "enterprise", tasks: ["compliance","scaling","infrastructure","HIPAA"] },
    },
    gemini: {
        pro:   { price: 19.99,  recommendedUsers: 1, workload: "medium", tasks: ["research","writing","Google Workspace integration","long context"] },
        ultra: { price: 249.99, recommendedUsers: 1, workload: "power",  tasks: ["video generation","research","enterprise","agentic browsing"] },
    },
    perplexity: {
        pro:        { price: 20,  recommendedUsers: 1,  workload: "research",    tasks: ["deep research","web search","multi-model access","citations"] },
        max:        { price: 200, recommendedUsers: 1,  workload: "power",       tasks: ["agentic research","automation","multi-model workflows","browser agent"] },
        enterprise: { price: 40,  recommendedUsers: 10, workload: "enterprise",  tasks: ["team research","compliance","analytics","admin controls"] },
    },
    copilot: {
        free:       { price: 0,  recommendedUsers: 1,  workload: "light",      tasks: ["code completions","basic chat","learning"] },
        pro:        { price: 10, recommendedUsers: 1,  workload: "coding",     tasks: ["development","code review","IDE completions","agentic coding"] },
        pro_plus:   { price: 39, recommendedUsers: 1,  workload: "heavy",      tasks: ["advanced coding","all models access","engineering","large context"] },
        business:   { price: 19, recommendedUsers: 5,  workload: "coding",     tasks: ["team development","engineering","code review","admin controls"] },
        enterprise: { price: 39, recommendedUsers: 20, workload: "enterprise", tasks: ["enterprise engineering","compliance","scaling","infrastructure"] },
    },
    cursor: {
        hobby:      { price: 0,  recommendedUsers: 1,  workload: "light",  tasks: ["coding","learning","prototyping"] },
        pro:        { price: 20, recommendedUsers: 1,  workload: "coding", tasks: ["coding","development","AI completions","debugging"] },
        business:   { price: 40, recommendedUsers: 5,  workload: "heavy",  tasks: ["team coding","engineering","admin","privacy mode"] },
        enterprise: { price: 60, recommendedUsers: 20, workload: "enterprise", tasks: ["enterprise engineering","compliance","custom models","SSO"] },
    },
    windsurf: {
        free:       { price: 0,  recommendedUsers: 1, workload: "light",  tasks: ["coding","learning"] },
        pro:        { price: 15, recommendedUsers: 1, workload: "coding", tasks: ["coding","agentic workflows","debugging","fast completions"] },
        teams:      { price: 35, recommendedUsers: 5, workload: "heavy",  tasks: ["team coding","collaboration","engineering"] },
    },
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ToolEntry = {
    tool: string
    plan: string
    task: string
    users: string
    price: string
    DailyUsage: string
}

type FitBreakdown = {
    workload: number
    pricing: number
    task: number
    collaboration: number
}

type Alternative = {
    tool: string
    plan: string
    price: number
    savings: number
    taskFit: number
}

type AuditResult = {
    toolEntry: ToolEntry
    currentScore: number
    optimizedScore: number
    fitBreakdown: FitBreakdown
    status: 'optimal' | 'downgrade' | 'switch' | 'upgrade'
    bestAlternative: Alternative | null
    monthlySavings: number
    insights: string[]
    planFound: boolean
}

// ─── AUDIT ENGINE ─────────────────────────────────────────────────────────────
function normalizePlanKey(raw: string): string {
    return raw.toLowerCase().trim().replace(/\s+/g, '_')
}
function normalizeToolKey(raw: string): string {
    return raw.toLowerCase().trim().replace(/\s+/g, '')
}
function getTaskKeywords(taskStr: string): string[] {
    return taskStr.toLowerCase().split(/[,/\s]+/).map(s => s.trim()).filter(Boolean)
}
function calcTaskFit(keywords: string[], planTasks: string[]): number {
    if (keywords.length === 0) return 70
    let hits = 0
    keywords.forEach(kw => {
        if (planTasks.some(t => t.toLowerCase().includes(kw) || kw.includes(t.toLowerCase()))) hits++
    })
    return Math.min(100, Math.max(20, 30 + Math.round((hits / keywords.length) * 70)))
}
function usageKey(raw: string): 'light' | 'medium' | 'heavy' {
    const s = raw.toLowerCase()
    if (s.includes('light')) return 'light'
    if (s.includes('heavy') || s.includes('power')) return 'heavy'
    return 'medium'
}
const WORKLOAD_RANK: Record<string, number> = {
    light: 1, research: 2, coding: 2, medium: 3, heavy: 4, power: 5, enterprise: 6,
}
function workloadFitScore(usage: 'light' | 'medium' | 'heavy', planWorkload: string): number {
    const planRank  = WORKLOAD_RANK[planWorkload] ?? 3
    const usageRank = { light: 1, medium: 3, heavy: 4 }[usage]
    const diff = planRank - usageRank
    if (diff === 0)  return 95
    if (diff === 1)  return 80
    if (diff >= 2)   return 40
    if (diff === -1) return 70
    return 45
}
function collaborationFit(users: number, recommended: number): number {
    if (users === 1 && recommended >= 5) return 30
    if (users <= recommended)            return 95
    if (users <= recommended * 1.5)      return 80
    if (users <= recommended * 2)        return 60
    return 40
}
function pricingFit(entered: number, listed: number): number {
    if (listed === 0) return 90
    const ratio = entered / listed
    if (ratio <= 1.0) return 90
    if (ratio <= 1.1) return 80
    if (ratio <= 1.25) return 65
    return 50
}

function runAuditEngine(tools: ToolEntry[]): AuditResult[] {
    return tools.map(item => {
        const toolKey = normalizeToolKey(item.tool)
        const planKey = normalizePlanKey(item.plan)
        const taskKws = getTaskKeywords(item.task)
        const users   = Math.max(1, Number(item.users) || 1)
        const entered = Number(item.price) || 0
        const usage   = usageKey(item.DailyUsage)
        const insights: string[] = []

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
        const wFit  = workloadFitScore(usage, currentPlan.workload)
        const tFit  = calcTaskFit(taskKws, currentPlan.tasks ?? [])
        const cFit  = collaborationFit(users, currentPlan.recommendedUsers ?? 1)
        const pFit  = pricingFit(entered, listedPrice)
        const currentScore = Math.round((wFit + tFit + cFit + pFit) / 4)

        if (cFit <= 40) insights.push(`Team plan with only ${users} user — you're paying for unused seats.`)
        if (cFit >= 95 && users === 1) insights.push('Solo plan — good fit for your team size.')
        if (wFit <= 45 && usage === 'heavy') insights.push('Plan workload capacity may be insufficient for heavy daily usage.')
        if (wFit <= 45 && usage === 'light') insights.push('Plan capacity far exceeds your light usage — overpaying for headroom.')
        if (tFit < 60) insights.push(`This tool has limited support for "${item.task}" workflows.`)
        if (tFit >= 90) insights.push(`Strong task-to-tool match for ${item.task}.`)
        if (pFit < 65) insights.push(`You appear to be paying above the standard listed price.`)

        let bestAlt: Alternative | null = null as Alternative | null

        if (currentScore < 88) {
            Object.entries(toolData).forEach(([pk, pd]) => {
                if (pk === resolvedPlanKey || pd.deprecated || pd.price === null) return
                const savings = (entered || listedPrice) - pd.price
                if (savings < 10) return
                const altWorkload = workloadFitScore(usage, pd.workload)
                if (altWorkload < 60) return
                const altColab = collaborationFit(users, pd.recommendedUsers ?? 1)
                if (altColab < 50) return
                const altTask = calcTaskFit(taskKws, pd.tasks ?? [])
                if (altTask < 65) return
                if (!bestAlt || savings > bestAlt.savings) {
                    bestAlt = { tool: toolKey, plan: pk, price: pd.price, savings, taskFit: altTask }
                }
            })

            Object.entries(toolDatabase).forEach(([altTool, altPlans]) => {
                if (altTool === toolKey) return
                Object.entries(altPlans).forEach(([altPlan, altPd]) => {
                    if (altPd.deprecated || altPd.price === null) return
                    const savings = (entered || listedPrice) - altPd.price
                    if (savings < 10) return
                    const altWorkload = workloadFitScore(usage, altPd.workload)
                    if (altWorkload < 65) return
                    const altColab = collaborationFit(users, altPd.recommendedUsers ?? 1)
                    if (altColab < 50) return
                    const altTask = calcTaskFit(taskKws, altPd.tasks ?? [])
                    if (altTask < 65) return
                    if (!bestAlt || savings > bestAlt.savings) {
                        bestAlt = { tool: altTool, plan: altPlan, price: altPd.price, savings, taskFit: altTask }
                    }
                })
            })
        }

        let optimizedScore = currentScore
        let status: AuditResult['status'] = 'optimal'

        if (bestAlt !== null) {
            const altPlanData = toolDatabase[bestAlt.tool]?.[bestAlt.plan] ?? {}
            const oW = workloadFitScore(usage, altPlanData.workload ?? 'medium')
            const oT = bestAlt.taskFit
            const oC = collaborationFit(users, altPlanData.recommendedUsers ?? 1)
            const oP = 95
            optimizedScore = Math.round((oW + oT + oC + oP) / 4)
            status = bestAlt.tool === toolKey ? 'downgrade' : 'switch'
            insights.push(
                `Switching to ${capitalize(bestAlt.tool)} ${bestAlt.plan.replace(/_/g,' ')} saves $${bestAlt.savings.toFixed(2)}/mo with comparable capabilities.`
            )
        } else {
            if (currentScore >= 85) insights.push('Current setup is well-optimised for your workflow.')
            else insights.push('No meaningful cheaper alternative found — current setup is your best option.')
        }

        return {
            toolEntry: item,
            currentScore,
            optimizedScore,
            fitBreakdown: { workload: wFit, pricing: pFit, task: tFit, collaboration: cFit },
            status,
            bestAlternative: bestAlt,
            monthlySavings: bestAlt?.savings ?? 0,
            insights,
            planFound: true,
        }
    })
}

// ─── AI SUMMARY ───────────────────────────────────────────────────────────────
function buildFallbackSummary(results: AuditResult[], totalMonthly: number, totalSavings: number): string {
    const toolCount    = results.length
    const actionCount  = results.filter(r => r.status !== 'optimal').length
    const topTool      = results.reduce((a, b) => Number(a.toolEntry.price) > Number(b.toolEntry.price) ? a : b, results[0])

    if (actionCount === 0) {
        return `Your AI stack of ${toolCount} tool${toolCount !== 1 ? 's' : ''} looks well-configured, spending $${totalMonthly.toFixed(2)}/month. Each plan aligns closely with your usage patterns and team size. No immediate changes are recommended — continue monitoring as your workload evolves and new pricing tiers emerge.`
    }

    return `Your ${toolCount}-tool AI stack costs $${totalMonthly.toFixed(2)}/month. We found ${actionCount} optimisation${actionCount !== 1 ? 's' : ''} that could save you $${totalSavings.toFixed(2)}/month — $${(totalSavings * 12).toFixed(0)}/year. Your highest spend is ${capitalize(topTool.toolEntry.tool)} at $${Number(topTool.toolEntry.price).toFixed(2)}/month${topTool.bestAlternative ? ', which has a cheaper alternative with similar capabilities' : ', which is appropriately sized'}. Acting on these recommendations frees up budget without sacrificing productivity.`
}

async function fetchAISummary(
    results: AuditResult[],
    totalMonthly: number,
    totalSavings: number
): Promise<string> {
    const toolSummaries = results.map(r => ({
        tool:      r.toolEntry.tool,
        plan:      r.toolEntry.plan,
        price:     r.toolEntry.price,
        users:     r.toolEntry.users,
        usage:     r.toolEntry.DailyUsage,
        task:      r.toolEntry.task,
        score:     r.currentScore,
        status:    r.status,
        savings:   r.monthlySavings,
        topInsight: r.insights[0] ?? '',
    }))

    const prompt = `You are an AI spend advisor. Given this audit data, write a concise 80–120 word personalized summary paragraph for the user. Be specific, honest, and constructive. Do not use bullet points. Do not repeat numbers verbatim from the data — synthesize them. Mention the biggest opportunity first. If all tools are optimal, affirm it warmly without being sycophantic.

Audit data:
- Total monthly spend: $${totalMonthly.toFixed(2)}
- Total potential savings: $${totalSavings.toFixed(2)}/mo
- Tools audited: ${JSON.stringify(toolSummaries, null, 2)}

Write ONLY the paragraph. No preamble, no sign-off.`

    const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    })

    if (!response.ok) throw new Error('API call failed')
    const data = await response.json()
    return data.summary ?? buildFallbackSummary(results, totalMonthly, totalSavings)
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}
function formatPlanLabel(plan: string) {
    return plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function scoreColor(score: number) {
    if (score >= 85) return { ring: '#10B981', bg: '#ECFDF5', text: '#065F46' }
    if (score >= 65) return { ring: '#F59E0B', bg: '#FFFBEB', text: '#92400E' }
    return                   { ring: '#EF4444', bg: '#FEF2F2', text: '#991B1B' }
}

const FIT_LABELS: Record<string, string> = {
    workload: 'Workload Fit', pricing: 'Pricing Fit', task: 'Task Fit', collaboration: 'Collaboration Fit',
}
const FIT_ICONS: Record<string, string> = {
    workload: '⚡', pricing: '💰', task: '🎯', collaboration: '👥',
}
const STATUS_META = {
    optimal:   { label: 'Optimised',   bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
    downgrade: { label: 'Downgrade',   bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
    switch:    { label: 'Switch Tool', bg: '#EFF6FF', text: '#1E40AF', dot: '#3B6FFF' },
    upgrade:   { label: 'Upgrade',     bg: '#FDF4FF', text: '#7E22CE', dot: '#A855F7' },
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function FitBar({ label, value, icon }: { label: string; value: number; icon: string }) {
    const col = value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444'
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-[#6B7A9B] flex items-center gap-1.5">
          <span>{icon}</span>{label}
        </span>
                <span className="text-[12px] font-bold" style={{ color: col }}>{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F1F4FA] overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${value}%`, background: col }}
                />
            </div>
        </div>
    )
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
    const col  = scoreColor(score)
    const r    = (size / 2) - 4
    const circ = 2 * Math.PI * r
    const dash = (score / 100) * circ
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F4FA" strokeWidth="3.5" />
                <circle
                    cx={size/2} cy={size/2} r={r} fill="none"
                    stroke={col.ring} strokeWidth="3.5"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                />
            </svg>
            <span className="heading-font text-[13px] font-bold" style={{ color: col.text }}>{score}</span>
        </div>
    )
}

function SummaryCard({ label, value, sub, green }: {
    label: string; value: string; sub: string; accent: string; green?: boolean
}) {
    return (
        <div
            className="stat-card"
            style={green ? { background: 'linear-gradient(135deg, #F0FDF4 0%, #fff 100%)', borderColor: '#BBF7D0' } : {}}
        >
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: green ? '#10B981' : '#9AA3B8' }}>
                {label}
            </p>
            <p className="heading-font text-[34px] font-bold mt-2 leading-none" style={{ color: green ? '#065F46' : '#0A1628' }}>
                {value}
            </p>
            <p className="text-[12px] mt-2" style={{ color: green ? '#10B981' : '#9AA3B8' }}>{sub}</p>
        </div>
    )
}

// ─── LEAD CAPTURE MODAL ───────────────────────────────────────────────────────
function LeadCaptureModal({
                              isOpen,
                              onClose,
                              totalSavings,
                              onSubmit,
                          }: {
    isOpen: boolean
    onClose: () => void
    totalSavings: number
    onSubmit: (data: { email: string; company: string; role: string; teamSize: string }) => Promise<void>
}) {
    const [email, setEmail]       = useState('')
    const [company, setCompany]   = useState('')
    const [role, setRole]         = useState('')
    const [teamSize, setTeamSize] = useState('')
    const [loading, setLoading]   = useState(false)
    const [done, setDone]         = useState(false)
    const [error, setError]       = useState('')
    // honeypot field – bots fill it, humans leave it blank
    const [honeypot, setHoneypot] = useState('')

    if (!isOpen) return null

    const highSavings = totalSavings >= 500

    async function handleSubmit() {
        if (honeypot) return // silent bot rejection
        if (!email.includes('@')) { setError('Please enter a valid email.'); return }
        setLoading(true)
        setError('')
        try {
            await onSubmit({ email, company, role, teamSize })
            setDone(true)
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                {done ? (
                    <div className="text-center py-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] flex items-center justify-center mx-auto mb-5">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                                <path d="M5 13l4 4L19 7" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="heading-font text-[22px] font-bold text-[#0A1628] mb-2">Report on its way!</h3>
                        <p className="text-[14px] text-[#6B7A9B] leading-relaxed max-w-[320px] mx-auto">
                            Check your inbox for your full audit report.
                            {highSavings && ' A Credex advisor will reach out within 1 business day about your savings opportunities.'}
                        </p>
                        <button onClick={onClose} className="mt-6 cta-btn-secondary">Close</button>
                    </div>
                ) : (
                    <>
                        <button onClick={onClose} className="modal-close">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 4l8 8M12 4l-8 8" stroke="#9AA3B8" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                        </button>

                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-full px-3 py-1 mb-4">
                                <span className="text-[11px] font-semibold text-[#1E40AF] tracking-wide">📧 Get your full report</span>
                            </div>
                            <h3 className="heading-font text-[22px] font-bold text-[#0A1628] mb-1.5">Save & Email This Audit</h3>
                            <p className="text-[13.5px] text-[#6B7A9B] leading-relaxed">
                                {highSavings
                                    ? `You have $${totalSavings.toFixed(2)}/mo in savings opportunities. Enter your email and a Credex advisor will show you how to capture them.`
                                    : 'Get a copy of this audit emailed to you. We\'ll notify you when new optimisations apply to your stack.'}
                            </p>
                        </div>

                        {/* Honeypot – visually hidden */}
                        <input
                            type="text"
                            value={honeypot}
                            onChange={e => setHoneypot(e.target.value)}
                            style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />

                        <div className="flex flex-col gap-3">
                            <input
                                type="email"
                                placeholder="Work email *"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="form-input"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Company name (optional)"
                                value={company}
                                onChange={e => setCompany(e.target.value)}
                                className="form-input"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Your role (optional)"
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="form-input"
                                />
                                <select
                                    value={teamSize}
                                    onChange={e => setTeamSize(e.target.value)}
                                    className="form-input"
                                    style={{ color: teamSize ? '#0A1628' : '#9AA3B8' }}
                                >
                                    <option value="" disabled>Team size</option>
                                    <option value="1">Just me</option>
                                    <option value="2-5">2–5</option>
                                    <option value="6-20">6–20</option>
                                    <option value="21-100">21–100</option>
                                    <option value="100+">100+</option>
                                </select>
                            </div>
                        </div>

                        {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="cta-btn-primary mt-5 w-full"
                        >
                            {loading ? 'Sending…' : highSavings ? 'Send report + book Credex call →' : 'Email my audit →'}
                        </button>

                        <p className="text-[11px] text-[#B0B9CC] text-center mt-3">
                            No spam. Unsubscribe any time.
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

// ─── CREDEX HIGH-SAVINGS BANNER ───────────────────────────────────────────────
function CredexBanner({ savings, onCTA }: { savings: number; onCTA: () => void }) {
    return (
        <div className="credex-banner">
            <div className="flex items-start gap-5">
                <div className="credex-icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="heading-font text-[17px] font-bold text-white">Credex can save you more</span>
                        <span className="text-[11px] font-semibold bg-white/15 text-white px-2.5 py-1 rounded-full">
              Partner offer
            </span>
                    </div>
                    <p className="text-[13.5px] text-white/80 leading-relaxed max-w-[560px]">
                        You&apos;re already saving <strong className="text-white">${savings.toFixed(2)}/mo</strong> by switching plans.
                        Credex sells discounted AI infrastructure credits — Claude, ChatGPT Enterprise, Cursor, and more — sourced from companies that overforecast.
                        The discount is real: up to 40% off retail. Book a free 20-min call to see what applies to your stack.
                    </p>
                    <button onClick={onCTA} className="credex-cta-btn mt-4">
                        Book a free Credex consultation →
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── OPTIMAL / LOW-SAVINGS BANNER ─────────────────────────────────────────────
function OptimalBanner({ onNotify }: { onNotify: () => void }) {
    return (
        <div className="optimal-banner">
            <div className="flex items-center gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#D1FAE5"/>
                        <path d="M7 10l2 2 4-4" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div className="flex-1">
                    <p className="text-[15px] font-semibold text-[#065F46]">You&apos;re spending well.</p>
                    <p className="text-[13px] text-[#4ADE80]/80 mt-0.5" style={{ color: '#047857' }}>
                        Your stack is already optimised. We&apos;ll notify you when new savings apply.
                    </p>
                </div>
                <button onClick={onNotify} className="optimal-notify-btn">
                    Notify me of new optimisations
                </button>
            </div>
        </div>
    )
}

// ─── AI SUMMARY BLOCK ─────────────────────────────────────────────────────────
function AISummaryBlock({ summary, loading }: { summary: string; loading: boolean }) {
    return (
        <div className="ai-summary-block">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#6366F1] to-[#3B6FFF] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1l1.5 3H11l-2.5 2 1 3L6 7.5 2.5 9l1-3L1 4h3.5L6 1z" fill="white"/>
                    </svg>
                </div>
                <span className="text-[12px] font-semibold text-[#6366F1] uppercase tracking-wider">AI-generated summary</span>
            </div>
            {loading ? (
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        {[0,1,2].map(i => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                    <span className="text-[13px] text-[#9AA3B8]">Generating your personalised summary…</span>
                </div>
            ) : (
                <p className="text-[14.5px] text-[#2D3748] leading-[1.75] font-light">{summary}</p>
            )}
        </div>
    )
}

// ─── SHARE BUTTON ─────────────────────────────────────────────────────────────
function ShareButton({ shareUrl }: { shareUrl: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback: select text
            const el = document.createElement('textarea')
            el.value = shareUrl
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <button onClick={handleCopy} className="share-btn">
            {copied ? (
                <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7l3 3 6-6" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M4 4V3a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>Share this audit</span>
                </>
            )}
        </button>
    )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
function PageStyles() {
    return (
        <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      * { font-family: 'DM Sans', sans-serif; }
      .heading-font { font-family: 'Syne', sans-serif; }

      /* Cards */
      .stat-card {
        background: #fff;
        border: 1.5px solid #E8EDF5;
        border-radius: 20px;
        padding: 24px 24px 20px;
        transition: box-shadow .2s;
      }
      .stat-card:hover { box-shadow: 0 8px 32px rgba(59,111,255,0.07); }
      .rec-card {
        background: #fff;
        border: 1.5px solid #E8EDF5;
        border-radius: 18px;
        padding: 24px 28px;
        transition: box-shadow .18s;
      }
      .rec-card:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.06); }

      /* AI Summary */
      .ai-summary-block {
        background: linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%);
        border: 1.5px solid #DDD6FE;
        border-radius: 18px;
        padding: 22px 26px;
        margin-bottom: 24px;
      }

      /* Credex banner */
      .credex-banner {
        background: linear-gradient(135deg, #0A1628 0%, #162240 50%, #1E3A5F 100%);
        border-radius: 22px;
        padding: 28px 32px;
        margin-bottom: 24px;
        box-shadow: 0 16px 48px rgba(10,22,40,0.28);
      }
      .credex-icon-wrap {
        width: 48px; height: 48px;
        background: rgba(255,255,255,0.12);
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .credex-cta-btn {
        display: inline-flex; align-items: center;
        background: #3B6FFF;
        color: white;
        font-size: 13px; font-weight: 600;
        padding: 10px 20px;
        border-radius: 12px;
        border: none; cursor: pointer;
        transition: background .15s, transform .1s;
      }
      .credex-cta-btn:hover { background: #2557E7; transform: translateY(-1px); }

      /* Optimal banner */
      .optimal-banner {
        background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%);
        border: 1.5px solid #BBF7D0;
        border-radius: 18px;
        padding: 20px 24px;
        margin-bottom: 24px;
      }
      .optimal-notify-btn {
        font-size: 13px; font-weight: 600;
        color: #065F46;
        background: white;
        border: 1.5px solid #BBF7D0;
        border-radius: 12px;
        padding: 9px 18px;
        cursor: pointer;
        transition: border-color .15s, box-shadow .15s;
        white-space: nowrap;
      }
      .optimal-notify-btn:hover { border-color: #10B981; box-shadow: 0 2px 12px rgba(16,185,129,.12); }

      /* Share button */
      .share-btn {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 13px; font-weight: 500;
        color: #6B7A9B;
        background: white;
        border: 1.5px solid #E8EDF5;
        border-radius: 10px;
        padding: 8px 16px;
        cursor: pointer;
        transition: color .15s, border-color .15s;
      }
      .share-btn:hover { color: #3B6FFF; border-color: #3B6FFF; }

      /* Modal */
      .modal-overlay {
        position: fixed; inset: 0;
        background: rgba(10,22,40,0.45);
        backdrop-filter: blur(6px);
        z-index: 100;
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
      }
      .modal-box {
        background: white;
        border-radius: 24px;
        padding: 32px;
        width: 100%; max-width: 480px;
        position: relative;
        box-shadow: 0 24px 80px rgba(10,22,40,0.22);
      }
      .modal-close {
        position: absolute; top: 16px; right: 16px;
        width: 32px; height: 32px;
        background: #F4F6FB;
        border: none; border-radius: 8px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s;
      }
      .modal-close:hover { background: #E8EDF5; }

      /* Form inputs */
      .form-input {
        width: 100%;
        padding: 11px 14px;
        border: 1.5px solid #E8EDF5;
        border-radius: 12px;
        font-size: 14px;
        color: #0A1628;
        background: #F9FAFB;
        outline: none;
        transition: border-color .15s;
        box-sizing: border-box;
      }
      .form-input:focus { border-color: #3B6FFF; background: white; }
      .form-input::placeholder { color: #9AA3B8; }

      /* CTAs */
      .cta-btn-primary {
        display: inline-flex; align-items: center; justify-content: center;
        background: #0A1628;
        color: white;
        font-size: 14px; font-weight: 600;
        padding: 13px 24px;
        border-radius: 14px;
        border: none; cursor: pointer;
        transition: background .15s, transform .1s;
        box-shadow: 0 4px 20px rgba(10,22,40,0.18);
      }
      .cta-btn-primary:hover:not(:disabled) { background: #162240; transform: translateY(-1px); }
      .cta-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }

      .cta-btn-secondary {
        display: inline-flex; align-items: center; justify-content: center;
        background: white;
        color: #4A5568;
        font-size: 14px; font-weight: 500;
        padding: 10px 22px;
        border-radius: 12px;
        border: 1.5px solid #E8EDF5;
        cursor: pointer;
        transition: border-color .15s;
      }
      .cta-btn-secondary:hover { border-color: #CBD5E1; }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      .animate-bounce { animation: bounce 0.8s infinite; }
    `}</style>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function RecommendationsPage() {
    const [tools, setTools]         = useState<ToolEntry[]>([])
    const [results, setResults]     = useState<AuditResult[]>([])
    const [expanded, setExpanded]   = useState<number | null>(null)
    const [loaded, setLoaded]       = useState(false)
    const [aiSummary, setAiSummary] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [shareUrl, setShareUrl]   = useState('')
    const [auditId, setAuditId]     = useState('')

    const downloadPDF = async () => {

        const input = document.getElementById('audit-report')

        if (!input) return

        const canvas = await html2canvas(input)

        const imgData = canvas.toDataURL('image/png')

        const pdf = new jsPDF('p', 'mm', 'a4')

        const pdfWidth = pdf.internal.pageSize.getWidth()

        const pdfHeight =
            (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(
            imgData,
            'PNG',
            0,
            0,
            pdfWidth,
            pdfHeight
        )

        pdf.save('audit-report.pdf')
    }

    // Load audit data + generate share ID
    useEffect(() => {
        try {
            const saved = localStorage.getItem('auditData')
            if (saved) {
                const parsed: ToolEntry[] = JSON.parse(saved)
                const computed = runAuditEngine(parsed)

                // Generate or reuse share ID
                let id = localStorage.getItem('auditShareId') ?? ''
                if (!id) {
                    id = `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
                    localStorage.setItem('auditShareId', id)

                    // Persist public share data (stripped of PII)
                    const publicData = {
                        id,
                        tools: parsed.map(t => ({ tool: t.tool, plan: t.plan, price: t.price, users: t.users, task: t.task })),
                        createdAt: new Date().toISOString(),
                    }
                    localStorage.setItem(`auditShare_${id}`, JSON.stringify(publicData))
                }
                localStorage.setItem(
                    `audit_history_${id}`,
                    JSON.stringify({
                        id,
                        createdAt: new Date().toISOString(),
                        totalTools: parsed.length,
                        totalSpend: parsed.reduce(
                            (sum, t) => sum + (Number(t.price) || 0),
                            0
                        ),
                        totalSavings: computed.reduce(
                            (sum, r) => sum + r.monthlySavings,
                            0
                        ),
                    })
                )
                const url = `${window.location.origin}/audit/${id}`
                window.setTimeout(() => {
                    setTools(parsed)
                    setResults(computed)
                    setAuditId(id)
                    setShareUrl(url)
                }, 0)
            }
        } catch {}
        const timer = window.setTimeout(() => setLoaded(true), 0)
        return () => window.clearTimeout(timer)
    }, [])

    // Fetch AI summary once results are ready
    useEffect(() => {
        if (!results.length) return
        const totalMonthly = tools.reduce((s, t) => s + (Number(t.price) || 0), 0)
        const totalSavings = results.reduce((s, r) => s + r.monthlySavings, 0)
        const timer = window.setTimeout(() => setAiLoading(true), 0)

        fetchAISummary(results, totalMonthly, totalSavings)
            .then(s => setAiSummary(s))
            .catch(() => setAiSummary(buildFallbackSummary(results, totalMonthly, totalSavings)))
            .finally(() => setAiLoading(false))
        return () => window.clearTimeout(timer)
    }, [results, tools])

    // Aggregate stats
    const totalMonthly    = tools.reduce((s, t) => s + (Number(t.price) || 0), 0)
    const totalSavings    = results.reduce((s, r) => s + r.monthlySavings, 0)
    const avgCurrentScore = results.length
        ? Math.round(results.reduce((s, r) => s + r.currentScore, 0) / results.length) : 0
    const avgOptScore     = results.length
        ? Math.round(results.reduce((s, r) => s + r.optimizedScore, 0) / results.length) : 0
    const actionCount     = results.filter(r => r.status !== 'optimal').length
    const isHighSavings   = totalSavings >= 500
    const isOptimal       = totalSavings < 100 && actionCount === 0

    // Lead capture handler
    const handleLeadSubmit = useCallback(async (data: {
        email: string; company: string; role: string; teamSize: string
    }) => {
        const payload = {
            ...data,
            auditId,
            totalMonthly,
            totalSavings,
            toolCount: tools.length,
            isHighSavings,
            auditResults: results.map(r => ({
                tool:    r.toolEntry.tool,
                plan:    r.toolEntry.plan,
                status:  r.status,
                savings: r.monthlySavings,
            })),
        }
        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Lead capture failed')
    }, [auditId, totalMonthly, totalSavings, tools.length, isHighSavings, results])

    // OG meta
    const ogTitle       = `My AI Stack Audit — $${totalSavings.toFixed(0)}/mo potential savings`
    const ogDescription = `I audited my AI tool spend with SpendSense. ${actionCount} optimisation${actionCount !== 1 ? 's' : ''} found across ${tools.length} tool${tools.length !== 1 ? 's' : ''}.`
    const ogUrl         = shareUrl || (typeof window !== 'undefined' ? window.location.href : '')

    // ── No data ────────────────────────────────────────────────────────────────
    if (loaded && tools.length === 0) {
        return (
            <>
                <PageStyles />
                <Navbar />
                <div
                    className="min-h-screen flex flex-col items-center justify-center"
                    style={{ background: '#F4F6FB' }}
                >
                    <div className="text-center max-w-[440px]">
                        <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-6">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#3B6FFF" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <h2 className="heading-font text-[28px] font-bold text-[#0A1628] mb-3">No Audit Data Found</h2>
                        <p className="text-[15px] text-[#6B7A9B] leading-relaxed mb-8">
                            Run an audit first so we can generate your personalised recommendations.
                        </p>
                        <Link
                            href="/auditpage"
                            className="inline-flex items-center gap-2 bg-[#0A1628] hover:bg-[#162240] text-white px-8 py-3.5 rounded-[14px] text-[15px] font-semibold transition-all shadow-[0_4px_24px_rgba(10,22,40,0.18)]"
                        >
                            Go to Audit →
                        </Link>
                    </div>
                </div>
            </>
        )
    }

    // ── Main render ────────────────────────────────────────────────────────────
    return (
        <>
            {/* OG / Twitter meta for share previews */}
            <Head>
                <title>{ogTitle}</title>
                <meta name="description" content={ogDescription} />
                <meta property="og:title"       content={ogTitle} />
                <meta property="og:description" content={ogDescription} />
                <meta property="og:url"         content={ogUrl} />
                <meta property="og:type"        content="website" />
                <meta name="twitter:card"       content="summary_large_image" />
                <meta name="twitter:title"      content={ogTitle} />
                <meta name="twitter:description" content={ogDescription} />
            </Head>

            <PageStyles />
            <Navbar />

            <div
                className="min-h-screen bg-[#F4F6FB]"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 20% 10%, rgba(59,111,255,0.06) 0%, transparent 55%), radial-gradient(circle at 80% 90%, rgba(99,210,190,0.05) 0%, transparent 50%)',
                }}
            >
                <div
    id="audit-report"
    className="max-w-[1100px] mx-auto px-6 pt-14 pb-24"
>

                    {/* ── Header ──────────────────────────────────────────────────────── */}
                    <div className="mb-10">
                        <div className="inline-flex items-center gap-2 bg-white border border-[#E0E7FF] rounded-full px-4 py-1.5 mb-5">
                            <span className="w-2 h-2 rounded-full bg-[#3B6FFF] inline-block" />
                            <span className="text-[13px] font-medium text-[#3B6FFF] tracking-wide">Audit Intelligence</span>
                        </div>
                        <div className="flex items-start justify-between gap-6 flex-wrap">
                            <div>
                                <h1 className="heading-font text-[52px] font-extrabold text-[#0A1628] leading-none tracking-tight">
                                    Recommendations
                                </h1>
                                <p className="mt-3 text-[16px] text-[#6B7A9B] font-light leading-relaxed max-w-[500px]">
                                    Workflow-aware analysis of your AI stack. Every suggestion is reasoned, not hardcoded.
                                </p>
                            </div>
                            <button
                                onClick={downloadPDF}
                                className="flex-shrink-0 text-[12px] font-semibold text-white bg-[#3B6FFF] px-4 py-2.5 rounded-[12px] mb-2"
                            >
                                Download PDF
                            </button>
                            {/* Share button in header */}
                            {shareUrl && (
                                <div className="flex-shrink-0 mt-2">
                                    <ShareButton shareUrl={shareUrl} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Summary stat cards ───────────────────────────────────────────── */}
                    <div className="grid grid-cols-4 gap-4 mb-10">
                        <SummaryCard
                            label="Monthly Spend"
                            value={`$${totalMonthly.toFixed(2)}`}
                            sub="across all tools"
                            accent="#3B6FFF"
                        />
                        <SummaryCard
                            label="Annual Projection"
                            value={`$${(totalMonthly * 12).toFixed(2)}`}
                            sub="if unchanged"
                            accent="#6366F1"
                        />
                        <SummaryCard
                            label="Potential Savings"
                            value={`$${totalSavings.toFixed(2)}`}
                            sub="per month"
                            accent="#10B981"
                            green
                        />
                        <div className="stat-card flex flex-col justify-between">
                            <p className="text-[11px] font-semibold text-[#9AA3B8] uppercase tracking-widest">Portfolio Score</p>
                            <div className="flex items-end gap-3 mt-2">
                                <div>
                                    <p className="text-[11px] text-[#9AA3B8] mb-0.5">Current</p>
                                    <p className="heading-font text-[28px] font-bold" style={{ color: scoreColor(avgCurrentScore).ring }}>
                                        {avgCurrentScore}
                                    </p>
                                </div>
                                {avgOptScore > avgCurrentScore && (
                                    <>
                                        <span className="text-[#CBD5E1] text-[20px] mb-1.5">→</span>
                                        <div>
                                            <p className="text-[11px] text-[#10B981] mb-0.5">Optimised</p>
                                            <p className="heading-font text-[28px] font-bold text-[#10B981]">{avgOptScore}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {actionCount > 0 && (
                                <p className="text-[12px] text-[#F59E0B] font-medium mt-1">
                                    {actionCount} action{actionCount !== 1 ? 's' : ''} recommended
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── AI Summary ──────────────────────────────────────────────────── */}
                    {(aiLoading || aiSummary) && (
                        <AISummaryBlock summary={aiSummary} loading={aiLoading} />
                    )}

                    {/* ── Credex CTA (>$500/mo savings) ───────────────────────────────── */}
                    {isHighSavings && (
                        <CredexBanner savings={totalSavings} onCTA={() => setShowModal(true)} />
                    )}

                    {/* ── Optimal / low-savings banner (<$100/mo, no actions) ──────────── */}
                    {isOptimal && (
                        <OptimalBanner onNotify={() => setShowModal(true)} />
                    )}

                    {/* ── Result cards ─────────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-5">
                        {results.map((result, idx) => {
                            const meta     = STATUS_META[result.status]
                            const isExp    = expanded === idx
                            const alt      = result.bestAlternative
                            const hasAction = result.status !== 'optimal'

                            return (
                                <div
                                    key={idx}
                                    className="rec-card"
                                    style={{ borderLeft: hasAction ? `3px solid ${meta.dot}` : '3px solid transparent' }}
                                >
                                    {/* Card header */}
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                                <h3 className="heading-font text-[20px] font-bold text-[#0A1628]">
                                                    {capitalize(result.toolEntry.tool)}
                                                </h3>
                                                <span className="text-[12px] text-[#9AA3B8] bg-[#F4F6FB] px-2.5 py-1 rounded-full font-medium">
                          {formatPlanLabel(result.toolEntry.plan)}
                        </span>
                                                <span
                                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                                                    style={{ background: meta.bg, color: meta.text }}
                                                >
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.dot }} />
                                                    {meta.label}
                        </span>
                                            </div>

                                            <div className="flex items-center gap-5 text-[13px] text-[#9AA3B8] flex-wrap">
                        <span>
                          <span className="text-[#0A1628] font-semibold">${Number(result.toolEntry.price).toFixed(2)}</span>/mo
                        </span>
                                                <span className="w-1 h-1 rounded-full bg-[#D4DCE8]" />
                                                <span>{result.toolEntry.users} user{Number(result.toolEntry.users) !== 1 ? 's' : ''}</span>
                                                <span className="w-1 h-1 rounded-full bg-[#D4DCE8]" />
                                                <span>{result.toolEntry.DailyUsage} usage</span>
                                                <span className="w-1 h-1 rounded-full bg-[#D4DCE8]" />
                                                <span>{result.toolEntry.task}</span>
                                            </div>

                                            {result.insights.length > 0 && (
                                                <p className="mt-3 text-[13.5px] text-[#4A5568] leading-relaxed max-w-[580px]">
                                                    {result.insights[0]}
                                                </p>
                                            )}

                                            {alt && (
                                                <div className="mt-4 flex items-center gap-3 flex-wrap">
                                                    <div
                                                        className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px]"
                                                        style={{ background: '#EFF6FF', color: '#1E40AF' }}
                                                    >
                                                        <span>→</span>
                                                        <span>
                              Switch to {capitalize(alt.tool)} {formatPlanLabel(alt.plan)}
                                                            {' '}· ${alt.price}/mo
                            </span>
                                                    </div>
                                                    <span className="text-[12px] text-[#10B981] font-semibold bg-[#ECFDF5] px-3 py-1.5 rounded-[8px]">
                            Save ${alt.savings.toFixed(2)}/mo · ${(alt.savings * 12).toFixed(0)}/yr
                          </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Score rings */}
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="text-center">
                                                <p className="text-[10px] font-semibold text-[#9AA3B8] uppercase tracking-wider mb-2">Current</p>
                                                <ScoreRing score={result.currentScore} size={58} />
                                            </div>
                                            {result.optimizedScore > result.currentScore && (
                                                <>
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-5">
                                                        <path d="M3 7h8M8 4l3 3-3 3" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-semibold text-[#10B981] uppercase tracking-wider mb-2">Optimised</p>
                                                        <ScoreRing score={result.optimizedScore} size={58} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expand toggle */}
                                    <button
                                        onClick={() => setExpanded(isExp ? null : idx)}
                                        className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-[#9AA3B8] hover:text-[#3B6FFF] transition-colors"
                                    >
                                        <span>{isExp ? 'Hide' : 'Show'} fit breakdown</span>
                                        <svg
                                            width="12" height="12" viewBox="0 0 12 12" fill="none"
                                            style={{ transform: isExp ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}
                                        >
                                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>

                                    {isExp && (
                                        <div className="mt-5 pt-5 border-t border-[#EDF0F7]">
                                            <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                                                {(Object.entries(result.fitBreakdown) as [string, number][]).map(([key, val]) => (
                                                    <FitBar key={key} label={FIT_LABELS[key]} value={val} icon={FIT_ICONS[key]} />
                                                ))}
                                            </div>

                                            {result.insights.length > 1 && (
                                                <div className="mt-5 flex flex-col gap-2">
                                                    {result.insights.slice(1).map((ins, i) => (
                                                        <div key={i} className="flex items-start gap-2.5 text-[13px] text-[#4A5568]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] mt-1.5 flex-shrink-0" />
                                                            {ins}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* ── Bottom bar ───────────────────────────────────────────────────── */}
                    {results.length > 0 && (
                        <div className="mt-10 flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/auditpage"
                                    className="text-[14px] font-medium text-[#6B7A9B] hover:text-[#3B6FFF] transition-colors flex items-center gap-1.5"
                                >
                                    ← Edit Audit
                                </Link>

                                {/* Email capture CTA */}
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="cta-btn-primary"
                                    style={{ fontSize: '13px', padding: '10px 20px' }}
                                >
                                    {isHighSavings ? '📅 Book Credex consultation' : '📧 Email this audit'}
                                </button>
                            </div>

                            {totalSavings > 0 && (
                                <div className="text-right">
                                    <p className="text-[13px] text-[#9AA3B8]">
                                        Implementing all recommendations saves
                                    </p>
                                    <p className="heading-font text-[22px] font-bold text-[#10B981]">
                                        ${totalSavings.toFixed(2)}/mo · ${(totalSavings * 12).toFixed(0)}/yr
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Lead capture modal ───────────────────────────────────────────────── */}
            <LeadCaptureModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                totalSavings={totalSavings}
                onSubmit={handleLeadSubmit}
            />
        </>
    )
}
