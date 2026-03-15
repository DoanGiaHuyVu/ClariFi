import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns';

export const CATEGORIES_EN = ['Food','Rent','Transport','Utilities','Health','Entertainment','Savings','Other'];
export const CATEGORIES_FR = ['Épicerie','Loyer','STM / Transport','Hydro-Québec','RAMQ / Santé','Divertissement','Épargne','Autre'];

export function translateCategory(cat: string, targetLang: 'en' | 'fr'): string {
  const indexEn = CATEGORIES_EN.indexOf(cat);
  const indexFr = CATEGORIES_FR.indexOf(cat);
  
  if (indexEn !== -1) return targetLang === 'fr' ? CATEGORIES_FR[indexEn] : CATEGORIES_EN[indexEn];
  if (indexFr !== -1) return targetLang === 'en' ? CATEGORIES_EN[indexFr] : CATEGORIES_FR[indexFr];
  
  return cat; // fallback if unknown
}

export type Transaction = {
  id: number;
  text: string;
  amount: number;
  category: string;
  date: string; // ISO string e.g. "2026-03-13"
  receipt?: string; // Base64 encoded image
  status: 'completed' | 'pending';
  aiAssigned?: boolean;
};

export type Goal = {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  emoji: string;
};

export type RecurringBill = {
  id: number;
  text: string;
  amount: number;
  category: string;
  frequency: 'weekly' | 'monthly';
  nextDueDate: string;
};

export type Asset = {
  id: number;
  name: string;
  value: number;
  type: 'cash' | 'investment' | 'property' | 'other';
};

export type Liability = {
  id: number;
  name: string;
  value: number; // positive number representing debt
  interestRate: number; // e.g. 5.5 for 5.5%
};

