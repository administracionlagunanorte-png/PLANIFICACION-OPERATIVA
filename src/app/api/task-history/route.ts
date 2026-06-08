import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (taskId) {
      const history = await db.taskHistory.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(history)
    }

    // Return all history if no taskId specified
    const history = await db.taskHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching task history:', error)
    return NextResponse.json({ error: 'Error fetching task history' }, { status: 500 })
  }
}
