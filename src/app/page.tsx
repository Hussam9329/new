'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Check, Trash2, Plus, ChevronLeft, ChevronRight, Sparkles, CalendarCheck, Printer } from 'lucide-react';

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

function formatDateAr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function toDS(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const { toast } = useToast();

  const selStr = toDS(selectedDate);

  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      if (res.ok) setTasks(await res.json());
    } catch {
      if (!silent) toast({ title: 'خطأ', description: 'فشل في جلب المهام', variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
    const iv = setInterval(() => fetchTasks(true), 5000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  const handleAdd = async () => {
    if (!newTask.trim()) return;
    setAddingTask(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTask.trim(), date: selStr }),
      });
      if (res.ok) {
        setNewTask('');
        await fetchTasks(true);
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة المهمة', variant: 'destructive' });
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      });
      if (res.ok) await fetchTasks(true);
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchTasks(true);
    } catch { /* silent */ }
  };

  const dayTasks = tasks.filter((t) => t.date === selStr);
  const doneCount = dayTasks.filter((t) => t.done).length;
  const taskDates = new Set(tasks.map((t) => t.date));
  const todayStr = toDS(new Date());

  const yr = calMonth.getFullYear();
  const mo = calMonth.getMonth();
  const firstDow = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const prevDim = new Date(yr, mo, 0).getDate();

  const cells: { d: number; ds: string; cur: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const pm = mo === 0 ? 11 : mo - 1;
    const py = mo === 0 ? yr - 1 : yr;
    cells.push({ d: prevDim - i, ds: toDS(new Date(py, pm, prevDim - i)), cur: false });
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({ d, ds: toDS(new Date(yr, mo, d)), cur: true });
  }
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++) {
    const nm = mo === 11 ? 0 : mo + 1;
    const ny = mo === 11 ? yr + 1 : yr;
    cells.push({ d, ds: toDS(new Date(ny, nm, d)), cur: false });
  }

  const isToday = (ds: string) => ds === todayStr;
  const isSel = (ds: string) => ds === selStr;
  const hasTasks = (ds: string) => taskDates.has(ds);
  const allDone = (ds: string) => {
    const dt = tasks.filter((t) => t.date === ds);
    return dt.length > 0 && dt.every((t) => t.done);
  };
  const hasPending = (ds: string) => {
    const dt = tasks.filter((t) => t.date === ds);
    return dt.some((t) => !t.done);
  };

  const monthTasks = tasks.filter((t) => {
    const td = new Date(t.date + 'T00:00:00');
    return td.getFullYear() === yr && td.getMonth() === mo;
  });
  const monthDone = monthTasks.filter((t) => t.done).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 no-print">
      <div className="max-w-md mx-auto space-y-4 p-4 pb-10">
        {/* الهيدر */}
        <div className="pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">مهامي</h1>
              <p className="text-sm text-slate-400 mt-1">
                {selStr === todayStr
                  ? dayTasks.length > 0
                    ? `${doneCount} من ${dayTasks.length} مُنجزة`
                    : 'ابدأ يومك بمهمة جديدة'
                  : formatDateAr(selStr)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedDate(new Date()); setCalMonth(new Date()); }}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 text-xs h-9 px-4 rounded-xl border border-slate-700"
            >
              اليوم
            </Button>
          </div>
        </div>

        {/* التقويم */}
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700/50 p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-base font-bold text-white">{MONTHS[mo]}</span>
              <span className="text-base text-slate-400 mr-2">{yr}</span>
            </div>
            <button
              onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-[11px] text-slate-400">{monthTasks.length - monthDone} قيد التنفيذ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-slate-400">{monthDone} مُنجزة</span>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] text-slate-500 font-semibold py-2">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((c, i) => {
              const sel = isSel(c.ds);
              const tod = isToday(c.ds);
              const ht = hasTasks(c.ds);
              const ad = allDone(c.ds);
              const hp = hasPending(c.ds);
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedDate(new Date(c.ds + 'T00:00:00'));
                    if (!c.cur) setCalMonth(new Date(c.ds + 'T00:00:00'));
                  }}
                  className={`
                    relative flex flex-col items-center justify-center h-11 rounded-2xl text-sm transition-all duration-200
                    ${!c.cur ? 'text-slate-600' : 'text-slate-300'}
                    ${sel ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 font-bold scale-110' : ''}
                    ${tod && !sel ? 'bg-slate-700 text-white font-bold ring-2 ring-violet-500/50' : ''}
                    ${!sel && !tod && c.cur ? 'hover:bg-slate-700/50' : ''}
                  `}
                >
                  {c.d}
                  {ht && !sel && (
                    <span className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${ad ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : hp ? 'bg-violet-400 shadow-sm shadow-violet-400/50' : 'bg-slate-500'}`} />
                  )}
                  {ht && sel && (
                    <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* إضافة مهمة */}
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700/50 p-4 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-white">
                {selStr === todayStr ? 'مهام اليوم' : formatDateAr(selStr)}
              </span>
              {dayTasks.length > 0 && (
                <span className="text-xs bg-violet-600/30 text-violet-300 px-2.5 py-0.5 rounded-full font-bold">{dayTasks.length}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              disabled={dayTasks.length === 0}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 w-8 p-0 rounded-lg border border-slate-700"
              title="طباعة المهام"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="أضف مهمة جديدة..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-12 rounded-2xl border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20 text-right text-sm"
              disabled={addingTask}
            />
            <Button
              onClick={handleAdd}
              disabled={!newTask.trim() || addingTask}
              className="h-12 w-12 rounded-2xl bg-violet-600 hover:bg-violet-500 shrink-0 p-0 shadow-lg shadow-violet-600/30"
            >
              {addingTask ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5 text-white" />
              )}
            </Button>
          </div>
        </div>

        {/* قائمة المهام */}
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700/50 p-4 shadow-xl shadow-black/10">
          {loading && dayTasks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-slate-600 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : dayTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                <CalendarCheck className="w-7 h-7 text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 font-medium">لا توجد مهام في هذا اليوم</p>
              <p className="text-xs text-slate-600 mt-1">أضف مهمة جديدة بالأعلى</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${task.done ? 'bg-slate-700/30 border border-slate-700/30' : 'bg-slate-700/50 border border-slate-600/50 hover:border-violet-500/30'}`}
                  >
                    <button
                      onClick={() => handleToggle(task)}
                      className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${task.done ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30' : 'border-slate-500 hover:border-violet-400 hover:bg-violet-500/10'}`}
                    >
                      {task.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>
                    <span className={`flex-1 text-right text-sm transition-all duration-200 ${task.done ? 'line-through text-slate-500' : 'text-white font-medium'}`}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {dayTasks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {doneCount === dayTasks.length && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  <span className="text-xs text-slate-400 font-medium">
                    {doneCount === dayTasks.length ? 'جميع المهام مُنجزة!' : `${dayTasks.length - doneCount} متبقية`}
                  </span>
                </div>
                <span className="text-xs text-violet-400 font-bold">{Math.round((doneCount / dayTasks.length) * 100)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(doneCount / dayTasks.length) * 100}%`,
                    background: doneCount === dayTasks.length ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable Area */}
      <div className="print-only p-8 text-black bg-white" dir="rtl">
        <h1 className="text-2xl font-bold mb-4 border-b-2 pb-2 border-black">قائمة مهام يوم {formatDateAr(selStr)}</h1>
        <div className="space-y-4 mt-6">
          {dayTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 border-b border-gray-200 pb-3">
              <div className={`mt-1 w-5 h-5 border-2 border-black rounded-md flex-shrink-0 flex items-center justify-center ${task.done ? 'bg-black' : ''}`}>
                {task.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
              </div>
              <span className={`text-lg ${task.done ? 'line-through text-gray-500' : 'font-medium'}`}>{task.text}</span>
            </div>
          ))}
        </div>
        {dayTasks.length === 0 && <p className="text-center py-10 text-gray-500 italic">لا توجد مهام لهذا اليوم.</p>}
        <div className="mt-10 pt-4 border-t border-gray-100 text-xs text-gray-400 text-left">
          تطبيق مهامي - {new Date().toLocaleString('ar-EG')}
        </div>
      </div>
    </div>
  );
}
