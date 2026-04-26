'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Check, Trash2, Plus, ListTodo, RefreshCw, Loader2 } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  // جلب المهام من الخادم (اللي يقرأ من GitHub)
  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        setLastUpdated(new Date());
      }
    } catch {
      if (!silent) {
        toast({
          title: 'خطأ',
          description: 'فشل في جلب المهام من الخادم',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  // تحديث تلقائي كل 5 ثواني
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => fetchTasks(true), 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // إضافة مهمة جديدة
  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    setAddingTask(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTask.trim() }),
      });

      if (res.ok) {
        setNewTask('');
        await fetchTasks(true);
        toast({
          title: 'تمت الإضافة',
          description: 'المهمة انضافت بنجاح',
        });
      } else {
        const err = await res.json();
        toast({
          title: 'خطأ',
          description: err.error || 'فشل في إضافة المهمة',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة المهمة',
        variant: 'destructive',
      });
    } finally {
      setAddingTask(false);
    }
  };

  // تبديل حالة المهمة (منجزة / غير منجزة)
  const handleToggleTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      });

      if (res.ok) {
        await fetchTasks(true);
      }
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المهمة',
        variant: 'destructive',
      });
    }
  };

  // حذف مهمة
  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });

      if (res.ok) {
        await fetchTasks(true);
        toast({
          title: 'تم الحذف',
          description: 'المهمة انحذفت بنجاح',
        });
      }
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المهمة',
        variant: 'destructive',
      });
    }
  };

  // ===== صفحة قائمة المهام =====
  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* الهيدر */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <ListTodo className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">قائمة المهام</h1>
                  <p className="text-xs text-gray-500">
                    {totalCount > 0
                      ? `${completedCount} من ${totalCount} مُنجزة`
                      : 'لا توجد مهام بعد'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchTasks()}
                className="text-gray-400 hover:text-purple-600"
                title="تحديث"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* إضافة مهمة */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm mb-4">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="اكتب مهمة جديدة..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                className="h-12 rounded-xl border-2 focus:border-purple-500 transition-colors text-right"
                disabled={addingTask}
              />
              <Button
                onClick={handleAddTask}
                disabled={!newTask.trim() || addingTask}
                className="h-12 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold shrink-0"
              >
                {addingTask ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* قائمة المهام */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            {loading && tasks.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ListTodo className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">لا توجد مهام</p>
                <p className="text-sm">اضف مهمة جديدة بالأعلى</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        task.done
                          ? 'bg-green-50 border border-green-100'
                          : 'bg-gray-50 border border-gray-100 hover:border-purple-200'
                      }`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleTask(task)}
                        className={`shrink-0 w-8 h-8 rounded-full ${
                          task.done
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'border-2 border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {task.done && <Check className="w-4 h-4" />}
                      </Button>
                      <span
                        className={`flex-1 text-right transition-all duration-200 ${
                          task.done
                            ? 'line-through text-gray-400'
                            : 'text-gray-700 font-medium'
                        }`}
                      >
                        {task.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        className="shrink-0 w-8 h-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* آخر تحديث */}
            {lastUpdated && (
              <p className="text-center text-xs text-gray-300 mt-4">
                آخر تحديث: {lastUpdated.toLocaleTimeString('ar-IQ')} — يتم التحديث تلقائياً كل 5 ثواني
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
