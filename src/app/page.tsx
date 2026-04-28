'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Check, Trash2, Plus, ChevronLeft, ChevronRight, Sparkles, CalendarCheck, Printer, Flame, ArrowLeftRight, X } from 'lucide-react';

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
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [moveCalMonth, setMoveCalMonth] = useState<Date>(new Date());
  const { toast } = useToast();
  const moveDialogRef = useRef<HTMLDivElement>(null);

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

  // Close move dialog on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moveDialogRef.current && !moveDialogRef.current.contains(e.target as Node)) {
        setMovingTaskId(null);
      }
    };
    if (movingTaskId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [movingTaskId]);

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

  const handleMoveTask = async (taskId: string, newDate: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate }),
      });
      if (res.ok) {
        setMovingTaskId(null);
        await fetchTasks(true);
        toast({ title: 'تم النقل', description: `تم نقل المهمة إلى ${formatDateAr(newDate)}` });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في نقل المهمة', variant: 'destructive' });
    }
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

  // بناء خلايا تقويم النقل
  const mYr = moveCalMonth.getFullYear();
  const mMo = moveCalMonth.getMonth();
  const mFirstDow = new Date(mYr, mMo, 1).getDay();
  const mDim = new Date(mYr, mMo + 1, 0).getDate();
  const mPrevDim = new Date(mYr, mMo, 0).getDate();

  const moveCells: { d: number; ds: string; cur: boolean }[] = [];
  for (let i = mFirstDow - 1; i >= 0; i--) {
    const pm = mMo === 0 ? 11 : mMo - 1;
    const py = mMo === 0 ? mYr - 1 : mYr;
    moveCells.push({ d: mPrevDim - i, ds: toDS(new Date(py, pm, mPrevDim - i)), cur: false });
  }
  for (let d = 1; d <= mDim; d++) {
    moveCells.push({ d, ds: toDS(new Date(mYr, mMo, d)), cur: true });
  }
  const mRem = 42 - moveCells.length;
  for (let d = 1; d <= mRem; d++) {
    const nm = mMo === 11 ? 0 : mMo + 1;
    const ny = mMo === 11 ? mYr + 1 : mYr;
    moveCells.push({ d, ds: toDS(new Date(ny, nm, d)), cur: false });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-violet-950 no-print">
      <div className="max-w-md mx-auto space-y-5 p-4 pb-12">

        {/* ═══════ الهيدر ═══════ */}
        <div className="pt-8 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">مهامي</h1>
              </div>
              <p className="text-sm text-slate-400 mt-2 mr-13">
                {selStr === todayStr
                  ? dayTasks.length > 0
                    ? <span><span className="text-violet-400 font-bold">{doneCount}</span> من <span className="text-white font-bold">{dayTasks.length}</span> مُنجزة</span>
                    : 'ابدأ يومك بمهمة جديدة'
                  : formatDateAr(selStr)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedDate(new Date()); setCalMonth(new Date()); }}
              className="text-violet-300 hover:text-white hover:bg-violet-600/30 text-sm h-10 px-5 rounded-2xl border border-violet-500/40 bg-violet-500/10 font-bold"
            >
              اليوم
            </Button>
          </div>
        </div>

        {/* ═══════ التقويم ═══════ */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl border border-violet-500/20 p-5 shadow-2xl shadow-violet-900/20">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600/30 transition-all border border-slate-700/50 hover:border-violet-500/50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-xl font-black text-white">{MONTHS[mo]}</span>
              <span className="text-lg text-violet-400 font-bold mr-2">{yr}</span>
            </div>
            <button
              onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600/30 transition-all border border-slate-700/50 hover:border-violet-500/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-5 px-1">
            <div className="flex items-center gap-2 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-md shadow-violet-400/50" />
              <span className="text-xs text-violet-300 font-bold">{monthTasks.length - monthDone} قيد التنفيذ</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
              <span className="text-xs text-emerald-300 font-bold">{monthDone} مُنجزة</span>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs text-violet-400 font-bold py-2">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1.5">
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
                    relative flex flex-col items-center justify-center h-12 rounded-2xl text-sm font-bold transition-all duration-200
                    ${!c.cur ? 'text-slate-600' : 'text-slate-300'}
                    ${sel ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/40 scale-110 ring-2 ring-violet-400/50' : ''}
                    ${tod && !sel ? 'bg-slate-700 text-white ring-2 ring-fuchsia-500/50 shadow-md shadow-fuchsia-500/20' : ''}
                    ${!sel && !tod && c.cur ? 'hover:bg-violet-600/20 hover:text-white' : ''}
                  `}
                >
                  {c.d}
                  {ht && !sel && (
                    <span
                      className={`absolute bottom-1 w-2 h-2 rounded-full ${
                        ad ? 'bg-emerald-400 shadow-md shadow-emerald-400/60' : hp ? 'bg-violet-400 shadow-md shadow-violet-400/60' : 'bg-slate-500'
                      }`}
                    />
                  )}
                  {ht && sel && (
                    <span className="absolute bottom-1 w-2 h-2 rounded-full bg-white/90 shadow-md shadow-white/30" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ إضافة مهمة ═══════ */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl border border-violet-500/20 p-5 shadow-xl shadow-violet-900/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-base font-bold text-white">
                {selStr === todayStr ? 'مهام اليوم' : formatDateAr(selStr)}
              </span>
              {dayTasks.length > 0 && (
                <span className="text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-3 py-1 rounded-full font-black shadow-md shadow-violet-500/30">
                  {dayTasks.length}
                </span>
              )}
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
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-14 rounded-2xl border-violet-500/30 bg-slate-700/60 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/30 text-right text-base font-medium"
              disabled={addingTask}
            />
            <Button
              onClick={handleAdd}
              disabled={!newTask.trim() || addingTask}
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shrink-0 p-0 shadow-xl shadow-violet-600/40 transition-all duration-200 hover:scale-105"
            >
              {addingTask ? (
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-6 h-6 text-white" strokeWidth={3} />
              )}
            </Button>
          </div>
        </div>

        {/* ═══════ قائمة المهام ═══════ */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl border border-violet-500/20 p-5 shadow-xl shadow-violet-900/10">
          {loading && dayTasks.length === 0 ? (
            <div className="flex items-center justify-center py-14">
              <span className="w-8 h-8 border-3 border-slate-600 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : dayTasks.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center border border-slate-700/30">
                <CalendarCheck className="w-9 h-9 text-slate-500" />
              </div>
              <p className="text-base text-slate-400 font-bold">لا توجد مهام في هذا اليوم</p>
              <p className="text-sm text-slate-600 mt-2">أضف مهمة جديدة بالأعلى</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3">
                {dayTasks.map((task) => (
                  <div key={task.id} className="relative">
                    <div
                      className={`
                        group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200
                        ${task.done
                          ? 'bg-slate-700/20 border border-slate-700/20'
                          : 'bg-gradient-to-r from-slate-700/50 to-slate-700/30 border border-violet-500/20 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/10'
                        }
                      `}
                    >
                      {/* خانة التحديد */}
                      <button
                        onClick={() => handleToggle(task)}
                        className={`
                          shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                          ${task.done
                            ? 'bg-gradient-to-br from-emerald-500 to-green-400 border-emerald-500 shadow-md shadow-emerald-500/30'
                            : 'border-slate-500 hover:border-violet-400 hover:bg-violet-500/15'
                          }
                        `}
                      >
                        {task.done && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                      </button>

                      {/* النص */}
                      <span
                        className={`
                          flex-1 text-right text-base transition-all duration-200
                          ${task.done
                            ? 'line-through text-slate-500'
                            : 'text-white font-bold'
                          }
                        `}
                      >
                        {task.text}
                      </span>

                      {/* زر النقل ليوم آخر */}
                      <button
                        onClick={() => {
                          setMovingTaskId(movingTaskId === task.id ? null : task.id);
                          setMoveCalMonth(new Date());
                        }}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-500 hover:text-amber-400 hover:bg-amber-500/15 transition-all duration-200"
                        title="نقل ليوم آخر"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>

                      {/* زر الحذف */}
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* ═══ نافذة نقل المهمة ═══ */}
                    {movingTaskId === task.id && (
                      <div
                        ref={moveDialogRef}
                        className="mt-2 bg-slate-800 border border-amber-500/30 rounded-2xl p-4 shadow-xl shadow-amber-900/20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-amber-400">نقل إلى يوم آخر</span>
                          <button
                            onClick={() => setMovingTaskId(null)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* رأس تقويم النقل */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => setMoveCalMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600/30 transition-all border border-slate-700/50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="text-center">
                            <span className="text-sm font-bold text-white">{MONTHS[mMo]}</span>
                            <span className="text-sm text-slate-400 mr-1">{mYr}</span>
                          </div>
                          <button
                            onClick={() => setMoveCalMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600/30 transition-all border border-slate-700/50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>

                        {/* أسماء الأيام */}
                        <div className="grid grid-cols-7 mb-1">
                          {WEEKDAYS.map((w) => (
                            <div key={w} className="text-center text-[10px] text-slate-500 font-bold py-1">{w}</div>
                          ))}
                        </div>

                        {/* أيام الشهر */}
                        <div className="grid grid-cols-7 gap-y-0.5">
                          {moveCells.map((c, i) => {
                            const isCurrentTask = c.ds === task.date;
                            const isMoveToday = c.ds === todayStr;

                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (c.ds !== task.date) handleMoveTask(task.id, c.ds);
                                }}
                                disabled={c.ds === task.date}
                                className={`
                                  relative flex items-center justify-center h-8 rounded-xl text-xs font-bold transition-all duration-150
                                  ${!c.cur ? 'text-slate-600' : 'text-slate-300'}
                                  ${isCurrentTask ? 'bg-violet-600/30 text-violet-300 ring-1 ring-violet-500/50 cursor-not-allowed' : ''}
                                  ${isMoveToday && !isCurrentTask ? 'ring-1 ring-amber-500/50 text-amber-300' : ''}
                                  ${c.cur && !isCurrentTask ? 'hover:bg-amber-500/20 hover:text-white' : ''}
                                `}
                              >
                                {c.d}
                                {isCurrentTask && (
                                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-violet-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                          اختر اليوم الجديد لنقل المهمة إليه
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* شريط التقدم */}
          {dayTasks.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {doneCount === dayTasks.length && (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-sm text-slate-400 font-bold">
                    {doneCount === dayTasks.length
                      ? 'جميع المهام مُنجزة!'
                      : `${dayTasks.length - doneCount} متبقية`
                    }
                  </span>
                </div>
                <span className="text-sm text-violet-400 font-black">
                  {Math.round((doneCount / dayTasks.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(doneCount / dayTasks.length) * 100}%`,
                    background: doneCount === dayTasks.length
                      ? 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)'
                      : 'linear-gradient(90deg, #7c3aed, #a78bfa, #c4b5fd)',
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
