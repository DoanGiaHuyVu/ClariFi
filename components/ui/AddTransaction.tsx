'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, translateCategory, CATEGORIES_EN, CATEGORIES_FR } from '@/lib/store';
import { getCADRate } from '@/lib/currency';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { Plus, Pencil, Calendar, DollarSign, Upload, RefreshCw, X, Check } from 'lucide-react';

export function AddTransaction() {
  const { t } = useTranslation();
  const { addTransaction, addRecurringBill, transactions, budget, language } = useStore();
  
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
  
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState('USD');
  const [isConverting, setIsConverting] = useState(false);
  const [receipt, setReceipt] = useState<string | undefined>();

  const [dragActive, setDragActive] = useState(false);

  const categories = language === 'fr' ? CATEGORIES_FR : CATEGORIES_EN;

  const handleReceiptFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceipt(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReceiptFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleReceiptFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  useCopilotReadable({
    description: 'Current transactions, budget, and spending summary',
    value: {
      recentTransactions: transactions.slice(0, 20),
      monthlyBudget: budget,
      totalBalance: transactions.reduce((s: any, t: any) => s + t.amount, 0),
      language,
    },
  });

  useCopilotAction({
    name: 'addTransaction',
    description: 'Add a new transaction. Use when user says "I spent X on Y" or "I earned X".',
    parameters: [
      { name: 'text', type: 'string', description: 'Description' },
      { name: 'amount', type: 'number', description: 'Positive=income, negative=expense' },
      { name: 'category', type: 'string', description: `Category name. MUST exactly match one of: ${CATEGORIES_EN.join(', ')} or ${CATEGORIES_FR.join(', ')}` },
      { name: 'date', type: 'string', description: 'ISO date, default today' },
    ],
    handler: async ({ text, amount, category, date }: any) => {
      addTransaction({ 
        text, 
        amount, 
        category, 
        date: date || new Date().toISOString().split('T')[0],
        status: 'completed'
      });
      return t('transactions.transactionAdded', { text, amount: `${amount > 0 ? '+' : ''}$${amount} CAD` });
    },
  });

  const handleConvert = async () => {
    if (!foreignAmount) return;
    setIsConverting(true);
    try {
      const val = parseFloat(foreignAmount.replace(',', '.'));
      const rate = await getCADRate(foreignCurrency as any);
      const converted = (val * rate).toFixed(2);
      setAmount(converted);
      setForeignAmount('');
    } catch (err) {
      console.error("Conversion failed", err);
    }
    setIsConverting(false);
  };

  const handleSubmit = () => {
    if (!text || !amount || !category) return;
    let parsedAmount = Math.abs(parseFloat(amount));
    if (type === 'expense') parsedAmount = -parsedAmount;
    
    addTransaction({ text, amount: parsedAmount, category, date, receipt, status: 'completed' });
    
    if (isRecurring) {
      const d = new Date(date);
      if (frequency === 'monthly') {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      addRecurringBill({
        text,
        amount: parsedAmount,
        category,
        frequency,
        nextDueDate: d.toISOString().split('T')[0]
      });
    }

    setText('');
    setAmount('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setReceipt(undefined);
  };
    return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-50 dark:border-gray-800 p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Type Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-50 dark:bg-gray-800/50 p-1.5 rounded-full flex w-full max-w-sm border border-slate-100 dark:border-gray-800 shadow-inner">
          <button 
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-xs font-black transition-all ${type === 'expense' ? 'bg-[#FF4F4F] text-white shadow-lg shadow-red-200 dark:shadow-rose-950/40' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            <RefreshCw size={14} className="rotate-45" />
            {t('transactions.expense')}
          </button>
          <button 
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-xs font-black transition-all ${type === 'income' ? 'bg-white dark:bg-gray-900 text-slate-800 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            <RefreshCw size={14} className="-rotate-45" />
            {t('transactions.income')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {t('transactions.description')}
            </label>
            <div className="group relative">
              <Pencil className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 group-focus-within:text-[#5D52D1] transition-colors" size={18} />
              <input 
                placeholder={t('transactions.descriptionPlaceholder')} 
                value={text} 
                onChange={e => setText(e.target.value)} 
                className="w-full h-14 pl-12 pr-4 bg-slate-50/50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-[#5D52D1]/10 focus:border-[#5D52D1] outline-none transition-all text-sm font-bold placeholder:text-slate-300 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {language === 'fr' ? 'Montant (CAD)' : 'Amount (CAD)'}
            </label>
            <div className="group relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 group-focus-within:text-[#5D52D1] transition-colors" size={18} />
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="w-full h-14 pl-12 pr-4 bg-slate-50/50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-[#5D52D1]/10 focus:border-[#5D52D1] outline-none transition-all text-sm font-bold placeholder:text-slate-300 dark:placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {t('transactions.category')}
            </label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              className="w-full h-14 px-4 bg-slate-50/50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-[#5D52D1]/10 focus:border-[#5D52D1] outline-none transition-all text-sm font-bold appearance-none cursor-pointer text-slate-800 dark:text-gray-200 placeholder:text-slate-300 dark:placeholder:text-gray-500"
            >
              <option value="" disabled>{t('transactions.category')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Recurring Toggle */}
          <div className="p-5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-800 flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shadow-sm text-[#5D52D1]">
                <Calendar size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white">{t('transactions.recurring')}</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-tighter">{t('transactions.repeatMonthly')}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-12 h-6 rounded-full transition-all relative ${isRecurring ? 'bg-[#5D52D1]' : 'bg-slate-200 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isRecurring ? 'left-7 px-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {language === 'fr' ? 'Date de la transaction' : 'Transaction Date'}
            </label>
            <div className="group relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 group-focus-within:text-[#5D52D1] transition-colors" size={18} />
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full h-14 pl-12 pr-4 bg-slate-50/50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-[#5D52D1]/10 focus:border-[#5D52D1] outline-none transition-all text-sm font-bold dark:text-gray-200"
              />
            </div>
          </div>

          {/* Currency Converter Card */}
          <div className="p-6 bg-violet-50/40 dark:bg-violet-900/10 rounded-[2rem] border border-violet-100 dark:border-violet-900/30 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[#5D52D1]">
                <RefreshCw size={16} />
                <span className="text-xs font-black uppercase tracking-widest">{t('transactions.currencyConverter')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <input 
                className="flex-1 h-12 px-4 bg-white dark:bg-gray-800 rounded-xl border border-violet-100 dark:border-violet-800/50 text-sm font-bold focus:ring-2 focus:ring-[#5D52D1]/20 outline-none text-slate-800 dark:text-gray-200 placeholder:text-slate-300 dark:placeholder:text-gray-500" 
                placeholder={t('transactions.foreignAmount')} 
                value={foreignAmount} 
                onChange={e => setForeignAmount(e.target.value)} 
                type="number"
                step="0.01"
              />
              <div className="w-24 group relative">
                <select 
                  value={foreignCurrency} 
                  onChange={e => setForeignCurrency(e.target.value)}
                  className="w-full h-12 px-3 bg-white dark:bg-gray-800 rounded-xl border border-violet-100 dark:border-violet-800/50 text-xs font-black appearance-none cursor-pointer outline-none text-slate-800 dark:text-gray-200"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-black">↓</div>
              </div>
              <button 
                onClick={handleConvert}
                disabled={!foreignAmount || isConverting}
                className="h-12 w-12 bg-[#5D52D1] text-white rounded-xl shadow-lg shadow-violet-100 dark:shadow-none flex items-center justify-center hover:bg-[#4A40B5] transition-all disabled:opacity-50"
              >
                {isConverting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-tighter">
              {t('transactions.currentRate')}: 1 USD = 1.36 CAD
            </p>
          </div>

          {/* Receipt Drag & Drop */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {t('transactions.receiptOptional')}
            </label>
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative h-32 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${dragActive ? 'border-[#5D52D1] bg-violet-50/50' : 'border-slate-100 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700'}`}
            >
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleReceiptChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {receipt ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><Check size={20} /></div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase">{t('transactions.uploaded')}</span>
                  <button onClick={(e) => { e.stopPropagation(); setReceipt(undefined); }} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 group-hover:bg-[#5D52D1] group-hover:text-white rounded-xl flex items-center justify-center transition-all text-slate-300">
                    <Upload size={20} />
                  </div>
                  <div className="text-center">
                  <p className="text-[11px] font-black text-slate-700 dark:text-gray-300">{t('transactions.dragHint')}</p>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 tracking-tighter uppercase mt-0.5">PDF, JPG, PNG (Max 5MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6 pt-4">
        <button 
          onClick={handleSubmit}
          disabled={!text || !amount || !category}
          className="flex-1 h-16 bg-[#2D2D8B] text-white rounded-2xl shadow-xl shadow-blue-100/50 dark:shadow-none flex items-center justify-center gap-3 text-sm font-black hover:scale-[1.02] transition-all disabled:opacity-50 disabled:grayscale"
        >
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><Plus size={16} /></div>
          {t('transactions.addTransaction')}
        </button>
        <button 
          onClick={() => { setText(''); setAmount(''); setCategory(''); setReceipt(undefined); }}
          className="text-sm font-black text-slate-400 hover:text-slate-600 transition-colors px-4"
        >
          {t('transactions.cancel')}
        </button>
      </div>
    </div>
  );
}