'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dashboard } from '@/components/ui/Dashboard';
import { AddTransaction } from '@/components/ui/AddTransaction';
import { Goals } from '@/components/ui/Goals';
import { AssetsAndLiabilities } from '@/components/ui/AssetsAndLiabilities';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useStore, translateCategory, filterTransactions, Timeframe, CATEGORIES_EN, CATEGORIES_FR } from '@/lib/store';
import { exportToPDF, exportToCSV } from '@/lib/export';
import {
  Plus, Search, LayoutDashboard, History, Target, Settings, Sparkles, DollarSign, LogOut,
  FileText, Edit2, Trash2, ShoppingBag, HeartPulse, Home as HomeIcon, Gamepad2, Car, Zap,
  ArrowLeftRight, Bell, Wallet
} from 'lucide-react';
import { CopilotChat } from '@copilotkit/react-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, subDays } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export default function Home() {
  const { t } = useTranslation();
  const { 
    transactions, deleteTransaction, editTransaction, language, 
    toast, setToast, currentStreak, checkStreak, xp 
  } = useStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeFilter, setTimeFilter] = useState<Timeframe>('all');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmt, setEditAmt] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editDate, setEditDate] = useState('');

  const startEdit = (tx: any) => {
    setEditingId(tx.id);
    setEditDesc(tx.text);
    setEditAmt(tx.amount.toString());
    setEditCat(tx.category);
    setEditDate(tx.date);
  };

  const saveEdit = () => {
    if (editingId) {
      editTransaction(editingId, { text: editDesc, amount: parseFloat(editAmt), category: editCat, date: editDate });
      setEditingId(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkStreak(); // Log activity for streak on load
  }, [checkStreak]);

  const filteredTransactions = filterTransactions(transactions, timeFilter);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900" />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] dark:bg-gray-950 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-slate-100 dark:border-gray-800 flex flex-col sticky top-0 h-screen z-20 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-black text-[#5D52D1] tracking-tight">ClariFi</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">{t('app.tagline')}</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label={language === 'fr' ? 'Tableau de bord' : 'Dashboard'} 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<ArrowLeftRight size={20} />} 
            label={language === 'fr' ? 'Transactions' : 'Transactions'} 
            active={activeTab === 'transactions'} 
            onClick={() => setActiveTab('transactions')} 
          />
          <SidebarItem 
            icon={<Target size={20} />} 
            label={language === 'fr' ? 'Objectifs' : 'Goals'} 
            active={activeTab === 'goals'} 
            onClick={() => setActiveTab('goals')} 
          />
          <SidebarItem 
            icon={<Sparkles size={20} />} 
            label={t('nav.ai')} 
            active={activeTab === 'copilot'} 
            onClick={() => setActiveTab('copilot')} 
          />
          <SidebarItem 
            icon={<DollarSign size={20} />} 
            label={t('nav.assets')} 
            active={activeTab === 'assets'} 
            onClick={() => setActiveTab('assets')} 
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label={t('nav.settings')} 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        {/* Upgrade Card */}
        <div className="p-4 mx-3 mb-6 bg-[#EDEBFF] dark:bg-violet-900/20 rounded-2xl border border-[#D7D1FF] dark:border-violet-800/50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#5D52D1] opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm mb-3">
              <Sparkles size={16} className="text-[#5D52D1]" />
            </div>
            <h4 className="text-sm font-bold text-[#342F74] dark:text-violet-200">{t('pro.upgrade')}</h4>
            <p className="text-[10px] text-[#7168B5] dark:text-violet-400 mt-1 leading-relaxed">
              {t('pro.feature')}
            </p>
            <Button size="sm" className="w-full mt-4 bg-[#5D52D1] hover:bg-[#4A40B5] text-white rounded-xl text-[11px] font-bold h-8 shadow-md shadow-violet-200 dark:shadow-none transition-all active:scale-95">
              {t('pro.button')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-transparent px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#5D52D1] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder={t('header.search')} 
                className="w-full bg-white dark:bg-gray-900 border-none rounded-2xl py-3 pl-12 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-[#5D52D1]/20 transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 pr-6 border-r border-slate-200 dark:border-gray-800">
               <LanguageToggle />
               <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                 <Bell size={20} />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
               </button>
            </div>

            <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                 <p className="text-sm font-bold text-slate-900 dark:text-gray-100">Jean Tremblay</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t("header.proMember")}</p>
               </div>
               <div className="w-10 h-10 rounded-2xl bg-[#FFE5D3] overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jean" alt="Avatar" className="w-full h-full object-cover" />
               </div>
            </div>
            
            {currentStreak > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-2xl border border-orange-100 dark:border-orange-800/50 shadow-sm animate-in fade-in zoom-in duration-500">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-black text-orange-600 dark:text-orange-400">{currentStreak}</span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            
            {activeTab === 'transactions' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('nav.transactions')}</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setToast(language === 'fr' ? 'Exportation PDF en cours...' : 'Exporting PDF...');
                        exportToPDF(filteredTransactions, language, 'ClariFi_History');
                      }} 
                      className="text-xs font-bold text-[#5D52D1] hover:bg-[#5D52D1]/5 px-4 py-2 rounded-xl transition-all"
                    >
                      PDF
                    </button>
                    <button 
                      onClick={() => {
                        setToast(language === 'fr' ? 'Exportation CSV en cours...' : 'Exporting CSV...');
                        exportToCSV(filteredTransactions, language, 'ClariFi_History');
                      }} 
                      className="text-xs font-bold text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                <AddTransaction />
                             <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                    {t('transactions.history')}
                  </span>
                  <div className="flex bg-white dark:bg-gray-900 rounded-2xl p-1 shadow-sm border border-slate-100 dark:border-gray-800">
                    {(['week', 'month', 'year', 'all'] as Timeframe[]).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeFilter(tf)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all capitalize tracking-tighter ${timeFilter === tf ? 'bg-[#5D52D1] text-white shadow-lg shadow-violet-100 dark:shadow-none' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                      >
                        {t(`dashboard.${tf}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-50 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-slate-50 dark:border-gray-800 bg-slate-50/30 dark:bg-gray-800/20">
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('transactions.date')}</div>
                    <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('transactions.merchant')}</div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('transactions.category')}</div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('transactions.amount')}</div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('transactions.actions')}</div>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-gray-800">
                    {filteredTransactions.map(tx => (
                      <TransactionRow 
                        key={tx.id}
                        tx={tx}
                        isEditing={editingId === tx.id}
                        language={language}
                        onEdit={() => startEdit(tx)}
                        onDelete={() => deleteTransaction(tx.id)}
                        onSave={saveEdit}
                        onCancel={() => setEditingId(null)}
                        editState={{ editDesc, setEditDesc, editAmt, setEditAmt, editCat, setEditCat, editDate, setEditDate }}
                      />
                    ))}
                  </div>
                  {filteredTransactions.length === 0 && (
                    <div className="p-20 text-center">
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                        {language === 'fr' ? 'Aucune transaction.' : 'No transactions.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'copilot' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-160px)]">
                <CopilotChat 
                  className="rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden h-full"
                  instructions="You are ClariFi, the user's personal budget coach. Help them manage their spending, set goals, and analyze their habits."
                />
              </div>
            )}
            {activeTab === 'goals' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><Goals /></div>}
            {activeTab === 'assets' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><AssetsAndLiabilities /></div>}
            {activeTab === 'settings' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{t('nav.settings')}</h2>
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-gray-800">
                   <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-bold text-slate-900 dark:text-white">{t('settings.zeroBasedTitle')}</h4>
                       <p className="text-sm text-slate-500 mt-1 italic">{t('settings.zeroBasedDesc')}</p>
                     </div>
                     <button 
                       onClick={() => useStore.getState().toggleZeroBasedMode()}
                       className={`w-12 h-6 rounded-full transition-colors relative ${useStore.getState().isZeroBasedMode ? 'bg-[#5D52D1]' : 'bg-slate-200'}`}
                     >
                       <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useStore.getState().isZeroBasedMode ? 'left-7' : 'left-1'}`} />
                     </button>
                   </div>
                   
                   <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-100 dark:border-gray-800">
                     <div>
                       <h4 className="font-bold text-slate-900 dark:text-white">{t('settings.darkModeTitle')}</h4>
                       <p className="text-sm text-slate-500 mt-1 italic">{t('settings.darkModeDesc')}</p>
                     </div>
                     <button 
                       onClick={() => useStore.getState().toggleDarkMode()}
                       className={`w-12 h-6 rounded-full transition-colors relative ${useStore.getState().isDarkMode ? 'bg-[#5D52D1]' : 'bg-slate-200'}`}
                     >
                       <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useStore.getState().isDarkMode ? 'left-7' : 'left-1'}`} />
                     </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 border border-slate-700">
          <span className="text-sm font-bold tracking-tight">{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white transition-colors bg-white/10 rounded-full p-1"><LogOut size={14} className="rotate-90" /></button>
        </div>
      )}
    </div>
  );
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const cat = translateCategory(category, 'en').toLowerCase();
  
  if (cat.includes('rent') || cat.includes('loyer')) return <div className={`bg-blue-50 text-blue-500 ${className}`}><HomeIcon size={18} /></div>;
  if (cat.includes('food') || cat.includes('alimentaire') || cat.includes('épicerie')) return <div className={`bg-orange-50 text-orange-500 ${className}`}><ShoppingBag size={18} /></div>;
  if (cat.includes('transport')) return <div className={`bg-indigo-50 text-indigo-500 ${className}`}><Car size={18} /></div>;
  if (cat.includes('utilities') || cat.includes('services publics') || cat.includes('hydro')) return <div className={`bg-yellow-50 text-yellow-500 ${className}`}><Zap size={18} /></div>;
  if (cat.includes('health') || cat.includes('santé')) return <div className={`bg-emerald-50 text-emerald-500 ${className}`}><HeartPulse size={18} /></div>;
  if (cat.includes('entertainment') || cat.includes('divertissement')) return <div className={`bg-purple-50 text-purple-500 ${className}`}><Gamepad2 size={18} /></div>;
  if (cat.includes('savings') || cat.includes('épargne')) return <div className={`bg-emerald-50 text-emerald-500 ${className}`}><Wallet size={18} /></div>;
  
  return <div className={`bg-slate-50 text-slate-500 ${className}`}><DollarSign size={18} /></div>;
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-[#5D52D1] text-white shadow-lg shadow-violet-200 dark:shadow-none translate-x-1' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800'}`}
    >
      <span className={active ? 'text-white' : 'text-slate-400'}>{icon}</span>
      {label}
    </button>
  );
}

