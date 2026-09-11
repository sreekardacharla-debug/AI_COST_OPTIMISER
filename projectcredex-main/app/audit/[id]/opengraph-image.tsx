import { ImageResponse } from 'next/og'

export const alt = 'OptiBlue AI spend audit'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

type Props = {
    params: Promise<{
        id: string
    }>
}

export default async function Image({ params }: Props) {
    const { id } = await params

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: '#07111f',
                    color: '#ffffff',
                    padding: 72,
                    fontFamily: 'Arial, sans-serif',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ color: '#60a5fa', fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
                        OPTIBLUE AI
                    </div>
                    <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1 }}>
                        Public AI Spend Audit
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: 30, maxWidth: 820, lineHeight: 1.35 }}>
                        Shareable report with tool-level savings recommendations and no private lead details.
                    </div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 24 }}>
                    Report ID: {id}
                </div>
            </div>
        ),
        size
    )
}
