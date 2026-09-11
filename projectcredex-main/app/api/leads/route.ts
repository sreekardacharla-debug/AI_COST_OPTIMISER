import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {

    try {

        const body = await req.json()

        const { email, company, role, teamSize } = body

        const { error } = await supabase
            .from('leads')
            .insert([
                {
                    email,
                    company,
                    role,
                    team_size: teamSize
                }
            ])

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true
        })

    } catch (error) {

        console.error(error)

        return NextResponse.json(
            {
                success: false
            },
            {
                status: 500
            }
        )
    }
}