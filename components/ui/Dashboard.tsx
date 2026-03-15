import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, getIncome, getExpenses, getCategoryTotals, translateCategory, filterTransactions, Timeframe, CATEGORIES_EN, CATEGORIES_FR } from '@/lib/store';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Target as TargetIcon, Zap, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

const COLORS = ['#7F77DD','#1D9E75','#EF9F27','#E24B4A','#378ADD','#D85A30','#639922','#888780'];

export function Dashboard() {
  const { t } = useTranslation();
  const { 
    transactions, budget, categoryBudgets, setCategoryBudget, deleteCategoryBudget, 
    goals, xp, language, deleteGoal, isZeroBasedMode, toggleZeroBasedMode, 
    challenges, completeChallenge, removeChallenge, generateWeeklyChallenge, carryForwardBudget, currentStreak 
  } = useStore();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');
  const [completingIds, setCompletingIds] = useState<number[]>([]);
  
  const [newCatBudgetCat, setNewCatBudgetCat] = useState('');
  const [newCatBudgetAmt, setNewCatBudgetAmt] = useState('');
  const [newCatBudgetPeriod, setNewCatBudgetPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Provide AI with current budgets, challenges, and settings
  useCopilotReadable({
    description: "The user's current budgets, challenges, and settings",
    value: { categoryBudgets, challenges, isZeroBasedMode, language },
  });

  // Allow AI to generate challenges
  useCopilotAction({
    name: 'generateWeeklyChallenge',
    description: 'Generate a personalized weekly spending challenge based on user habits.',
    parameters: [
      { name: 'text', type: 'string', description: 'The challenge text (e.g. "Spend less than $50 on Entertainment this week")' },
    ],
    handler: async ({ text }) => {
      generateWeeklyChallenge(text);
      return language === 'fr' ? `Défi ajouté: ${text}` : `Challenge added: ${text}`;
    },
  });

  // Allow AI to adjust category budgets
  useCopilotAction({
    name: 'setCategoryBudget',
    description: 'Set or update the budget for a specific category.',
    parameters: [
      { name: 'category', type: 'string', description: 'The exact category name (e.g., Food, Transport, Logement)' },
      { name: 'amount', type: 'number', description: 'The new budget amount' },
      { name: 'period', type: 'string', enum: ['week', 'month', 'year'], description: 'The timeframe for the budget (week, month, or year)' },
    ],
    handler: async ({ category, amount, period }) => {
      setCategoryBudget(category, amount, period as 'week' | 'month' | 'year');
      return language === 'fr' 
        ? `Budget mis à jour : ${category} à ${amount}$ par ${period}`
        : `Budget updated: ${category} to ${amount} per ${period}`;
    },
  });

  // Safety cleanup: If any challenges are already completed on mount, remove them after a delay
  useEffect(() => {
    const completedChallenges = challenges.filter(c => c.completed);
    if (completedChallenges.length > 0) {
      const timer = setTimeout(() => {
        completedChallenges.forEach(c => removeChallenge(c.id));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [challenges, removeChallenge]);

  const filtered = filterTransactions(transactions, timeframe);
  
  const income   = getIncome(filtered);
  const expenses = getExpenses(filtered);
  const balance  = filtered.reduce((s, tx) => s + tx.amount, 0);
  
  // Total unassigned for Zero-based mode
  const totalAssignedScale = Object.values(categoryBudgets).reduce((acc, b) => {
    let scale = 1;
    if (timeframe === 'month') {
      if (b.period === 'week') scale = 4.33;
      if (b.period === 'year') scale = 1/12;
    } else if (timeframe === 'week') {
      if (b.period === 'month') scale = 1/4.33;
      if (b.period === 'year') scale = 1/52;
    } else if (timeframe === 'year') {
      if (b.period === 'week') scale = 52;
      if (b.period === 'month') scale = 12;
    }
    return acc + (b.amount * scale);
  }, 0);

  // Add carry-forward budget to the available limit
  const totalBudgetFromGlobal = budget + carryForwardBudget;
  // Fallback: if global budget is not set, use the sum of category budgets
  const effectiveTotalBudget = totalBudgetFromGlobal > 0 ? totalBudgetFromGlobal : totalAssignedScale;
  
  const safeToSpend = effectiveTotalBudget > 0 ? Math.max(0, effectiveTotalBudget - expenses) : income - expenses;
  const unassigned = totalBudgetFromGlobal - totalAssignedScale;
  const level    = Math.floor(xp / 100) + 1;

  // Spend forecast: (expenses so far / day of month) * days in month
  // 7-day evolution data
  const chartLocale = language === 'fr' ? fr : enUS;
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayLabel = format(d, 'EEE', { locale: chartLocale });
    const dayTotal = transactions
      .filter(tx => tx.amount < 0 && isSameDay(new Date(tx.date), d))
      .reduce((s, tx) => s + Math.abs(tx.amount), 0);
    return { name: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), amount: dayTotal };
  });

  // Category data for pie chart
  const catTotals = getCategoryTotals(filtered.filter(tx => tx.amount < 0));
  const pieData = Object.entries(catTotals as Record<string, number>)
    .filter(([, v]) => v < 0)
    .map(([name, value]) => ({ 
      name: translateCategory(name, language), 
      value: Math.abs(value) 
    }));

  const totalConsumedPct = effectiveTotalBudget > 0 ? Math.min(100, (expenses / effectiveTotalBudget) * 100) : 0;

  /**
   * Scales a budget amount from its source period to the current dashboard timeframe.
   */
  const getScaledAmount = (baseAmount: number, sourcePeriod: 'week' | 'month' | 'year' = 'month') => {
    // Convert source to "Weekly" baseline
    let weeklyBase = baseAmount;
    if (sourcePeriod === 'month') weeklyBase = baseAmount / 4.33;
    if (sourcePeriod === 'year')  weeklyBase = baseAmount / 52;

    // Scale weekly baseline to current dashboard timeframe
    if (timeframe === 'week')  return weeklyBase;
    if (timeframe === 'month') return weeklyBase * 4.33;
    if (timeframe === 'year')  return weeklyBase * 52;

    return baseAmount;
  };

  const handleClaimChallenge = (id: number) => {
    // 1. Confetti burst
    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.7 },
        colors: ['#5D52D1', '#7F77DD', '#1D9E75', '#EF9F27']
      });
    } catch (e) { console.error('Confetti failed', e); }

    // 2. Mark as completed and award XP in store
    completeChallenge(id);

    // 3. Initiate disappear animation after a very brief "claimed" state
    setTimeout(() => {
      setCompletingIds(prev => [...prev, id]);
      
      // 4. Final delete from store after animation completes
      setTimeout(() => {
        removeChallenge(id);
        setCompletingIds(prev => prev.filter(cid => cid !== id));
      }, 650); // matches animation duration + buffer
    }, 500); // brief "Claimed!" display
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Timeframe selector header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('nav.dashboard')}</h2>
        <div className="flex bg-white dark:bg-gray-900 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-gray-800">
          {(['week', 'month', 'year'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${timeframe === tf ? 'bg-[#5D52D1] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              {language === 'fr' ? (tf === 'week' ? 'Semaine' : tf === 'month' ? 'Mois' : tf === 'year' ? 'Année' : 'Tout') : tf}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Banner & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Banner: Safe to Spend */}
        <div className="md:col-span-3 bg-[#5D52D1] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-violet-200 dark:shadow-none relative overflow-hidden flex flex-col justify-between min-h-[200px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-sm font-bold text-violet-100 uppercase tracking-widest mb-2 opacity-80">
              {isZeroBasedMode ? t('dashboard.toAssign') : t('dashboard.availableToday')}
            </p>
            <div className="flex items-baseline gap-3">
              <h1 className="text-6xl font-black tracking-tighter">
                {(isZeroBasedMode ? unassigned : safeToSpend).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
              </h1>
              {isZeroBasedMode && Math.abs(unassigned) < 0.01 && (
                <span className="bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-400/30 animate-pulse">
                  {t('dashboard.perfected')}
                </span>
              )}
            </div>
          </div>
          <div className="relative z-10 mt-6 flex items-center gap-3 bg-white/10 w-fit px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm">
             <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
               <span className="text-emerald-500 font-bold text-[10px]">✓</span>
             </div>
              <p className="text-xs font-bold text-violet-100 uppercase tracking-tight">
                {isZeroBasedMode ? t('dashboard.zeroBased') : t('dashboard.safeToSpendLabel')}
              </p>
          </div>
          <Button variant="ghost" className="absolute top-10 right-10 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl hidden lg:flex font-bold text-xs ring-1 ring-white/10">
             {t('dashboard.calculationDetails')}
          </Button>
        </div>

        {/* Expenses Card */}
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col justify-between group hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/10 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
               <TrendingDown size={24} />
             </div>
             <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 uppercase">-10% vs {t('dashboard.lastMonth')}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">{t('dashboard.expenses')}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {expenses.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 2 })} $
 CAD
            </h3>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col justify-between group hover:shadow-xl transition-all hover:-translate-y-1">
           <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
               <TrendingUp size={24} />
             </div>
             <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase">+2.4% vs {t('dashboard.lastMonth')}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">{t('dashboard.balance')}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
              {balance.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 2 })} $ CAD
            </h3>
          </div>
        </div>

        {/* Budget Consumption Donut */}
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col items-center relative overflow-hidden">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 z-10">{t('dashboard.budgetStatus')}</h3>
          <div className="relative w-full aspect-square flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1 }]} 
                  cx="50%" cy="50%" 
                  innerRadius={65} outerRadius={85} 
                  paddingAngle={8}
                  dataKey="value"
                  label={({ name, percent }: PieLabelRenderProps) => percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {pieData.length > 0 ? pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />) : <Cell fill="#f1f5f9" stroke="none" />}
                </Pie>
                 <Tooltip 
                  wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', pointerEvents: 'none' }}
                  offset={20}
                  formatter={(value: any, name: any) => [
                    `${Number(value || 0).toLocaleString('fr-CA', { minimumFractionDigits: 0 })} $ (${((Number(value || 0) / (pieData.reduce((s, d) => s + d.value, 0) || 1)) * 100).toFixed(1)}%)`,
                    name || ''
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-4xl font-black text-[#342F74] dark:text-white">{totalConsumedPct.toFixed(0)}%</span>
               <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter mt-1">{t('dashboard.consumed')}</span>
            </div>
          </div>
          
          {/* Metadata Legend */}
          <div className="mt-4 w-full space-y-2 overflow-y-auto max-h-[120px] pr-2 custom-scrollbar">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400 truncate max-w-[120px] group-hover:text-[#5D52D1] transition-colors">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-slate-900 dark:text-white tabular-nums">{d.value.toLocaleString('fr-CA', { minimumFractionDigits: 0 })} $</span>
                  <span className="text-[10px] font-bold text-slate-400">({((d.value / (pieData.reduce((s, v) => s + v.value, 0) || 1)) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            ))}
            {pieData.length === 0 && (
              <div className="text-center py-2 text-[10px] font-bold text-slate-400 uppercase">
                {t('dashboard.noData')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Evolution AreaChart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{t('dashboard.expenseEvolution')}</h3>
            <div className="bg-slate-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-gray-700 text-[10px] font-bold text-slate-500 dark:text-gray-500">
               {t('dashboard.last7Days')}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5D52D1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#5D52D1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} dy={10} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                cursor={{ stroke: '#5D52D1', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#5D52D1" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorAmt)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right Column: Challenges, XP, etc. */}
        <div className="flex flex-col gap-6">
          {/* XP PROGRESS CARD */}
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('gamification.managementXp')}</h3>
               <span className="text-[10px] font-black bg-indigo-50 text-[#5D52D1] px-2 py-0.5 rounded-md uppercase">{t('gamification.level')} {level}</span>
             </div>
             
             <div className="w-full bg-[#F1F3FF] dark:bg-gray-800 rounded-full h-3 mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-[#5D52D1] rounded-full transition-all duration-1000" style={{ width: `${xp % 100}%` }} />
             </div>
             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>{xp} {t('gamification.xpTotal')}</span>
                <span className="text-slate-900 dark:text-gray-300">{xp % 100} / 100 {t('gamification.xp')}</span>
             </div>

             <div className="mt-8 bg-[#EDEBFF] dark:bg-violet-900/10 p-5 rounded-3xl border border-[#D7D1FF] dark:border-violet-900/20 flex gap-4">
                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                   <Award size={20} className="text-[#5D52D1]" />
                </div>
                <p className="text-[11px] font-bold text-[#5D52D1] dark:text-violet-300 leading-relaxed">
                   {t('gamification.categorizeHint')}
                </p>
             </div>
          </div>

          {/* Weekly Challenges */}
          {challenges.length > 0 && (
            <div className="bg-[#EDEBFF] dark:bg-violet-900/20 rounded-[2rem] p-6 shadow-sm border border-[#D7D1FF] dark:border-violet-900/10 space-y-4">
              <h3 className="text-sm font-black text-[#5D52D1] dark:text-violet-300 uppercase tracking-widest flex items-center gap-2">
                🎯 {t('gamification.weeklyChallenges')}
              </h3>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {challenges.map(c => {
                  const isDisappearing = completingIds.includes(c.id);
                  return (
                    <div key={c.id} className={`group relative flex items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-violet-100 dark:border-violet-800/20 hover:shadow-lg transition-all ${isDisappearing ? 'animate-disappear pointer-events-none' : ''}`}>
                      <span className={`text-[12px] font-bold leading-snug transition-all duration-500 ${c.completed ? 'opacity-30 line-through text-slate-900 dark:text-white translate-x-1' : 'text-slate-700 dark:text-violet-100'}`}>{c.text}</span>
                      {!c.completed && (
                        <button 
                          onClick={() => handleClaimChallenge(c.id)} 
                          className="px-4 py-2 rounded-xl bg-violet-100 text-[#5D52D1] flex items-center gap-2 shrink-0 hover:bg-[#5D52D1] hover:text-white transition-all shadow-sm hover:shadow-md group/btn active:scale-95"
                        >
                          <span className="text-[10px] font-black uppercase tracking-wider">{t('gamification.claimReward')}</span>
                          <Zap size={14} className="group-hover/btn:animate-pulse" />
                        </button>
                      )}
                      {c.completed && (
                        <div className="flex items-center gap-2 text-emerald-500 animate-bounce">
                          <span className="text-[10px] font-black uppercase tracking-wider">Claimed!</span>
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 shadow-sm">
                            <Award size={16} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Budgets */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
            {t('dashboard.categoryBudgets')}
          </h3>
          
          <div className="space-y-6">
            {Object.entries(categoryBudgets).map(([cat, config]) => {
              const isLegacy = typeof config === 'number';
              const baseAmt = isLegacy ? config : config?.amount;
              const period = isLegacy ? 'month' : (config?.period || 'month');
              if (baseAmt === undefined) return null;

              const amt = getScaledAmount(baseAmt, period as any);
              const spent = filtered
                .filter(t => (t.category === cat || translateCategory(t.category, 'en') === translateCategory(cat, 'en')) && t.amount < 0)
                .reduce((s, t) => s + Math.abs(t.amount), 0);
                
              const pct = Math.min(100, (spent / amt) * 100);
              const isOver = spent > amt;
              
              return (
                <div key={cat} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOver ? 'bg-rose-500 animate-pulse' : 'bg-indigo-400'}`} />
                      <span className="text-sm font-black text-slate-900 dark:text-white">{translateCategory(cat, language)}</span>
                      <button onClick={() => deleteCategoryBudget(cat)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all text-xs">
                        ✕
                      </button>
                    </div>
                    <div className="text-right">
                       <p className={`text-sm font-black tabular-nums ${isOver ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                         {spent.toFixed(0)} $ / {amt.toFixed(0)} $
                       </p>
                       <span className="text-[9px] uppercase font-black text-slate-400 dark:text-gray-500 tracking-wider font-sans">{t('dashboard.per')} {t(`dashboard.${period}`)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#f1f5f9] dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-[#5D52D1]'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

            {Object.keys(categoryBudgets).length === 0 && (
              <div className="py-8 text-center bg-slate-50 dark:bg-gray-800 rounded-3xl border border-dashed border-slate-200 dark:border-gray-700">
                <p className="text-xs text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('goals.noGoals')}</p>
              </div>
            )}
          </div>

          {/* Inline Add Budget Form */}
          <div className="mt-10 pt-8 border-t border-slate-50 dark:border-gray-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newCatBudgetCat}
                onChange={e => setNewCatBudgetCat(e.target.value)}
                className="col-span-1 h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 text-xs font-bold text-slate-600 dark:text-gray-400 focus:ring-2 focus:ring-[#5D52D1]/20 outline-none"
              >
                <option value="" disabled>{language === 'fr' ? 'Catégorie' : 'Select category'}</option>
                {(language === 'fr' ? CATEGORIES_FR : CATEGORIES_EN).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input 
                type="number" 
                placeholder={t('dashboard.amount')} 
                value={newCatBudgetAmt} 
                onChange={e => setNewCatBudgetAmt(e.target.value)} 
                className="h-12 border-none bg-slate-50 dark:bg-gray-800 rounded-2xl text-xs font-bold px-4 focus:ring-2 focus:ring-[#5D52D1]/20 text-slate-900 dark:text-gray-200" 
              />
            </div>
            <div className="flex gap-3">
              <select
                value={newCatBudgetPeriod}
                onChange={e => setNewCatBudgetPeriod(e.target.value as any)}
                className="flex-1 h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 text-xs font-bold text-slate-600 dark:text-gray-400 focus:ring-2 focus:ring-[#5D52D1]/20 outline-none"
              >
                <option value="week">{t('dashboard.per')} {t('dashboard.week')}</option>
                <option value="month">{t('dashboard.per')} {t('dashboard.month')}</option>
                <option value="year">{t('dashboard.per')} {t('dashboard.year')}</option>
              </select>
              <Button 
                onClick={() => {
                  if (newCatBudgetCat && newCatBudgetAmt) {
                    setCategoryBudget(newCatBudgetCat, parseFloat(newCatBudgetAmt), newCatBudgetPeriod);
                    setNewCatBudgetCat('');
                    setNewCatBudgetAmt('');
                  }
                }}
                className="h-12 px-8 bg-[#5D52D1] hover:bg-[#4A40B5] text-white rounded-2xl font-black text-xs shadow-lg shadow-violet-200 dark:shadow-none"
              >
                {t('transactions.add')}
              </Button>
            </div>
          </div>
        </div>

        {/* Savings Goals */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800">
           <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
            {t('dashboard.savingsGoals')}
          </h3>
          <div className="space-y-6">
            {goals.map(g => (
              <div key={g.id} className="group relative">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl shadow-sm border border-amber-100">{g.emoji}</div>
                    <div>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{g.name}</span>
                        <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 tabular-nums uppercase mt-0.5">${g.currentAmount} / ${g.targetAmount}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteGoal(g.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all font-black text-xs">
                    ✕
                  </button>
                </div>
                <div className="w-full bg-slate-50 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div className="bg-[#F1A21E] h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(241,162,30,0.4)]"
                    style={{ width: `${Math.min(100, (g.currentAmount / g.targetAmount) * 100)}%` }} />
                </div>
              </div>
            ))}
            {goals.length === 0 && (
              <div className="py-12 text-center bg-slate-50 dark:bg-gray-800 rounded-3xl border border-dashed border-slate-200 dark:border-gray-700">
                <p className="text-xs text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('goals.noGoals')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{icon}{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}