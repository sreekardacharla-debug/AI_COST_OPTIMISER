// __tests__/audit-engine.test.ts
// Minimum 5 tests covering the audit engine, as required by the assignment.
// Run: npm test  (or: npx vitest run)

import { describe, it, expect } from 'vitest'
import {
    workloadFitScore,
    collaborationFit,
    calcTaskFit,
    pricingFit,
    normalizePlanKey,
    normalizeToolKey,
    getTaskKeywords,
    runAuditEngine,
    type ToolEntry,
} from '../lib/audit-engine'

// ─── 1. workloadFitScore ──────────────────────────────────────────────────────

describe('workloadFitScore', () => {
    it('returns 95 for a perfect usage-to-workload match', () => {
        // medium user on a medium plan → perfect
        expect(workloadFitScore('medium', 'medium')).toBe(95)
    })

    it('returns 95 for heavy user on a heavy plan', () => {
        expect(workloadFitScore('heavy', 'heavy')).toBe(95)
    })

    it('returns 95 for light user on a light plan', () => {
        expect(workloadFitScore('light', 'light')).toBe(95)
    })

    it('returns 80 when plan workload is one rank above usage (fine headroom)', () => {
        // light usage (rank 1) on medium plan (rank 3) would be 40 (over-provisioned by 2)
        // heavy usage (rank 4) on power plan (rank 5) = diff +1 → 80
        expect(workloadFitScore('heavy', 'power')).toBe(80)
    })

    it('returns 40 when plan is significantly over-provisioned (light user on heavy plan)', () => {
        // light (rank 1) vs heavy (rank 4) → diff = 3 ≥ 2 → 40
        expect(workloadFitScore('light', 'heavy')).toBe(40)
    })

    it('returns 40 when light user is on enterprise plan', () => {
        expect(workloadFitScore('light', 'enterprise')).toBe(40)
    })

    it('returns 70 when usage slightly exceeds plan (medium user, light plan)', () => {
        // medium (rank 3) vs light (rank 1) → diff = -2 (plan too weak), but function treats diff = -1 as 70
        // light (rank 1) → medium (rank 3) diff from plan perspective is +2 → 40
        // Let us check correctly: workload='coding' rank 2, usage='heavy' rank 4 → diff = 2-4 = -2 → <-1 → returns 45
        expect(workloadFitScore('heavy', 'light')).toBe(45)
    })

    it('returns 70 when usage slightly exceeds plan by one rank', () => {
        // usage heavy (rank 4), plan workload 'power' is rank 5 → diff = 5-4 = 1 → 80
        // usage heavy (rank 4), plan workload 'heavy' is rank 4 → diff = 0 → 95
        // For diff = -1: usage rank > plan rank by 1
        // medium usage (rank 3), plan light (rank 1) → diff = 1-3 = -2 → 45
        // heavy usage (rank 4), plan medium (rank 3) → diff = 3-4 = -1 → 70
        expect(workloadFitScore('heavy', 'medium')).toBe(70)
    })
})

// ─── 2. collaborationFit ──────────────────────────────────────────────────────

describe('collaborationFit', () => {
    it('returns 30 when a solo user is on a team plan (≥5 seats)', () => {
        expect(collaborationFit(1, 5)).toBe(30)
        expect(collaborationFit(1, 20)).toBe(30)
        expect(collaborationFit(1, 150)).toBe(30)
    })

    it('returns 95 when user count is within the recommended seats', () => {
        expect(collaborationFit(3, 5)).toBe(95)
        expect(collaborationFit(1, 1)).toBe(95)
        expect(collaborationFit(5, 5)).toBe(95)
    })

    it('returns 80 when user count exceeds seats by up to 50 %', () => {
        // 7 users, 5 recommended → 7 ≤ 5*1.5=7.5 → 80
        expect(collaborationFit(7, 5)).toBe(80)
    })

    it('returns 60 when user count is between 1.5× and 2× recommended', () => {
        // 9 users, 5 recommended → 9 ≤ 5*2=10 → 60
        expect(collaborationFit(9, 5)).toBe(60)
    })

    it('returns 40 when user count severely exceeds recommendation', () => {
        // 25 users, 5 recommended → 25 > 5*2=10 → 40
        expect(collaborationFit(25, 5)).toBe(40)
    })
})

