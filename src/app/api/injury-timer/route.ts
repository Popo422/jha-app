import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { injuryTimer } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const [latestTimer] = await db
      .select()
      .from(injuryTimer)
      .orderBy(desc(injuryTimer.createdAt))
      .limit(1)

    if (!latestTimer) {
      // If no timer exists, create one with current time
      const [newTimer] = await db
        .insert(injuryTimer)
        .values({
          lastResetTime: new Date(),
        })
        .returning()

      return NextResponse.json({
        lastResetTime: newTimer.lastResetTime.toISOString(),
      })
    }

    return NextResponse.json({
      lastResetTime: latestTimer.lastResetTime.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching injury timer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch injury timer' },
      { status: 500 }
    )
  }
}