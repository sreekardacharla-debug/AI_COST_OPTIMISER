import React from 'react'
import Navbar from '../navbar/page'

const Page = () => {
    return (
        <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] px-10">

            <div className="max-w-5xl bg-white border border-[#E8EDF5] rounded-3xl p-12 shadow-sm">

                <h1 className="text-5xl font-black text-[#0A1628] leading-tight">
                    AI Tool Cost Optimiser
                </h1>

                <p className="mt-8 text-xl leading-10 text-[#4A5875]">

                    OptiBlue AI helps users analyse how much they spend on AI tools,
                    evaluate whether their current plans match their actual usage,
                    and discover smarter alternatives for their workflow.

                    <br /><br />

                    Based on workload, team size, feature usage, and monthly spending,
                    the platform generates optimisation recommendations such as:

                    <br /><br />

                    • Upgrading to a more suitable plan
                    <br />
                    • Downgrading unused subscriptions
                    <br />
                    • Switching to more cost-efficient AI tools
                    <br />
                    • Identifying unnecessary spending
                    <br />
                    • Improving overall AI stack efficiency

                    <br /><br />

                    The application combines audit analysis, recommendation generation,
                    AI summaries, PDF exports, and shareable reports to help users make
                    better decisions about their AI software ecosystem.

                </p>

            </div>

        </div>
        </>
    )

}

export default Page