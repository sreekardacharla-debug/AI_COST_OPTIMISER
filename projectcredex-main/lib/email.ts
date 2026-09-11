type LeadEmailInput = {
    email: string
    company?: string
    totalSavings?: number
    auditId?: string
    isHighSavings?: boolean
}

type EmailResult = {
    sent: boolean
    skipped?: boolean
    error?: string
}

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

export async function sendLeadConfirmationEmail(input: LeadEmailInput): Promise<EmailResult> {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
        return {
            sent: false,
            skipped: true,
            error: 'RESEND_API_KEY is not configured',
        }
    }

    const from = process.env.RESEND_FROM_EMAIL || 'OptiBlue AI <onboarding@resend.dev>'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://projectcredex.vercel.app'
    const savings = Number(input.totalSavings || 0)
    const shareUrl = input.auditId ? `${siteUrl}/audit/${encodeURIComponent(input.auditId)}` : siteUrl
    const companyLine = input.company ? ` for ${escapeHtml(input.company)}` : ''
    const highSavingsLine = input.isHighSavings
        ? '<p>Your audit showed a high savings opportunity. A Credex advisor can help review discounted AI credits and next steps.</p>'
        : '<p>We will notify you when new optimizations apply to your stack.</p>'

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: input.email,
            subject: savings > 0
                ? `Your AI spend audit found $${savings.toFixed(0)}/mo in possible savings`
                : 'Your AI spend audit report',
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:620px;margin:0 auto;padding:24px;">
                    <h1 style="font-size:24px;margin-bottom:12px;">Your OptiBlue AI audit is ready${companyLine}</h1>
                    <p>Thanks for running an AI spend audit. Your estimated monthly savings are <strong>$${savings.toFixed(2)}</strong>.</p>
                    ${highSavingsLine}
                    <p><a href="${shareUrl}" style="color:#2563eb;">View your shareable audit report</a></p>
                    <p style="font-size:13px;color:#6b7280;">This report does not require an account. Public audit links exclude email and company details.</p>
                </div>
            `,
            text: `Your OptiBlue AI audit is ready. Estimated monthly savings: $${savings.toFixed(2)}. View it here: ${shareUrl}`,
        }),
    })

    if (!response.ok) {
        const message = await response.text()

        return {
            sent: false,
            error: message,
        }
    }

    return {
        sent: true,
    }
}
