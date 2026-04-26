import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tasks — جلب كل المهام
export async function GET() {
  try {
    const tasks = await db.task.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'فشل في جلب المهام' }, { status: 500 });
  }
}

// POST /api/tasks — إضافة مهمة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json({ error: 'نص المهمة مطلوب' }, { status: 400 });
    }

    const task = await db.task.create({
      data: {
        text: text.trim(),
        done: false,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'فشل في إنشاء المهمة' }, { status: 500 });
  }
}