function TransactionRow({ tx, isEditing, language, onEdit, onDelete, onSave, onCancel, editState }: any) {
  const { t } = useTranslation();
  if (isEditing) {
    const categories = language === 'fr' ? CATEGORIES_FR : CATEGORIES_EN;
    return (
      <div className="px-8 py-6 bg-violet-50/30 dark:bg-violet-900/10">
        <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-12 lg:col-span-4">
               <Input value={editState.editDesc} onChange={e => editState.setEditDesc(e.target.value)} className="h-10 rounded-xl" placeholder="Description" />
            </div>
            <div className="col-span-6 lg:col-span-3">
               <select 
                 value={editState.editCat} 
                 onChange={e => editState.setEditCat(e.target.value)}
                 className="w-full h-10 px-3 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-medium"
               >
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            <div className="col-span-6 lg:col-span-2">
               <Input type="number" step="0.01" value={editState.editAmt} onChange={e => editState.setEditAmt(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="col-span-12 lg:col-span-3 flex justify-end gap-2">
               <button onClick={onSave} className="bg-[#5D52D1] text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">✓</button>
               <button onClick={onCancel} className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-black">✕</button>
            </div>
        </div>
      </div>
    );
  }

  const dateObj = parseISO(tx.date);
  const day = format(dateObj, 'dd');
  const monthYear = format(dateObj, 'MMM yyyy', { locale: language === 'fr' ? fr : enUS });

  return (
    <div className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-slate-50/50 dark:hover:bg-gray-800/10 transition-all group">
      <div className="col-span-2 flex flex-col">
        <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{day}</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{monthYear}</span>
      </div>

      <div className="col-span-4 flex items-center gap-4">
        <CategoryIcon category={tx.category} className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-900 shadow-sm" />
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#5D52D1] transition-colors">{tx.text}</span>
          {tx.receipt && (
            <button 
              onClick={() => {
                const w = window.open();
                if(w) w.document.write(`<img src="${tx.receipt}" style="max-width:100%; border-radius:12px; margin:20px;" />`);
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-0.5 uppercase tracking-tight hover:underline transition-all"
            >
              <FileText size={10} /> {t('transactions.receiptAttached')}
            </button>
          )}
        </div>
      </div>

      <div className="col-span-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-slate-500">{translateCategory(tx.category, language)}</span>
           {tx.aiAssigned && (
             <span className="bg-violet-50 dark:bg-violet-900/20 text-[#5D52D1] dark:text-violet-300 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-violet-100 dark:border-violet-800/20">
               COPILOT
             </span>
           )}
        </div>
      </div>

      <div className="col-span-2">
        <div className={`text-sm font-black tabular-nums transition-all ${tx.amount > 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
          {tx.amount > 0 ? '+' : '-'} {Math.abs(tx.amount).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 2 })} $
        </div>
      </div>

      <div className="col-span-2 flex justify-end items-center gap-3">
        <div className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
          {tx.status === 'completed' ? t('transactions.completed') : t('transactions.pending')}
        </div>
        <button onClick={onEdit} className="text-slate-300 hover:text-[#5D52D1] transition-colors p-1.5 hover:bg-violet-50 rounded-lg">
          <Edit2 size={16} />
        </button>
        <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 hover:bg-rose-50 rounded-lg">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
