'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Check, Trash2, Plus, ListTodo, RefreshCw, Loader2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// الأيام العربية
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const { toast } = useToast();

  const selectedDateStr = toDateString(selectedDate);

  // جلب المهام من الخادم
  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
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
        body: JSON.stringify({ text: newTask.trim(), date: selectedDateStr }),
      });

      if (res.ok) {
        setNewTask('');
        await fetchTasks(true);
        toast({
          title: 'تمت الإضافة',
          description: `المهمة انضافت ليوم ${formatDate(selectedDateStr)}`,
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

  // تبديل حالة المهمة
  const handleToggleTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      });
      if (res.ok) await fetchTasks(true);
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

  // مهام اليوم المحدد
  const tasksForSelectedDate = tasks.filter((t) => t.date === selectedDateStr);
  const completedCount = tasksForSelectedDate.filter((t) => t.done).length;
  const totalCount = tasksForSelectedDate.length;

  // أيام فيها مهام (للتقويم)
  const datesWithTasks = new Set(tasks.map((t) => t.date));

  // التنقل بين الأشهر
  const goToPrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goToNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setSelectedDate(new Date());
    setCalendarMonth(new Date());
  };

  // بناء أيام الشهر يدوياً
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayStr = toDateString(new Date());

  const calendarDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  // أيام الشهر السابق
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    calendarDays.push({
      day: d,
      dateStr: toDateString(new Date(prevYear, prevMonth, d)),
      isCurrentMonth: false,
    });
  }
  // أيام الشهر الحالي
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      dateStr: toDateString(new Date(year, month, d)),
      isCurrentMonth: true,
    });
  }
  // أيام الشهر التالي
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    calendarDays.push({
      day: d,
      dateStr: toDateString(new Date(nextYear, nextMonth, d)),
      isCurrentMonth: false,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 pb-8">
      <div className="max-w-lg mx-auto space-y-4">
        {/* الهيدر */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
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
                      : formatDate(selectedDateStr)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToToday}
                  className="text-purple-600 hover:text-purple-700 text-xs h-8 px-2"
                >
                  اليوم
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchTasks()}
                  className="text-gray-400 hover:text-purple-600 h-8 w-8"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* التقويم */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4">
            {/* رأس التقويم */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-bold text-gray-800">
                {ARABIC_MONTHS[month]} {year}
              </h2>
              <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* أسماء الأيام */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {ARABIC_WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* أيام الشهر */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, i) => {
                const isSelected = item.dateStr === selectedDateStr;
                const isToday = item.dateStr === todayStr;
                const hasTasks = datesWithTasks.has(item.dateStr);
                const tasksOnDay = tasks.filter((t) => t.date === item.dateStr);
                const hasUnDone = tasksOnDay.some((t) => !t.done);
                const allDone = tasksOnDay.length > 0 && tasksOnDay.every((t) => t.done);

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDate(new Date(item.dateStr + 'T00:00:00'));
                      if (!item.isCurrentMonth) setCalendarMonth(new Date(item.dateStr + 'T00:00:00'));
                    }}
                    className={`
                      relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all duration-200
                      ${!item.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                      ${isSelected ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105' : 'hover:bg-purple-50'}
                      ${isToday && !isSelected ? 'ring-2 ring-purple-300 ring-offset-1' : ''}
                    `}
                  >
                    {item.day}
                    {/* نقاط المهام */}
                    {hasTasks && !isSelected && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {allDone ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        ) : hasUnDone ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        ) : null}
                      </div>
                    )}
                    {hasTasks && isSelected && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {allDone ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* عنوان اليوم المحدد + إضافة مهمة */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-gray-700">
                {selectedDateStr === todayStr ? 'مهام اليوم' : formatDate(selectedDateStr)}
              </h3>
              {totalCount > 0 && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                  {totalCount}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="اكتب مهمة جديدة..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                className="h-11 rounded-xl border-2 focus:border-purple-500 transition-colors text-right text-sm"
                disabled={addingTask}
              />
              <Button
                onClick={handleAddTask}
                disabled={!newTask.trim() || addingTask}
                className="h-11 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold shrink-0"
              >
                {addingTask ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* قائمة المهام */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            {loading && tasksForSelectedDate.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : tasksForSelectedDate.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">لا توجد مهام في هذا اليوم</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-2">
                  {tasksForSelectedDate.map((task) => (
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
                        className={`shrink-0 w-7 h-7 rounded-full ${
                          task.done
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'border-2 border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {task.done && <Check className="w-3.5 h-3.5" />}
                      </Button>
                      <span
                        className={`flex-1 text-right text-sm transition-all duration-200 ${
                          task.done ? 'line-through text-gray-400' : 'text-gray-700 font-medium'
                        }`}
                      >
                        {task.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        className="shrink-0 w-7 h-7 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
