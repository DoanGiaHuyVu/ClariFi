'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';
import { useCopilotAction } from '@copilotkit/react-core';
import { Award, Target as TargetIcon } from 'lucide-react';

const GOAL_EMOJIS = ['🏖️','🚗','💻','🏠','🎓','💍','✈️','🎮','🆘','💰'];

const BADGES = [
  { id: 'first_transaction', label: '🎯 First Transaction', labelFr: '🎯 Première transaction' },
  { id: 'goal_created',      label: '🥅 Goal Setter',        labelFr: '🥅 Planificateur' },
  { id: 'goal_completed',    label: '🏆 Goal Crusher',       labelFr: '🏆 Objectif atteint' },
  { id: 'streak_7',          label: '🔥 7-Day Streak',       labelFr: '🔥 7 jours de suite' },
  { id: 'under_budget',      label: '✅ Under Budget',       labelFr: '✅ Sous le budget' },
];

export function Goals() {
  const { t } = useTranslation();
  const { goals, addGoal, contributeToGoal, awardXP, unlockBadge, badges, language, deleteGoal } = useStore();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState('🏖️');
  const [contribution, setContribution] = useState<Record<number, string>>({});

  useCopilotAction({
    name: 'createGoal',
    description: 'Create a savings goal when user wants to save for something specific.',
    parameters: [
      { name: 'name', type: 'string' },
      { name: 'targetAmount', type: 'number' },
      { name: 'targetDate', type: 'string' },
      { name: 'emoji', type: 'string', description: 'An emoji representing the goal' },
    ],
    handler: async ({ name, targetAmount, targetDate, emoji }) => {
      addGoal({ name, targetAmount, currentAmount: 0, targetDate, emoji: emoji || '🎯' });
      awardXP(50);
      unlockBadge('goal_created');
      return language === 'fr' ? `Objectif créé : ${name}` : `Goal created: ${name}`;
    },
  });

  const handleCreateGoal = () => {
    if (!name || !target) return;
    addGoal({ name, targetAmount: parseFloat(target), currentAmount: 0, targetDate: deadline, emoji });
    awardXP(50);
    unlockBadge('goal_created');
    setName(''); setTarget(''); setDeadline('');
  };

  const handleContribute = (goalId: number) => {
    const amount = parseFloat(contribution[goalId] || '0');
    if (!amount) return;
    const goal = goals.find(g => g.id === goalId)!;
    contributeToGoal(goalId, amount);
    const newAmount = goal.currentAmount + amount;
    if (newAmount >= goal.targetAmount) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      unlockBadge('goal_completed');
    }
    setContribution(c => ({ ...c, [goalId]: '' }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('nav.goals')}</h2>
        <div className="flex bg-[#EDEBFF] dark:bg-violet-900/20 px-4 py-2 rounded-2xl border border-[#D7D1FF] dark:border-violet-800/20">
           <span className="text-xs font-black text-[#5D52D1] dark:text-violet-300 uppercase tracking-widest flex items-center gap-2">
             <Award size={14} /> {badges.length} BADGES
           </span>
        </div>
      </div>

      {/* Create goal form */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800 space-y-6">
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('goals.create')}</h3>
        <div className="flex gap-3 flex-wrap">
          {GOAL_EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`text-2xl p-3 rounded-2xl transition-all ${emoji === e ? 'bg-[#5D52D1] dark:bg-violet-700/80 shadow-lg shadow-violet-200 dark:shadow-none scale-110' : 'bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700'}`}>{e}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder={t('goals.title')} value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-sm text-slate-900 dark:text-gray-200" />
          <Input type="number" placeholder={`${t('goals.target')} (CAD)`} value={target} onChange={e => setTarget(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-sm text-slate-900 dark:text-gray-200" />
          <div className="md:col-span-2">
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-sm text-slate-900 dark:text-gray-200" />
          </div>
        </div>
        <Button className="w-full h-14 bg-[#F1A21E] dark:bg-amber-600/80 hover:bg-[#D48F1A] dark:hover:bg-amber-600 text-white rounded-[1.5rem] font-black text-base shadow-xl shadow-amber-100 dark:shadow-none transition-all active:scale-95" onClick={handleCreateGoal}>
          {t('goals.create')} ✨
        </Button>
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const done = pct >= 100;
          return (
            <div key={goal.id} className={`bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border-2 transition-all hover:shadow-xl ${done ? 'border-amber-400' : 'border-slate-50 dark:border-gray-800'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-amber-100 dark:border-amber-800/30">{goal.emoji}</div>
                  <div>
                    <span className="text-lg font-black text-slate-900 dark:text-white block uppercase tracking-tight">{goal.name}</span>
                    {done && <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[10px] px-2 py-0.5 mt-1">✓ {language === 'fr' ? 'TERMINÉ!' : 'DONE!'}</Badge>}
                  </div>
                </div>
                <button onClick={() => deleteGoal(goal.id)}
                  className="w-8 h-8 rounded-full bg-slate-50 dark:bg-gray-800 text-slate-300 hover:text-rose-500 transition-all font-black text-xs flex items-center justify-center">
                  ✕
                </button>
              </div>
              
              <div className="flex justify-between items-end mb-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">${goal.currentAmount.toFixed(0)} <span className="text-slate-400 text-sm">/ ${goal.targetAmount}</span></p>
                <p className="text-xs font-black text-[#F1A21E]">{pct.toFixed(0)}%</p>
              </div>

              <div className="w-full bg-slate-50 dark:bg-gray-800 rounded-full h-3 mb-6 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${done ? 'bg-emerald-500' : 'bg-[#F1A21E]'}`}
                  style={{ width: `${pct}%` }} />
              </div>

              {!done && (
                <div className="flex gap-3">
                  <Input 
                    type="number" 
                    placeholder={t('goals.contribute')} 
                    value={contribution[goal.id] || ''}
                    onChange={e => setContribution(c => ({ ...c, [goal.id]: e.target.value }))} 
                    className="h-11 rounded-[1rem] border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-xs text-slate-900 dark:text-gray-200 placeholder:text-slate-300 dark:placeholder:text-gray-500"
                  />
                  <Button onClick={() => handleContribute(goal.id)} className="h-11 px-6 bg-[#5D52D1] dark:bg-violet-700/80 hover:bg-[#4A40B5] dark:hover:bg-violet-700 text-white rounded-[1rem] font-black shadow-lg shadow-violet-200 dark:shadow-none">+</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Badge wall */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800">
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">{t('gamification.badges')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {BADGES.map(b => {
            const unlocked = badges.includes(b.id);
            return (
              <div key={b.id} className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all ${unlocked ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30' : 'bg-slate-50 dark:bg-gray-800 border-transparent opacity-40'}`}>
                <div className={`text-3xl mb-3 ${unlocked ? 'grayscale-0' : 'grayscale'}`}>
                  {b.labelFr.split(' ')[0]}
                </div>
                <p className="text-[10px] font-black text-center text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                  {language === 'fr' ? b.labelFr.split(' ').slice(1).join(' ') : b.label.split(' ').slice(1).join(' ')}
                </p>
                {unlocked && (
                  <div className="mt-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white">✓</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
