import React from 'react'

type Props = {
    params: Promise<{
        id: string
    }>
}

const Page = async ({ params }: Props) => {

    const { id } = await params

    return (
        <div className="min-h-screen flex items-center justify-center text-3xl font-bold">
            Shared Audit: {id}
        </div>
    )
}

export default Page