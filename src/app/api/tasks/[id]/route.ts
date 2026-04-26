import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/tasks/[id] — تحديث مهمة (تعليم كمُنجز أو إلغاء)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { done, text } = body;

    const existingTask = await db.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    const updateData: { done?: boolean; text?: string } = {};
    if (typeof done === 'boolean') updateData.done = done;
    if (typeof text === 'string' && text.trim()) updateData.text = text.trim();

    const task = await db.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'فشل في تحديث المهمة' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] — حذف مهمة
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingTask = await db.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    await db.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'فشل في حذف المهمة' }, { status: 500 });
  }
}
