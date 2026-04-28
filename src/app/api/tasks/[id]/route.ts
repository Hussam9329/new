import { updateTask, deleteTask } from '@/lib/github-json';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/tasks/[id] — تحديث مهمة
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { done, text, date } = body;

    const updates: { done?: boolean; text?: string; date?: string } = {};
    if (typeof done === 'boolean') updates.done = done;
    if (typeof text === 'string' && text.trim()) updates.text = text.trim();
    if (typeof date === 'string' && date.trim()) updates.date = date.trim();

    const task = await updateTask(id, updates);
    return NextResponse.json(task);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في تحديث المهمة';
    const status = message === 'المهمة غير موجودة' ? 404 : 500;
    console.error('Error updating task:', error);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/tasks/[id] — حذف مهمة
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في حذف المهمة';
    const status = message === 'المهمة غير موجودة' ? 404 : 500;
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
