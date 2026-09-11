'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '../navbar/page'

type AuditItem = {
    id: string
    createdAt: string
    totalTools: number
    totalSpend: number
    totalSavings: number
}

export default function AuditHistoryPage() {

    const [audits, setAudits] = useState<AuditItem[]>([])

    useEffect(() => {

        const storedAudits: AuditItem[] = []

        Object.keys(localStorage).forEach((key) => {

            if (key.startsWith('audit_history_')) {

                try {

                    const data = JSON.parse(
                        localStorage.getItem(key) || '{}'
                    )

                    storedAudits.push(data)

                } catch {}

            }

        })

        storedAudits.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        )

        const timer = window.setTimeout(() => setAudits(storedAudits), 0)
        return () => window.clearTimeout(timer)

    }, [])

    return (

        <>
            <Navbar />

            <div className="min-h-screen bg-[#F4F6FB] px-6 py-12">

                <div className="max-w-5xl mx-auto">

                    <div className="mb-10">

                        <h1 className="text-5xl font-black text-[#0A1628]">
                            AuditHistory
                        </h1>

                        <p className="text-[#6B7A9B] mt-3 text-lg">
                            Previously generated AI spend audits.
                        </p>

                    </div>

                    {audits.length === 0 ? (

                        <div className="bg-white border border-[#E8EDF5] rounded-3xl p-12 text-center">

                            <h2 className="text-2xl font-bold text-[#0A1628]">
                                No audits yet
                            </h2>

                            <p className="text-[#6B7A9B] mt-3">
                                Your completed audits will appear here.
                            </p>

                            <Link
                                href="/auditpage"
                                className="inline-block mt-6 bg-[#3B6FFF] text-white px-6 py-3 rounded-2xl font-semibold"
                            >
                                Start Audit
                            </Link>

                        </div>

                    ) : (

                        <div className="grid gap-5">

                            {audits.map((audit) => (

                                <div
                                    key={audit.id}
                                    className="bg-white border border-[#E8EDF5] rounded-3xl p-7 flex items-center justify-between"
                                >

                                    <div>

                                        <p className="text-sm text-[#9AA3B8]">
                                            {new Date(
                                                audit.createdAt
                                            ).toLocaleString()}
                                        </p>

                                        <h2 className="text-2xl font-bold text-[#0A1628] mt-2">
                                            {audit.totalTools} Tools Audited
                                        </h2>

                                        <div className="flex gap-6 mt-4 flex-wrap">

                                            <div>
                                                <p className="text-sm text-[#9AA3B8]">
                                                    Monthly Spend
                                                </p>

                                                <p className="text-lg font-bold text-[#0A1628]">
                                                    ${audit.totalSpend.toFixed(2)}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-[#9AA3B8]">
                                                    Potential Savings
                                                </p>

                                                <p className="text-lg font-bold text-[#10B981]">
                                                    ${audit.totalSavings.toFixed(2)}
                                                </p>
                                            </div>

                                        </div>

                                    </div>

                                    <Link
                                        href={`/audit/${audit.id}`}
                                        className="bg-[#0A1628] text-white px-5 py-3 rounded-2xl font-semibold"
                                    >
                                        View Audit
                                    </Link>

                                </div>

                            ))}

                        </div>

                    )}

                </div>

            </div>
        </>
    )
}