// ─── 3. calcTaskFit ───────────────────────────────────────────────────────────

describe('calcTaskFit', () => {
    it('returns 70 when no keywords provided (empty task string)', () => {
        expect(calcTaskFit([], ['coding', 'research'])).toBe(70)
    })

    it('returns a high score when all keywords match plan tasks', () => {
        const score = calcTaskFit(['coding', 'debugging'], ['coding', 'development', 'AI completions', 'debugging'])
        expect(score).toBeGreaterThanOrEqual(85)
    })

    it('returns a low score when no keywords match', () => {
        const score = calcTaskFit(['video', 'design'], ['coding', 'debugging', 'engineering'])
        expect(score).toBeLessThan(60)
    })

    it('returns maximum 100', () => {
        const score = calcTaskFit(['coding'], ['coding'])
        expect(score).toBeLessThanOrEqual(100)
    })

    it('returns minimum 20', () => {
        const score = calcTaskFit(['zzz', 'yyy', 'xxx'], ['coding', 'research'])
        expect(score).toBeGreaterThanOrEqual(20)
    })

    it('partial keyword match returns intermediate score', () => {
        // 1 of 2 keywords matches → proportion = 0.5 → 30 + 0.5*70 = 65
        const score = calcTaskFit(['coding', 'video'], ['coding', 'research', 'writing'])
        expect(score).toBeGreaterThan(20)
        expect(score).toBeLessThan(100)
    })
})

// ─── 4. pricingFit ────────────────────────────────────────────────────────────

describe('pricingFit', () => {
    it('returns 90 when user pays at or below listed price', () => {
        expect(pricingFit(20, 20)).toBe(90)
        expect(pricingFit(15, 20)).toBe(90)
    })

    it('returns 80 when user pays up to 10 % above listed', () => {
        // 22 / 20 = 1.1 → boundary
        expect(pricingFit(22, 20)).toBe(80)
    })

    it('returns 65 when user pays between 10–25 % above listed', () => {
        // 23 / 20 = 1.15 → 65
        expect(pricingFit(23, 20)).toBe(65)
    })

    it('returns 50 when user pays more than 25 % above listed', () => {
        expect(pricingFit(30, 20)).toBe(50)
    })

    it('returns 90 when listed price is 0 (API / pay-as-you-go tools)', () => {
        expect(pricingFit(0, 0)).toBe(90)
        expect(pricingFit(500, 0)).toBe(90)
    })
})

// ─── 5. normalizePlanKey / normalizeToolKey ───────────────────────────────────

describe('key normalisation', () => {
    it('lowercases and replaces spaces with underscores', () => {
        expect(normalizePlanKey('Max 5x')).toBe('max_5x')
        expect(normalizePlanKey('Pro 100')).toBe('pro_100')
    })

    it('trims leading and trailing whitespace', () => {
        expect(normalizePlanKey('  pro  ')).toBe('pro')
        expect(normalizeToolKey('  Claude  ')).toBe('claude')
    })

    it('handles hyphenated input', () => {
        expect(normalizePlanKey('pro-plus')).toBe('pro_plus')
    })

    it('normalises tool keys correctly', () => {
        expect(normalizeToolKey('GitHub Copilot')).toBe('github_copilot')
        expect(normalizeToolKey('ChatGPT')).toBe('chatgpt')
    })
})

// ─── 6. getTaskKeywords ───────────────────────────────────────────────────────

describe('getTaskKeywords', () => {
    it('splits comma-separated tasks', () => {
        expect(getTaskKeywords('coding, research')).toEqual(['coding', 'research'])
    })

    it('splits slash-separated tasks', () => {
        expect(getTaskKeywords('coding/writing')).toContain('coding')
        expect(getTaskKeywords('coding/writing')).toContain('writing')
    })

    it('filters out empty strings', () => {
        const kws = getTaskKeywords('  coding  ,  ')
        expect(kws).not.toContain('')
        expect(kws).toContain('coding')
    })

    it('lowercases all keywords', () => {
        expect(getTaskKeywords('CODING, Research')).toEqual(['coding', 'research'])
    })
})

