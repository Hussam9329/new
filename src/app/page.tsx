'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Check, Trash2, Plus, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

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

const WEEKDAYS = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'];

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

  // مهام اليوم المحدد
  const dayTasks = tasks.filter((t) => t.date === selStr);
  const doneCount = dayTasks.filter((t) => t.done).length;
  const taskDates = new Set(tasks.map((t) => t.date));
  const todayStr = toDS(new Date());

  // بناء التقويم
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

  return (
    <div className="min-h-screen bg-stone-50 p-4 pb-10">
      <div className="max-w-md mx-auto space-y-5">

        {/* ═══ الهيدر ═══ */}
        <div className="pt-4 pb-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-tight text-stone-800">
                مهامي
              </h1>
              <p className="text-xs text-stone-400 mt-0.5 font-light">
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
              className="text-stone-400 hover:text-stone-600 text-xs h-8 px-3 rounded-lg font-light"
            >
              اليوم
            </Button>
          </div>
        </div>

        {/* ═══ التقويم ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
          {/* رأس التقويم */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-stone-600 hover:bg-stone-50 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-sm font-medium text-stone-700 tracking-wide">
                {MONTHS[mo]}
              </span>
              <span className="text-sm text-stone-400 mr-1.5 font-light">
                {yr}
              </span>
            </div>
            <button
              onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-stone-600 hover:bg-stone-50 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* أسماء الأيام */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] text-stone-300 font-medium tracking-wider py-1.5 uppercase">
                {w}
              </div>
            ))}
          </div>

          {/* أيام الشهر */}
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
                    relative flex flex-col items-center justify-center h-10 rounded-xl text-[13px] transition-all duration-300 ease-out
                    ${!c.cur ? 'text-stone-200' : 'text-stone-600'}
                    ${sel ? 'bg-stone-800 text-white shadow-md shadow-stone-200 font-medium' : ''}
                    ${tod && !sel ? 'text-stone-900 font-semibold' : ''}
                    ${!sel && c.cur ? 'hover:bg-stone-50' : ''}
                  `}
                >
                  {c.d}
                  {/* مؤشر المهام */}
                  {ht && !sel && (
                    <span
                      className={`absolute bottom-1 w-1 h-1 rounded-full ${
                        ad ? 'bg-emerald-400' : hp ? 'bg-stone-400' : 'bg-stone-300'
                      }`}
                    />
                  )}
                  {ht && sel && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white/60" />
                  )}
                  {/* خط تحت اليوم الحالي */}
                  {tod && !sel && (
                    <span className="absolute bottom-0.5 w-4 h-[1.5px] rounded-full bg-stone-800" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ إضافة مهمة ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-stone-800" />
            <span className="text-xs text-stone-400 font-light">
              {selStr === todayStr ? 'اليوم' : formatDateAr(selStr)}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="أضف مهمة جديدة..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-11 rounded-xl border-stone-200 focus:border-stone-400 text-right text-sm font-light placeholder:text-stone-300"
              disabled={addingTask}
            />
            <Button
              onClick={handleAdd}
              disabled={!newTask.trim() || addingTask}
              className="h-11 w-11 rounded-xl bg-stone-800 hover:bg-stone-700 shrink-0 p-0"
            >
              {addingTask ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
            </Button>
          </div>
        </div>

        {/* ═══ قائمة المهام ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
          {loading && dayTasks.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-5 h-5 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
            </div>
          ) : dayTasks.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-stone-300" />
              </div>
              <p className="text-sm text-stone-300 font-light">لا توجد مهام</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-1.5">
                {dayTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    className={`
                      group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300
                      ${task.done
                        ? 'bg-stone-50/50'
                        : 'hover:bg-stone-50'
                      }
                    `}
                  >
                    {/* خانة التحديد */}
                    <button
                      onClick={() => handleToggle(task)}
                      className={`
                        shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300
                        ${task.done
                          ? 'bg-stone-700 border-stone-700'
                          : 'border-stone-200 hover:border-stone-400'
                        }
                      `}
                    >
                      {task.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>

                    {/* النص */}
                    <span
                      className={`
                        flex-1 text-right text-sm transition-all duration-300
                        ${task.done
                          ? 'line-through text-stone-300 font-light'
                          : 'text-stone-700 font-normal'
                        }
                      `}
                    >
                      {task.text}
                    </span>

                    {/* زر الحذف */}
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 hover:bg-red-50 transition-all duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* ملخص المهام */}
          {dayTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {doneCount === dayTasks.length && (
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  )}
                  <span className="text-[11px] text-stone-300 font-light">
                    {doneCount === dayTasks.length
                      ? 'جميع المهام مُنجزة'
                      : `${dayTasks.length - doneCount} متبقية`
                    }
                  </span>
                </div>
                {/* شريط التقدم */}
                <div className="w-20 h-1 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-stone-600 transition-all duration-500 ease-out"
                    style={{ width: `${dayTasks.length > 0 ? (doneCount / dayTasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
