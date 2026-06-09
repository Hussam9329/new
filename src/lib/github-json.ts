import { db } from '@/lib/db';

interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
}

function toTask(task: {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}): Task {
  return {
    id: task.id,
    text: task.text,
    done: task.done,
    date: task.date,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getAllTasks(): Promise<Task[]> {
  const tasks = await db.task.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return tasks.map(toTask);
}

export async function createTask(text: string, date?: string): Promise<Task> {
  const task = await db.task.create({
    data: {
      text: text.trim(),
      done: false,
      date: date?.trim() || todayDateString(),
    },
  });

  return toTask(task);
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'done' | 'text' | 'date'>>
): Promise<Task> {
  const data: { done?: boolean; text?: string; date?: string } = {};

  if (typeof updates.done === 'boolean') data.done = updates.done;
  if (typeof updates.text === 'string' && updates.text.trim()) data.text = updates.text.trim();
  if (typeof updates.date === 'string' && updates.date.trim()) data.date = updates.date.trim();

  try {
    const task = await db.task.update({
      where: { id },
      data,
    });

    return toTask(task);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      throw new Error('المهمة غير موجودة');
    }

    throw error;
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await db.task.delete({
      where: { id },
    });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      throw new Error('المهمة غير موجودة');
    }

    throw error;
  }
}