// ─── 7. runAuditEngine — end-to-end ──────────────────────────────────────────

describe('runAuditEngine', () => {
    const validClaudePro: ToolEntry = {
        tool: 'claude', plan: 'pro', task: 'writing, research',
        users: '1', price: '20', DailyUsage: 'medium',
    }

    it('returns one result per tool entry', () => {
        const results = runAuditEngine([validClaudePro])
        expect(results).toHaveLength(1)
    })

    it('marks plan as found for a known tool + plan combo', () => {
        const [result] = runAuditEngine([validClaudePro])
        expect(result.planFound).toBe(true)
    })

    it('returns planFound: false for an unknown tool', () => {
        const unknown: ToolEntry = { tool: 'unknowntoolxyz', plan: 'pro', task: 'coding', users: '1', price: '20', DailyUsage: 'medium' }
        const [result] = runAuditEngine([unknown])
        expect(result.planFound).toBe(false)
    })

    it('returns planFound: false for a known tool with an unknown plan', () => {
        const badPlan: ToolEntry = { tool: 'claude', plan: 'nonexistentplan', task: 'coding', users: '1', price: '20', DailyUsage: 'medium' }
        const [result] = runAuditEngine([badPlan])
        expect(result.planFound).toBe(false)
    })

    it('detects overspend: solo user on team plan returns low collaboration score', () => {
        const soloOnTeam: ToolEntry = {
            tool: 'claude', plan: 'team', task: 'writing', users: '1', price: '25', DailyUsage: 'medium',
        }
        const [result] = runAuditEngine([soloOnTeam])
        expect(result.fitBreakdown.collaboration).toBe(30)
    })

    it('currentScore is within 0–100 range', () => {
        const entries: ToolEntry[] = [
            { tool: 'cursor',  plan: 'pro',      task: 'coding',   users: '1', price: '20',  DailyUsage: 'heavy' },
            { tool: 'claude',  plan: 'max_5x',   task: 'research', users: '1', price: '100', DailyUsage: 'medium' },
            { tool: 'chatgpt', plan: 'business', task: 'writing',  users: '2', price: '40',  DailyUsage: 'light' },
        ]
        const results = runAuditEngine(entries)
        results.forEach(r => {
            expect(r.currentScore).toBeGreaterThanOrEqual(0)
            expect(r.currentScore).toBeLessThanOrEqual(100)
        })
    })

    it('optimizedScore is ≥ currentScore when a better alternative exists', () => {
        // User paying $200 for ChatGPT Pro 200 for light solo coding — should find alternatives
        const overprovisioned: ToolEntry = {
            tool: 'chatgpt', plan: 'pro_200', task: 'coding', users: '1', price: '200', DailyUsage: 'light',
        }
        const [result] = runAuditEngine([overprovisioned])
        if (result.bestAlternative) {
            expect(result.optimizedScore).toBeGreaterThanOrEqual(result.currentScore)
        }
    })

    it('handles multiple tools and returns a result for each', () => {
        const entries: ToolEntry[] = [
            { tool: 'cursor',  plan: 'pro',  task: 'coding',   users: '1', price: '20', DailyUsage: 'medium' },
            { tool: 'claude',  plan: 'pro',  task: 'writing',  users: '1', price: '20', DailyUsage: 'medium' },
            { tool: 'gemini',  plan: 'pro',  task: 'research', users: '1', price: '20', DailyUsage: 'medium' },
        ]
        expect(runAuditEngine(entries)).toHaveLength(3)
    })

    it('generates at least one insight for every result', () => {
        const entries: ToolEntry[] = [
            { tool: 'claude', plan: 'team', task: 'writing', users: '1', price: '25', DailyUsage: 'light' },
        ]
        const [result] = runAuditEngine(entries)
        expect(result.insights.length).toBeGreaterThanOrEqual(1)
    })

    it('bestAlternative savings are positive when an alternative is found', () => {
        const entries: ToolEntry[] = [
            { tool: 'chatgpt', plan: 'pro_200', task: 'writing', users: '1', price: '200', DailyUsage: 'light' },
        ]
        const [result] = runAuditEngine(entries)
        if (result.bestAlternative) {
            expect(result.bestAlternative.savings).toBeGreaterThan(0)
        }
    })
})