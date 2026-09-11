'use client'
// app/auditpage/page.tsx
// The primary user-facing audit form.
// Saves state to localStorage on every keystroke so progress survives refreshes.
// On submit → saves to API for shareable URL + navigates to /recommendations.

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../navbar/page'
import { type ToolEntry } from '../../lib/audit-engine'

// ─── TOOL CONFIG ──────────────────────────────────────────────────────────────

type PlanDef = { key: string; label: string; price: number | null }
type ToolDef = { label: string; icon: string; plans: PlanDef[] }

const TOOLS_CONFIG: Record<string, ToolDef> = {
    cursor: {
        label: 'Cursor', icon: '⌗',
        plans: [
            { key: 'hobby',      label: 'Hobby (Free)',      price: 0  },
            { key: 'pro',        label: 'Pro',               price: 20 },
            { key: 'business',   label: 'Business',          price: 40 },
            { key: 'enterprise', label: 'Enterprise',        price: 60 },
        ],
    },
    copilot: {
        label: 'GitHub Copilot', icon: '◎',
        plans: [
            { key: 'individual', label: 'Individual',  price: 10 },
            { key: 'business',   label: 'Business',   price: 19 },
            { key: 'enterprise', label: 'Enterprise', price: 39 },
        ],
    },
    claude: {
        label: 'Claude', icon: '◈',
        plans: [
            { key: 'free',       label: 'Free',           price: 0    },
            { key: 'pro',        label: 'Pro',            price: 20   },
            { key: 'max_5x',     label: 'Max (5×)',       price: 100  },
            { key: 'max_20x',    label: 'Max (20×)',      price: 200  },
            { key: 'team',       label: 'Team',           price: 25   },
            { key: 'enterprise', label: 'Enterprise',     price: null },
            { key: 'api_direct', label: 'API Direct',     price: 0    },
        ],
    },
    chatgpt: {
        label: 'ChatGPT', icon: '⊕',
        plans: [
            { key: 'plus',       label: 'Plus',         price: 20  },
            { key: 'pro_100',    label: 'Pro ($100)',    price: 100 },
            { key: 'pro_200',    label: 'Pro ($200)',    price: 200 },
            { key: 'business',   label: 'Business',     price: 20  },
            { key: 'enterprise', label: 'Enterprise',   price: 60  },
            { key: 'api_direct', label: 'API Direct',   price: 0   },
        ],
    },
    anthropic_api: {
        label: 'Anthropic API', icon: '∆',
        plans: [
            { key: 'api_direct', label: 'API Direct (pay-as-you-go)', price: 0 },
        ],
    },
    openai_api: {
        label: 'OpenAI API', icon: '○',
        plans: [
            { key: 'api_direct', label: 'API Direct (pay-as-you-go)', price: 0 },
        ],
    },
    gemini: {
        label: 'Gemini', icon: '◇',
        plans: [
            { key: 'pro',   label: 'Pro',   price: 19.99  },
            { key: 'ultra', label: 'Ultra', price: 249.99 },
            { key: 'api',   label: 'API',   price: 0      },
        ],
    },
    windsurf: {
        label: 'Windsurf', icon: '≋',
        plans: [
            { key: 'free',  label: 'Free',  price: 0  },
            { key: 'pro',   label: 'Pro',   price: 15 },
            { key: 'teams', label: 'Teams', price: 35 },
        ],
    },
}

const TOOL_KEYS = Object.keys(TOOLS_CONFIG)

const USE_CASES = [
    { value: 'coding',   label: '💻 Coding & Engineering' },
    { value: 'writing',  label: '✍️ Writing & Content' },
    { value: 'research', label: '🔍 Research & Analysis' },
    { value: 'data',     label: '📊 Data & Analytics' },
    { value: 'mixed',    label: '🔀 Mixed / General' },
]

const USAGE_LEVELS = [
    { value: 'light',  label: 'Light',  desc: 'Few times a week' },
    { value: 'medium', label: 'Medium', desc: 'Daily, moderate sessions' },
    { value: 'heavy',  label: 'Heavy',  desc: 'All day, intensive use' },
]

// ─── TYPES ────────────────────────────────────────────────────────────────────

type FormEntry = ToolEntry & { id: string }  // adds a stable React key