type Store = {
  transactions: Transaction[];
  goals: Goal[];
  recurringBills: RecurringBill[];
  assets: Asset[];
  liabilities: Liability[];
  budget: number;
  carryForwardBudget: number;
  lastProcessedMonth: string | null;
  categoryBudgets: Record<string, { amount: number; period: 'week' | 'month' | 'year' }>;
  xp: number;
  badges: string[];
  language: 'en' | 'fr';
  currency: 'CAD' | 'USD';
  toast: string | null;
  isZeroBasedMode: boolean;
  isDarkMode: boolean;
  lastLoginDate: string | null;
  currentStreak: number;
  challenges: { id: number; text: string; completed: boolean }[];
  setToast: (msg: string | null) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: number) => void;
  editTransaction: (id: number, updates: Partial<Transaction>) => void;
  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => void;
  deleteRecurringBill: (id: number) => void;
  processRecurringBills: () => void;
  setBudget: (amount: number) => void;
  setCategoryBudget: (category: string, amount: number, period: 'week' | 'month' | 'year') => void;
  deleteCategoryBudget: (category: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  contributeToGoal: (id: number, amount: number) => void;
  awardXP: (points: number) => void;
  unlockBadge: (badge: string) => void;
  toggleZeroBasedMode: () => void;
  toggleDarkMode: () => void;
  checkStreak: () => void;
  generateWeeklyChallenge: (challengeText: string) => void;
  completeChallenge: (id: number) => void;
  removeChallenge: (id: number) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
  deleteGoal: (id: number) => void;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  deleteAsset: (id: number) => void;
  addLiability: (liability: Omit<Liability, 'id'>) => void;
  deleteLiability: (id: number) => void;
  processCarryForward: () => void;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      transactions: [],
      goals: [],
      recurringBills: [],
      assets: [],
      liabilities: [],
      budget: 0,
      carryForwardBudget: 0,
      lastProcessedMonth: null,
      categoryBudgets: {},
      xp: 0,
      badges: [],
      language: 'fr', // Quebec defaults to French
      currency: 'CAD',
      toast: null,
      isZeroBasedMode: false,
      isDarkMode: false,
      lastLoginDate: null,
      currentStreak: 0,
      challenges: [],

      setToast: (msg) => set({ toast: msg }),

      toggleZeroBasedMode: () => set((s) => ({ isZeroBasedMode: !s.isZeroBasedMode })),

      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),

      checkStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = get().lastLoginDate;
        
        if (!lastLogin) {
          set({ lastLoginDate: today, currentStreak: 1 });
          return;
        }

        if (lastLogin === today) return; // Already checked today

        const lastDate = new Date(lastLogin);
        const diffDays = Math.floor((new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          set((s) => ({ lastLoginDate: today, currentStreak: s.currentStreak + 1 }));
          get().awardXP(50); // Big XP for streak!
        } else {
          set({ lastLoginDate: today, currentStreak: 1 });
        }
      },

      generateWeeklyChallenge: (text) => set((s) => ({
        challenges: [{ id: Date.now(), text, completed: false }, ...s.challenges].slice(0, 3) 
      })),

      completeChallenge: (id) => set((s) => {
        const challenge = s.challenges.find(c => c.id === id);
        if (challenge && !challenge.completed) {
          // Award XP and mark as completed in a single update to avoid race conditions
          return { 
            xp: s.xp + 100,
            challenges: s.challenges.map(c => c.id === id ? { ...c, completed: true } : c) 
          };
        }
        return s;
      }),
      removeChallenge: (id: number) => set((s) => ({
        challenges: s.challenges.filter(c => c.id !== id)
      })),

      addTransaction: (tx) => {
        const now = new Date();
        const isDuplicate = get().transactions.some(t => 
          t.amount === tx.amount && 
          t.text.toLowerCase().trim() === tx.text.toLowerCase().trim() && 
          (now.getTime() - new Date(t.date).getTime()) < 7 * 24 * 60 * 60 * 1000
        );

        if (isDuplicate) {
          get().setToast(`⚠️ ${get().language === 'fr' ? 'Doublon détecté' : 'Duplicate detected'}: ${tx.text} ($${Math.abs(tx.amount)})`);
          setTimeout(() => get().setToast(null), 5000); // auto clear toast
        }

        const newTx: Transaction = { 
          ...tx, 
          id: Date.now(),
          status: 'completed',
          aiAssigned: Math.random() > 0.5 // Mock AI assignment for demo
        };
        set((s) => ({ transactions: [newTx, ...s.transactions] }));
        get().awardXP(5); // XP for logging
      },
      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      editTransaction: (id, updates) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      addRecurringBill: (bill) =>
        set((s) => ({ recurringBills: [...s.recurringBills, { ...bill, id: Date.now() }] })),
      deleteRecurringBill: (id) =>
        set((s) => ({ recurringBills: s.recurringBills.filter((b) => b.id !== id) })),
      processRecurringBills: () => {
        const now = new Date();
        set((s) => {
          let updatedBills = [...s.recurringBills];
          let updatedTxs = [...s.transactions];
          
          updatedBills = updatedBills.map((bill) => {
            let nextDate = new Date(bill.nextDueDate);
            let addedTx = false;
            
            while (now >= nextDate) {
              updatedTxs.unshift({
                id: Date.now() + Math.random(),
                text: bill.text,
                amount: bill.amount,
                category: bill.category,
                date: nextDate.toISOString().split('T')[0],
                status: 'completed'
              });
              addedTx = true;
              
              if (bill.frequency === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
              } else {
                nextDate.setDate(nextDate.getDate() + 7);
              }
            }
            
            // Note: In strict mode, we shouldn't trigger XP here easily or it would fire multiple times, 
            // but for MVP this is acceptable.
            return addedTx ? { ...bill, nextDueDate: nextDate.toISOString().split('T')[0] } : bill;
          });
          
          return { recurringBills: updatedBills, transactions: updatedTxs };
        });
      },
      setBudget: (amount) => set({ budget: amount }),
      setCategoryBudget: (category, amount, period) =>
        set((s) => ({ categoryBudgets: { ...s.categoryBudgets, [category]: { amount, period } } })),
      deleteCategoryBudget: (category) =>
        set((s) => {
          const newBudgets = { ...s.categoryBudgets };
          delete newBudgets[category];
          return { categoryBudgets: newBudgets };
        }),
      addGoal: (goal) =>
        set((s) => ({ goals: [...s.goals, { ...goal, id: Date.now() }] })),
      contributeToGoal: (id, amount) =>
        set((s) => {
          const goal = s.goals.find((g) => g.id === id);
          if (!goal) return s;

          const newTx: Transaction = {
            id: Date.now(),
            text: `${s.language === 'fr' ? 'Épargne' : 'Savings'}: ${goal.name}`,
            amount: -Math.abs(amount), // Always negative (expense from balance)
            category: s.language === 'fr' ? 'Épargne' : 'Savings',
            date: new Date().toISOString().split('T')[0],
            status: 'completed'
          };

          return {
            goals: s.goals.map((g) =>
              g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g
            ),
            transactions: [newTx, ...s.transactions],
            xp: s.xp + 20, // Move XP logic here to keep it centralized
          };
        }),
      awardXP: (points) => set((s) => ({ xp: s.xp + points })),
      unlockBadge: (badge) =>
        set((s) =>
          s.badges.includes(badge) ? s : { badges: [...s.badges, badge] }
        ),
      setLanguage: (lang) => set({ language: lang }),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      addAsset: (asset) => set((s) => ({ assets: [...s.assets, { ...asset, id: Date.now() }] })),
      deleteAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
      addLiability: (liability) => set((s) => ({ liabilities: [...s.liabilities, { ...liability, id: Date.now() }] })),
      deleteLiability: (id) => set((s) => ({ liabilities: s.liabilities.filter((l) => l.id !== id) })),
      processCarryForward: () => {
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${today.getMonth() + 1}`; // e.g., "2026-3"
        const lastMonth = get().lastProcessedMonth;

        if (lastMonth && lastMonth !== currentMonth) {
          const txs = get().transactions;
          const [lastYear, lastMonthNum] = lastMonth.split('-').map(Number);
          
          const lastMonthTxs = txs.filter(t => {
            const date = parseISO(t.date);
            return date.getFullYear() === lastYear && date.getMonth() + 1 === lastMonthNum;
          });

          const expenses = lastMonthTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
          const totalBudgeted = get().budget; 
          const remainder = totalBudgeted - expenses;

          if (remainder > 0) {
            set((s) => ({ 
              carryForwardBudget: s.carryForwardBudget + remainder,
              lastProcessedMonth: currentMonth
            }));
            const lang = get().language;
            get().setToast(lang === 'fr' 
              ? `Report de budget : ${remainder.toFixed(2)}$ ajoutés !` 
              : `Budget carried forward: $${remainder.toFixed(2)} added!`);
            get().awardXP(100);
          } else {
            set({ lastProcessedMonth: currentMonth });
          }
        } else if (!lastMonth) {
          set({ lastProcessedMonth: currentMonth });
        }
      },
    }),
    { name: 'clarifi-storage' }
  )
);

export type Timeframe = 'week' | 'month' | 'year' | 'all';

export const filterTransactions = (txs: Transaction[], timeframe: Timeframe) => {
  if (timeframe === 'all') return txs;
  return txs.filter((t) => {
    const d = parseISO(t.date);
    if (timeframe === 'week') return isThisWeek(d);
    if (timeframe === 'month') return isThisMonth(d);
    if (timeframe === 'year') return isThisYear(d);
    return true;
  });
};

export const getIncome = (txs: Transaction[]) => {
  return txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
};

export const getExpenses = (txs: Transaction[]) => {
  return txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
};

export const getCategoryTotals = (txs: Transaction[]) => {
  const totals: Record<string, number> = {};
  txs.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount; // signed — no Math.abs!
  });
  return totals;
};