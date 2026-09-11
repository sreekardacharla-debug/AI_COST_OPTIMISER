import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
}) : null

export async function POST(req: Request) {

    try {

        if (!anthropic) {
            return NextResponse.json(
                {
                    success: true,
                    summary: 'Audit completed successfully. API key not configured for detailed analysis.'
                }
            )
        }

        const body = await req.json()

        const { auditData } = body

        const prompt = `
You are reviewing an AI tool spend audit.

Team size: ${auditData.teamSize}

Primary use case:
${auditData.useCase}

Total monthly spend:
$${auditData.totalMonthlySpend}

Potential monthly savings:
$${auditData.totalSavings}

Tools:
${auditData.tools.map((t: any) => `
- ${t.name}
Plan: ${t.plan}
Spend: $${t.currentSpend}
Recommendation: ${t.recommendation}
Savings: $${t.savings}
`).join('')}

Write a personalised 100-word optimisation summary.
Reference exact tools and savings.
Do not give generic advice.
`

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            system:
                'You are an AI SaaS optimisation advisor helping teams reduce AI software costs.',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })

        const summary =
            message.content[0]?.type === 'text'
                ? message.content[0].text
                : getFallbackSummary(auditData)

        return NextResponse.json({
            success: true,
            summary
        })

    } catch (error) {

        console.error(error)

        return NextResponse.json(
            {
                success: false,
                summary:
                    'Your audit identified optimisation opportunities across your AI stack. Review plan sizing, overlapping tools, and unused seats to reduce unnecessary spend.'
            },
            {
                status: 500
            }
        )
    }
}

function getFallbackSummary(auditData: any) {

    if (!auditData) {
        return 'Audit completed successfully.'
    }

    return `
Your team is currently spending $${auditData.totalMonthlySpend}/month on AI tools.

The audit identified approximately $${auditData.totalSavings}/month in potential savings opportunities.

Reviewing plan sizing and consolidating overlapping tools could improve overall efficiency while reducing unnecessary spending.
`
}