type FieldErrors = {
    tool?: string
    plan?: string
    price?: string
    users?: string
}

type FormErrors = Record<string, FieldErrors>

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function uid(): string {
    return Math.random().toString(36).slice(2, 9)
}

function defaultEntry(): FormEntry {
    return {
        id:         uid(),
        tool:       '',
        plan:       '',
        task:       'coding',
        users:      '1',
        price:      '',
        DailyUsage: 'medium',
    }
}

function validateEntry(entry: FormEntry): FieldErrors {
    const errs: FieldErrors = {}
    if (!entry.tool)  errs.tool  = 'Select a tool.'
    if (!entry.plan)  errs.plan  = 'Select a plan.'
    if (entry.price === '' || isNaN(Number(entry.price)) || Number(entry.price) < 0)
        errs.price = 'Enter a valid monthly spend (0 or more).'
    if (!entry.users || isNaN(Number(entry.users)) || Number(entry.users) < 1)
        errs.users = 'Enter at least 1 user.'
    return errs
}

function stripId(entries: FormEntry[]): ToolEntry[] {
    return entries.map(entry => ({
        tool: entry.tool,
        plan: entry.plan,
        task: entry.task,
        users: entry.users,
        price: entry.price,
        DailyUsage: entry.DailyUsage,
    }))
}

