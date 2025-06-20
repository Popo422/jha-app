import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { injuryTimer } from '@/lib/db/schema'

export async function POST() {
  try {
    const [newTimer] = await db
      .insert(injuryTimer)
      .values({
        lastResetTime: new Date(),
        resetBy: 'system', // Could be enhanced to track actual user
      })
      .returning()

    return NextResponse.json({
      lastResetTime: newTimer.lastResetTime.toISOString(),
      message: 'Timer reset successfully',
    })
  } catch (error) {
    console.error('Error resetting injury timer:', error)
    return NextResponse.json(
      { error: 'Failed to reset injury timer' },
      { status: 500 }
    )
  }
}