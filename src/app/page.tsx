'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Check, Trash2, Plus, ChevronLeft, ChevronRight, CalendarCheck, Printer, Flame, ArrowLeftRight, X } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
}

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function toDS(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayDS(): string {
  return toDS(new Date());
}

function formatDateAr(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function buildCalCells(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay();
  const dim = new Date(year, month + 1, 0).getDate();
  const prevDim = new Date(year, month, 0).getDate();
  const cells: { d: number; ds: string; cur: boolean }[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({ d: prevDim - i, ds: toDS(new Date(py, pm, prevDim - i)), cur: false });
  }

  for (let d = 1; d <= dim; d++) {
    cells.push({ d, ds: toDS(new Date(year, month, d)), cur: true });
  }

  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    cells.push({ d, ds: toDS(new Date(ny, nm, d)), cur: false });
  }

  return cells;
}

function shiftMonth(year: number, month: number, amount: number) {
  const d = new Date(year, month + amount, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [todayStr, setTodayStr] = useState('');
  const [calYear, setCalYear] = useState(2000);
  const [calMonth, setCalMonth] = useState(0);
  const [moveYear, setMoveYear] = useState(2000);
  const [moveMonth, setMoveMonth] = useState(0);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const moveDialogRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const { toast } = useToast();

  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/tasks', { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      if (isMountedRef.current) {
        setTasks(Array.isArray(data) ? data : []);
        setApiError(null);
      }
    } catch {
      if (isMountedRef.current) {
        setApiError('تعذر الاتصال بقاعدة البيانات. تأكد من DATABASE_URL وأن جدول Task تم إنشاؤه.');
      }
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const now = new Date();
    const ds = toDS(now);
    setTodayStr(ds);
    setSelectedDate(ds);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setMoveYear(now.getFullYear());
    setMoveMonth(now.getMonth());
    setMounted(true);

    fetchTasks(false);
    const iv = setInterval(() => fetchTasks(true), 30_000);

    return () => {
      isMountedRef.current = false;
      clearInterval(iv);
    };
  }, [fetchTasks]);

  useEffect(() => {
    if (!movingTaskId) return;

    const handleClick = (event: MouseEvent) => {
      if (moveDialogRef.current && !moveDialogRef.current.contains(event.target as Node)) {
        setMovingTaskId(null);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [movingTaskId]);

  const dayTasks = useMemo(() => tasks.filter(task => task.date === selectedDate), [tasks, selectedDate]);
  const doneCount = useMemo(() => dayTasks.filter(task => task.done).length, [dayTasks]);
  const monthTasks = useMemo(() => {
    return tasks.filter(task => {
      const taskDate = new Date(`${task.date}T00:00:00`);
      return taskDate.getFullYear() === calYear && taskDate.getMonth() === calMonth;
    });
  }, [tasks, calYear, calMonth]);
  const monthDone = useMemo(() => monthTasks.filter(task => task.done).length, [monthTasks]);
  const cells = useMemo(() => buildCalCells(calYear, calMonth), [calYear, calMonth]);
  const moveCells = useMemo(() => buildCalCells(moveYear, moveMonth), [moveYear, moveMonth]);
  const dateStatusMap = useMemo(() => {
    const map = new Map<string, { allDone: boolean; hasPending: boolean }>();

    for (const date of new Set(tasks.map(task => task.date))) {
      const dateTasks = tasks.filter(task => task.date === date);
      map.set(date, {
        allDone: dateTasks.length > 0 && dateTasks.every(task => task.done),
        hasPending: dateTasks.some(task => !task.done),
      });
    }

    return map;
  }, [tasks]);

  const goToday = () => {
    const now = new Date();
    const ds = toDS(now);
    setTodayStr(ds);
    setSelectedDate(ds);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  };

  const changeCalendarMonth = (amount: number) => {
    const next = shiftMonth(calYear, calMonth, amount);
    setCalYear(next.year);
    setCalMonth(next.month);
  };

  const changeMoveMonth = (amount: number) => {
    const next = shiftMonth(moveYear, moveMonth, amount);
    setMoveYear(next.year);
    setMoveMonth(next.month);
  };

  const handleAdd = async () => {
    const text = newTask.trim();
    if (!text || !selectedDate) return;

    const optimisticTask: Task = {
      id: `temp_${Date.now()}`,
      text,
      done: false,
      date: selectedDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNewTask('');
    setTasks(prev => [optimisticTask, ...prev]);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, date: selectedDate }),
      });

      if (!res.ok) throw new Error('Create failed');

      const realTask = await res.json();
      setTasks(prev => prev.map(task => task.id === optimisticTask.id ? realTask : task));
      setApiError(null);
    } catch {
      setTasks(prev => prev.filter(task => task.id !== optimisticTask.id));
      toast({ title: 'خطأ', description: 'فشل في إضافة المهمة', variant: 'destructive' });
    }
  };

  const handleToggle = async (task: Task) => {
    const done = !task.done;
    setTasks(prev => prev.map(item => item.id === task.id ? { ...item, done, updatedAt: new Date().toISOString() } : item));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      });

      if (!res.ok) throw new Error('Update failed');
    } catch {
      setTasks(prev => prev.map(item => item.id === task.id ? { ...item, done: task.done } : item));
      toast({ title: 'خطأ', description: 'فشل في تحديث المهمة', variant: 'destructive' });
    }
  };

  const handleDelete = async (task: Task) => {
    setTasks(prev => prev.filter(item => item.id !== task.id));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    } catch {
      setTasks(prev => [task, ...prev]);
      toast({ title: 'خطأ', description: 'فشل في حذف المهمة', variant: 'destructive' });
    }
  };

  const handleMoveTask = async (task: Task, date: string) => {
    const previousDate = task.date;
    setMovingTaskId(null);
    setTasks(prev => prev.map(item => item.id === task.id ? { ...item, date, updatedAt: new Date().toISOString() } : item));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });

      if (!res.ok) throw new Error('Move failed');
      toast({ title: 'تم النقل', description: `تم نقل المهمة إلى ${formatDateAr(date)}` });
    } catch {
      setTasks(prev => prev.map(item => item.id === task.id ? { ...item, date: previousDate } : item));
      toast({ title: 'خطأ', description: 'فشل في نقل المهمة', variant: 'destructive' });
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-violet-950 text-white flex items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-4 border-slate-700 border-t-violet-400 animate-spin" />
          <p className="text-slate-300 font-bold">جاري تحميل التطبيق...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-violet-950 text-white no-print" dir="rtl">
      <div className="max-w-md mx-auto space-y-5 p-4 pb-12">
        <section className="pt-8 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">مهامي</h1>
            </div>
            <p className="text-sm text-slate-400 mr-13">
              {selectedDate === todayStr
                ? dayTasks.length > 0
                  ? <span><span className="text-violet-400 font-bold">{doneCount}</span> من <span className="text-white font-bold">{dayTasks.length}</span> مُنجزة</span>
                  : 'ابدأ يومك بمهمة جديدة'
                : formatDateAr(selectedDate)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="text-violet-300 hover:text-white hover:bg-violet-600/30 h-10 px-5 rounded-2xl border border-violet-500/40 bg-violet-500/10 font-bold"
          >
            اليوم
          </Button>
        </section>

        {apiError && (
          <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 leading-7">
            {apiError}
          </section>
        )}

        <section className="bg-slate-800/90 rounded-3xl border border-violet-500/20 p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => changeCalendarMonth(1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600/30 border border-slate-700/50"
              aria-label="الشهر التالي"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-xl font-black">{MONTHS[calMonth]}</span>
              <span className="text-lg text-violet-400 font-bold mr-2">{calYear}</span>
            </div>
            <button
              onClick={() => changeCalendarMonth(-1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600/30 border border-slate-700/50"
              aria-label="الشهر السابق"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5 px-1 text-xs font-bold">
            <span className="bg-violet-500/10 text-violet-300 px-3 py-1.5 rounded-full border border-violet-500/20">
              {monthTasks.length - monthDone} قيد التنفيذ
            </span>
            <span className="bg-emerald-500/10 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/20">
              {monthDone} مُنجزة
            </span>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs text-violet-400 font-bold py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((cell, index) => {
              const selected = cell.ds === selectedDate;
              const today = cell.ds === todayStr;
              const status = dateStatusMap.get(cell.ds);

              return (
                <button
                  key={`${cell.ds}-${index}`}
                  onClick={() => {
                    setSelectedDate(cell.ds);
                    if (!cell.cur) {
                      const d = new Date(`${cell.ds}T00:00:00`);
                      setCalYear(d.getFullYear());
                      setCalMonth(d.getMonth());
                    }
                  }}
                  className={`relative flex items-center justify-center h-11 rounded-xl text-sm font-bold transition-colors ${!cell.cur ? 'text-slate-600' : 'text-slate-300'} ${selected ? 'bg-violet-600 text-white' : ''} ${today && !selected ? 'bg-slate-700/80 text-white' : ''} ${!selected && !today && cell.cur ? 'hover:bg-slate-700/40' : ''}`}
                >
                  {cell.d}
                  {status && (
                    <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/80' : status.allDone ? 'bg-emerald-400' : status.hasPending ? 'bg-violet-400' : 'bg-slate-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-slate-800/90 rounded-3xl border border-violet-500/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-violet-400" />
              </div>
              <span className="font-bold">{selectedDate === todayStr ? 'مهام اليوم' : formatDateAr(selectedDate)}</span>
              {dayTasks.length > 0 && <span className="text-xs bg-violet-600 px-3 py-1 rounded-full font-black">{dayTasks.length}</span>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              disabled={dayTasks.length === 0}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-9 w-9 p-0 rounded-xl border border-slate-700/50"
              title="طباعة المهام"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Input
              placeholder="أضف مهمة جديدة..."
              value={newTask}
              onChange={event => setNewTask(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && handleAdd()}
              className="h-14 rounded-2xl border-violet-500/30 bg-slate-700/60 text-white placeholder:text-slate-500 text-right text-base font-medium"
            />
            <Button
              onClick={handleAdd}
              disabled={!newTask.trim() || !!apiError}
              className="h-14 w-14 rounded-2xl bg-violet-600 hover:bg-violet-500 shrink-0 p-0"
            >
              <Plus className="w-6 h-6" strokeWidth={3} />
            </Button>
          </div>
        </section>

        <section className="bg-slate-800/90 rounded-3xl border border-violet-500/20 p-5">
          {loading && dayTasks.length === 0 ? (
            <div className="flex items-center justify-center py-14">
              <span className="w-8 h-8 border-4 border-slate-600 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : dayTasks.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-slate-700/50 flex items-center justify-center border border-slate-700/30">
                <CalendarCheck className="w-9 h-9 text-slate-500" />
              </div>
              <p className="text-base text-slate-400 font-bold">لا توجد مهام في هذا اليوم</p>
              <p className="text-sm text-slate-600 mt-2">أضف مهمة جديدة بالأعلى</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3">
                {dayTasks.map(task => (
                  <div key={task.id} className="relative">
                    <div className={`group flex items-center gap-4 px-5 py-4 rounded-2xl transition-colors ${task.done ? 'bg-slate-700/20 border border-slate-700/20' : 'bg-slate-700/50 border border-violet-500/20 hover:border-violet-500/40'}`}>
                      <button
                        onClick={() => handleToggle(task)}
                        className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-violet-400 hover:bg-violet-500/15'}`}
                        aria-label="تغيير حالة المهمة"
                      >
                        {task.done && <Check className="w-4 h-4" strokeWidth={3} />}
                      </button>

                      <span className={`flex-1 text-right text-base ${task.done ? 'line-through text-slate-500' : 'font-bold'}`}>
                        {task.text}
                      </span>

                      <button
                        onClick={() => {
                          const now = new Date();
                          setMoveYear(now.getFullYear());
                          setMoveMonth(now.getMonth());
                          setMovingTaskId(movingTaskId === task.id ? null : task.id);
                        }}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-amber-500/15 transition-colors"
                        title="نقل ليوم آخر"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(task)}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {movingTaskId === task.id && (
                      <div ref={moveDialogRef} className="mt-2 bg-slate-800 border border-amber-500/30 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-amber-400">نقل إلى يوم آخر</span>
                          <button onClick={() => setMovingTaskId(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <button onClick={() => changeMoveMonth(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="text-sm font-bold">
                            <span>{MONTHS[moveMonth]}</span>
                            <span className="text-amber-400 mr-2">{moveYear}</span>
                          </div>
                          <button onClick={() => changeMoveMonth(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {moveCells.map((cell, index) => (
                            <button
                              key={`${task.id}-${cell.ds}-${index}`}
                              onClick={() => handleMoveTask(task, cell.ds)}
                              className={`h-8 rounded-lg text-xs font-bold ${cell.cur ? 'text-slate-300 hover:bg-amber-500/20 hover:text-amber-300' : 'text-slate-600'} ${cell.ds === task.date ? 'bg-amber-500/20 text-amber-300' : ''}`}
                            >
                              {cell.d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
      </div>
    </main>
  );
}