function autofillPrice(toolKey: string, planKey: string): string {
    const plans = TOOLS_CONFIG[toolKey]?.plans ?? []
    const plan  = plans.find(p => p.key === planKey)
    if (plan && plan.price !== null) return String(plan.price)
    return ''
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AuditPage() {
    const router = useRouter()
    const [entries, setEntries]       = useState<FormEntry[]>([defaultEntry()])
    const [errors, setErrors]         = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)
    const [submitErr, setSubmitErr]   = useState('')
    const [hydrated, setHydrated]     = useState(false)

    // ── Restore from localStorage on mount ──────────────────────────────────
    useEffect(() => {
        try {
            const saved = localStorage.getItem('auditDraft')
            if (saved) {
                const parsed: FormEntry[] = JSON.parse(saved)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Ensure every entry has an id
                    const restored = parsed.map(e => ({ ...e, id: e.id ?? uid() }))
                    window.setTimeout(() => setEntries(restored), 0)
                }
            }
        } catch {}
        const timer = window.setTimeout(() => setHydrated(true), 0)
        return () => window.clearTimeout(timer)
    }, [])

    // ── Persist to localStorage on every change ──────────────────────────────
    useEffect(() => {
        if (!hydrated) return
        try { localStorage.setItem('auditDraft', JSON.stringify(entries)) } catch {}
    }, [entries, hydrated])

    // ── Entry mutations ──────────────────────────────────────────────────────

    const updateEntry = useCallback((id: string, patch: Partial<FormEntry>) => {
        setEntries(prev => prev.map(e => {
            if (e.id !== id) return e
            const updated = { ...e, ...patch }

            // Auto-fill price when plan changes and user hasn't manually typed
            if (patch.plan && !patch.price) {
                const autoPrice = autofillPrice(updated.tool, updated.plan)
                if (autoPrice !== '') updated.price = autoPrice
            }

            // Reset plan if tool changes
            if (patch.tool && patch.tool !== e.tool) {
                updated.plan  = ''
                updated.price = ''
            }

            return updated
        }))
        // Clear errors for this entry
        setErrors(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }, [])

    const addEntry = useCallback(() => {
        setEntries(prev => [...prev, defaultEntry()])
    }, [])

    const removeEntry = useCallback((id: string) => {
        setEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev)
        setErrors(prev => { const next = { ...prev }; delete next[id]; return next })
    }, [])

    // ── Validation + submit ──────────────────────────────────────────────────

    async function handleSubmit() {
        const newErrors: FormErrors = {}
        let hasErrors = false

        entries.forEach(entry => {
            const errs = validateEntry(entry)
            if (Object.keys(errs).length > 0) {
                newErrors[entry.id] = errs
                hasErrors = true
            }
        })

        if (hasErrors) {
            setErrors(newErrors)
            // Scroll to first error
            const firstErrId = Object.keys(newErrors)[0]
            document.getElementById(`entry-${firstErrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }

        setSubmitting(true)
        setSubmitErr('')

        const auditData = stripId(entries)

        try {
            // 1. Save to localStorage (recommendations page reads this)
            localStorage.setItem('auditData', JSON.stringify(auditData))

            // 2. POST to API to get a shareable ID
            let shareId: string | null = null
            try {
                const res = await fetch('/api/audits', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ tools: auditData }),
                })
                if (res.ok) {
                    const data = await res.json()
                    shareId = data.id ?? null
                    if (shareId) localStorage.setItem('auditShareId', shareId)
                }
            } catch (apiErr) {
                // Non-fatal — recommendations page will still work via localStorage
                console.warn('Audit API unavailable, proceeding with localStorage only.', apiErr)
            }

            // 3. Navigate to recommendations
            router.push('/recommendations')
        } catch (err) {
            console.error(err)
            setSubmitErr('Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────

    if (!hydrated) return null  // avoid hydration mismatch

    const totalPreviewMonthly = entries.reduce((sum, e) => {
        const price = Number(e.price) || 0
        // For per-seat plans, price entered is already total (user enters total monthly)
        return sum + price
    }, 0)

    return (
        <>
            <AuditStyles />
            <Navbar />

            <div
                className="min-h-screen"
                style={{
                    background: '#F4F6FB',
                    backgroundImage: 'radial-gradient(circle at 15% 10%, rgba(59,111,255,0.07) 0%, transparent 50%), radial-gradient(circle at 85% 90%, rgba(99,210,190,0.05) 0%, transparent 50%)',
                }}
            >
                <div className="max-w-[780px] mx-auto px-5 pt-14 pb-28">

                    {/* ── Header ──────────────────────────────────────────────────── */}
                    <div className="mb-10">
                        <div className="inline-flex items-center gap-2 bg-white border border-[#E0E7FF] rounded-full px-4 py-1.5 mb-5">
                            <span className="w-2 h-2 rounded-full bg-[#3B6FFF] inline-block animate-pulse" />
                            <span className="text-[13px] font-medium text-[#3B6FFF] tracking-wide">Free AI Spend Audit</span>
                        </div>
                        <h1 className="heading-font text-[48px] font-extrabold text-[#0A1628] leading-none tracking-tight">
                            Audit Your<br />AI Stack
                        </h1>
                        <p className="mt-4 text-[15px] text-[#6B7A9B] font-light leading-relaxed max-w-[460px]">
                            Add every AI tool you pay for. We&apos;ll tell you exactly where you&apos;re overspending and what to do about it.
                            No login required.
                        </p>
                    </div>

                    {/* ── Tool entries ──────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4">
                        {entries.map((entry, idx) => (
                            <ToolEntryCard
                                key={entry.id}
                                entry={entry}
                                index={idx}
                                errors={errors[entry.id] ?? {}}
                                onUpdate={patch => updateEntry(entry.id, patch)}
                                onRemove={() => removeEntry(entry.id)}
                                canRemove={entries.length > 1}
                            />
                        ))}
                    </div>

                    {/* ── Add tool button ───────────────────────────────────────── */}
                    <button onClick={addEntry} className="add-tool-btn mt-4">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        Add another tool
                    </button>


                    {/* ── Preview bar ───────────────────────────────────────────── */}
                    {totalPreviewMonthly > 0 && (
                        <div className="preview-bar mt-6">
                            <span className="text-[13px] text-[#6B7A9B]">Current monthly total</span>
                            <span className="heading-font text-[20px] font-bold text-[#0A1628]">
                ${totalPreviewMonthly.toFixed(2)}/mo
              </span>
                            <span className="text-[12px] text-[#9AA3B8]">
                = ${(totalPreviewMonthly * 12).toFixed(0)}/yr
              </span>
                        </div>
                    )}

                    {/* ── Submit ────────────────────────────────────────────────── */}
                    {submitErr && (
                        <p className="mt-4 text-[13px] text-red-500 text-center">{submitErr}</p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="submit-btn mt-6 w-full"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analysing your stack…
              </span>
                        ) : (
                            <>Analyse my AI spend →</>
                        )}
                    </button>

                    <p className="text-center text-[12px] text-[#B0B9CC] mt-4">
                        No account required. Your data stays in your browser until you choose to share it.
                    </p>
                </div>
            </div>
        </>
    )
}

// ─── TOOL ENTRY CARD ──────────────────────────────────────────────────────────

function ToolEntryCard({
                           entry, index, errors, onUpdate, onRemove, canRemove,
                       }: {
    entry: FormEntry
    index: number
    errors: FieldErrors
    onUpdate: (patch: Partial<FormEntry>) => void
    onRemove: () => void
    canRemove: boolean
}) {
    const plans = entry.tool ? (TOOLS_CONFIG[entry.tool]?.plans ?? []) : []

    return (
        <div id={`entry-${entry.id}`} className="tool-card">
            {/* Card header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    {entry.tool ? (
                        <span className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[16px]">
              {TOOLS_CONFIG[entry.tool]?.icon ?? '◻'}
            </span>
                    ) : (
                        <span className="w-8 h-8 rounded-lg bg-[#F4F6FB] border-2 border-dashed border-[#D4DCE8] flex items-center justify-center text-[#9AA3B8] text-[12px] font-bold">
              {index + 1}
            </span>
                    )}
                    <span className="text-[14px] font-semibold text-[#0A1628]">
            {entry.tool ? TOOLS_CONFIG[entry.tool]?.label : `Tool ${index + 1}`}
          </span>
                </div>
                {canRemove && (
                    <button onClick={onRemove} className="remove-btn" aria-label="Remove this tool">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                    </button>
                )}
            </div>

            {/* Row 1: Tool + Plan */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="field-label">AI Tool *</label>
                    <select
                        value={entry.tool}
                        onChange={e => onUpdate({ tool: e.target.value })}
                        className={`field-select ${errors.tool ? 'field-error' : ''}`}
                    >
                        <option value="" disabled>Select a tool…</option>
                        {TOOL_KEYS.map(key => (
                            <option key={key} value={key}>{TOOLS_CONFIG[key].label}</option>
                        ))}
                    </select>
                    {errors.tool && <p className="field-err-msg">{errors.tool}</p>}
                </div>

                <div>
                    <label className="field-label">Plan *</label>
                    <select
                        value={entry.plan}
                        onChange={e => onUpdate({ plan: e.target.value })}
                        disabled={!entry.tool}
                        className={`field-select ${errors.plan ? 'field-error' : ''} ${!entry.tool ? 'opacity-50' : ''}`}
                    >
                        <option value="" disabled>{entry.tool ? 'Select plan…' : 'Choose a tool first'}</option>
                        {plans.map(p => (
                            <option key={p.key} value={p.key}>
                                {p.label}{p.price !== null ? ` — $${p.price}/mo` : ''}
                            </option>
                        ))}
                    </select>
                    {errors.plan && <p className="field-err-msg">{errors.plan}</p>}
                </div>
            </div>

            {/* Row 2: Monthly spend + Seats */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="field-label">Monthly Spend (USD) *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA3B8] text-[14px] font-medium">$</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.price}
                            onChange={e => onUpdate({ price: e.target.value })}
                            className={`field-input pl-7 ${errors.price ? 'field-error' : ''}`}
                        />
                    </div>
                    {errors.price && <p className="field-err-msg">{errors.price}</p>}
                </div>

                <div>
                    <label className="field-label">Number of Seats *</label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={entry.users}
                        onChange={e => onUpdate({ users: e.target.value })}
                        className={`field-input ${errors.users ? 'field-error' : ''}`}
                    />
                    {errors.users && <p className="field-err-msg">{errors.users}</p>}
                </div>
            </div>

            {/* Row 3: Use case */}
            <div className="mb-3">
                <label className="field-label">Primary Use Case</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                    {USE_CASES.map(uc => (
                        <button
                            key={uc.value}
                            type="button"
                            onClick={() => onUpdate({ task: uc.value })}
                            className={`use-case-chip ${entry.task === uc.value ? 'use-case-chip-active' : ''}`}
                        >
                            {uc.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Row 4: Daily usage */}
            <div>
                <label className="field-label">Daily Usage Intensity</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {USAGE_LEVELS.map(ul => (
                        <button
                            key={ul.value}
                            type="button"
                            onClick={() => onUpdate({ DailyUsage: ul.value })}
                            className={`usage-btn ${entry.DailyUsage === ul.value ? 'usage-btn-active' : ''}`}
                        >
                            <span className="text-[13px] font-semibold">{ul.label}</span>
                            <span className="text-[11px] text-[#9AA3B8] mt-0.5">{ul.desc}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

function AuditStyles() {
    return (
        <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
      .heading-font { font-family: 'Syne', sans-serif; }

      /* Tool card */
      .tool-card {
        background: #fff;
        border: 1.5px solid #E8EDF5;
        border-radius: 20px;
        padding: 24px 26px;
        transition: box-shadow .18s;
      }
      .tool-card:hover { box-shadow: 0 4px 20px rgba(59,111,255,0.06); }

      /* Fields */
      .field-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #9AA3B8;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 6px;
      }
      .field-input, .field-select {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #E8EDF5;
        border-radius: 11px;
        font-size: 14px;
        color: #0A1628;
        background: #F9FAFB;
        outline: none;
        transition: border-color .15s, background .15s;
        appearance: none;
      }
      .field-input:focus, .field-select:focus {
        border-color: #3B6FFF;
        background: white;
      }
      .field-input::placeholder { color: #C0C9D8; }
      .field-error { border-color: #EF4444 !important; }
      .field-err-msg {
        font-size: 11px;
        color: #EF4444;
        margin-top: 4px;
      }

      /* Use case chips */
      .use-case-chip {
        font-size: 12px;
        font-weight: 500;
        padding: 7px 14px;
        border-radius: 20px;
        border: 1.5px solid #E8EDF5;
        background: white;
        color: #6B7A9B;
        cursor: pointer;
        transition: all .15s;
        white-space: nowrap;
      }
      .use-case-chip:hover { border-color: #3B6FFF; color: #3B6FFF; }
      .use-case-chip-active {
        border-color: #3B6FFF !important;
        background: #EEF4FF !important;
        color: #3B6FFF !important;
        font-weight: 600;
      }

      /* Usage intensity buttons */
      .usage-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px 8px;
        border-radius: 12px;
        border: 1.5px solid #E8EDF5;
        background: white;
        color: #0A1628;
        cursor: pointer;
        transition: all .15s;
      }
      .usage-btn:hover { border-color: #3B6FFF; }
      .usage-btn-active {
        border-color: #3B6FFF !important;
        background: #EEF4FF !important;
      }
      .usage-btn-active span:first-child { color: #3B6FFF !important; }

      /* Remove button */
      .remove-btn {
        width: 30px; height: 30px;
        border-radius: 8px;
        border: 1.5px solid #E8EDF5;
        background: white;
        color: #9AA3B8;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: all .15s;
      }
      .remove-btn:hover { border-color: #EF4444; color: #EF4444; background: #FEF2F2; }

      /* Add tool button */
      .add-tool-btn {
        width: 100%;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 14px;
        border: 2px dashed #D4DCE8;
        border-radius: 16px;
        background: transparent;
        color: #9AA3B8;
        font-size: 14px; font-weight: 500;
        cursor: pointer;
        transition: all .15s;
      }
      .add-tool-btn:hover { border-color: #3B6FFF; color: #3B6FFF; background: #F5F8FF; }

      /* Preview bar */
      .preview-bar {
        background: white;
        border: 1.5px solid #E8EDF5;
        border-radius: 14px;
        padding: 14px 20px;
        display: flex; align-items: center; gap: 16px;
      }

      /* Submit button */
      .submit-btn {
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #0A1628 0%, #162240 100%);
        color: white;
        font-size: 16px; font-weight: 700;
        padding: 16px 32px;
        border-radius: 16px;
        border: none; cursor: pointer;
        transition: transform .1s, box-shadow .15s;
        box-shadow: 0 6px 28px rgba(10,22,40,0.22);
        letter-spacing: 0.01em;
      }
      .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 40px rgba(10,22,40,0.28);
      }
      .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

      @keyframes spin { to { transform: rotate(360deg); } }
      .animate-spin { animation: spin 0.7s linear infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      .animate-pulse { animation: pulse 2s ease-in-out infinite; }
    `}</style>
    )
}
