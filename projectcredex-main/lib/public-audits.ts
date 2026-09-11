import { createServerSupabaseClient } from '@/lib/supabase'
import { runAuditEngine, type ToolEntry } from '@/lib/audit-engine'

export type PublicAudit = {
    id: string
    tools: ToolEntry[]
    created_at: string
    total_spend: number
    total_savings: number
}

export function sanitizeTools(tools: unknown): ToolEntry[] {
    if (!Array.isArray(tools)) return []

    return tools
        .map((tool) => {
            const item = tool as Partial<ToolEntry>

            return {
                tool: String(item.tool || '').trim(),
                plan: String(item.plan || '').trim(),
                task: String(item.task || '').trim(),
                users: String(item.users || '1').trim(),
                price: String(item.price || '0').trim(),
                DailyUsage: String(item.DailyUsage || 'medium').trim(),
            }
        })
        .filter((tool) => tool.tool && tool.plan)
        .slice(0, 20)
}

export function summarizeAudit(tools: ToolEntry[]) {
    const results = runAuditEngine(tools)
    const totalSpend = tools.reduce((sum, tool) => sum + (Number(tool.price) || 0), 0)
    const totalSavings = results.reduce((sum, result) => sum + result.monthlySavings, 0)

    return {
        results,
        totalSpend,
        totalSavings,
    }
}

export async function getPublicAudit(id: string): Promise<PublicAudit | null> {
    if (!id) return null

    try {
        const supabase = createServerSupabaseClient()
        const { data, error } = await supabase
            .from('public_audits')
            .select('id, tools, created_at, total_spend, total_savings')
            .eq('id', id)
            .single()

        if (error || !data) return null

        return {
            id: String(data.id),
            tools: sanitizeTools(data.tools),
            created_at: String(data.created_at),
            total_spend: Number(data.total_spend || 0),
            total_savings: Number(data.total_savings || 0),
        }
    } catch {
        return null
    }
}
