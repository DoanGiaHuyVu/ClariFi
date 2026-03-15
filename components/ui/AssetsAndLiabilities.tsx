import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AssetsAndLiabilities() {
  const { t } = useTranslation();
  const { assets, liabilities, addAsset, deleteAsset, addLiability, deleteLiability, language } = useStore();

  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetValue, setNewAssetValue] = useState('');
  const [newAssetType, setNewAssetType] = useState<'cash' | 'investment' | 'property' | 'other'>('cash');

  const [newLiabilityName, setNewLiabilityName] = useState('');
  const [newLiabilityValue, setNewLiabilityValue] = useState('');
  const [newLiabilityRate, setNewLiabilityRate] = useState('');

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Calculate 5-year projection
  // Assumptions: Assets grow at an average 5% APY, Liabilities grow at their specific interest rates if not paid down.
  const projectionData = [];
  const currentYear = new Date().getFullYear();

  for (let year = 0; year <= 5; year++) {
    const projectedAssets = assets.reduce((sum, a) => {
      // Cash doesn't really grow, investments grow at 7%, property at 3%
      let rate = 1.0;
      if (a.type === 'investment') rate = 1.07;
      if (a.type === 'property') rate = 1.03;
      return sum + a.value * Math.pow(rate, year);
    }, 0);

    const projectedLiabilities = liabilities.reduce((sum, l) => {
      // Assuming minimum payments just cover interest for this simplistic model, 
      // or that it grows if unpaid. Let's assume it grows to illustrate debt impact.
      return sum + l.value * Math.pow(1 + (l.interestRate / 100), year);
    }, 0);

    projectionData.push({
      year: (currentYear + year).toString(),
      assets: Math.round(projectedAssets),
      liabilities: Math.round(projectedLiabilities),
      netWorth: Math.round(projectedAssets - projectedLiabilities)
    });
  }

  const handleAddAsset = () => {
    if (newAssetName && newAssetValue) {
      addAsset({ name: newAssetName, value: parseFloat(newAssetValue), type: newAssetType });
      setNewAssetName('');
      setNewAssetValue('');
    }
  };

  const handleAddLiability = () => {
    if (newLiabilityName && newLiabilityValue) {
      addLiability({ 
        name: newLiabilityName, 
        value: parseFloat(newLiabilityValue), 
        interestRate: parseFloat(newLiabilityRate) || 0 
      });
      setNewLiabilityName('');
      setNewLiabilityValue('');
      setNewLiabilityRate('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{language === 'fr' ? 'Valeur Nette' : 'Net Worth'}</h2>
        <div className={`px-4 py-2 rounded-2xl border font-black text-xs uppercase tracking-widest ${netWorth >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'}`}>
           {netWorth >= 0 ? 'Solvable' : 'Endetté'}
        </div>
      </div>

      {/* Hero Net Worth Card */}
      <div className="bg-[#5D52D1] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-violet-200 dark:shadow-none relative overflow-hidden flex flex-col md:flex-row justify-between items-center group">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
        <div className="relative z-10 text-center md:text-left">
          <p className="text-sm font-bold text-violet-100 uppercase tracking-widest mb-2 opacity-80">{language === 'fr' ? 'Patrimoine net total' : 'Total Net Worth'}</p>
          <h1 className="text-6xl font-black tracking-tighter">
            {netWorth.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
          </h1>
        </div>
        <div className="mt-8 md:mt-0 relative z-10 w-20 h-20 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/20 shadow-xl group-hover:rotate-12 transition-transform">
          <DollarSign size={40} className="text-white" />
        </div>
      </div>

      {/* Projection Chart Card */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-50 dark:border-gray-800">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{language === 'fr' ? 'Projection sur 5 ans' : '5-Year Projection'}</h3>
            <p className="text-xs font-bold text-slate-400 dark:text-gray-500 mt-1">{language === 'fr' ? 'Croissance moyenne estimée de 5% par an' : 'Estimated 5% annual growth'}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center text-emerald-500">
             <TrendingUp size={24} />
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} dy={10} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px', fontWeight: 'bold' }}
                itemStyle={{ color: '#5D52D1' }}
                formatter={(val) => [`${Number(val).toLocaleString()} $`, '']}
              />
              <Area 
                type="monotone" 
                dataKey="netWorth" 
                stroke="#8b5cf6" 
                strokeWidth={5} 
                fillOpacity={1} 
                fill="url(#colorNetWorth)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assets Section */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-50 dark:border-gray-800 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-3xl -mr-20 -mt-20" />
          
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">{language === 'fr' ? 'Actifs' : 'Assets'}</h3>
            <span className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 px-4 py-2 rounded-2xl font-black text-sm tabular-nums border border-emerald-100">
               {totalAssets.toLocaleString()} $
            </span>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {assets.length === 0 && (
              <div className="py-12 text-center bg-slate-50 dark:bg-gray-800 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 dark:text-gray-500 font-bold uppercase">{language === 'fr' ? 'Aucun actif' : 'No assets'}</p>
              </div>
            )}
            {assets.map(a => (
              <div key={a.id} className="group flex justify-between items-center p-5 bg-slate-50 dark:bg-gray-800/50 rounded-3xl border border-transparent hover:border-emerald-100 hover:bg-emerald-50/10 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center text-lg font-bold">
                     {a.type === 'cash' ? '💵' : a.type === 'investment' ? '📈' : '🏠'}
                   </div>
                   <div>
                     <span className="font-black text-slate-900 dark:text-white block">{a.name}</span>
                     <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">{a.type}</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900 dark:text-white tabular-nums">{a.value.toLocaleString()} $</span>
                  <button onClick={() => deleteAsset(a.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all font-black text-xs p-1">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-50 dark:border-gray-800 space-y-4">
            <Input placeholder={language === 'fr' ? 'Nom de l\'actif' : 'Asset name'} value={newAssetName} onChange={e => setNewAssetName(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-xs text-slate-900 dark:text-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" placeholder={language === 'fr' ? 'Valeur' : 'Value'} value={newAssetValue} onChange={e => setNewAssetValue(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-xs text-slate-900 dark:text-gray-200" />
              <select value={newAssetType} onChange={e => setNewAssetType(e.target.value as any)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 text-xs font-bold text-slate-600 dark:text-gray-400 focus:ring-2 focus:ring-emerald-500/20 outline-none">
                <option value="cash">Cash</option>
                <option value="investment">Placement</option>
                <option value="property">Immobilier</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <Button onClick={handleAddAsset} className="h-14 bg-emerald-600 dark:bg-emerald-700/80 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white w-full rounded-[1.5rem] font-black shadow-lg shadow-emerald-100 dark:shadow-none transition-all">
              <Plus size={18} className="mr-2"/> {language === 'fr' ? 'AJOUTER L\'ACTIF' : 'ADD ASSET'}
            </Button>
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-50 dark:border-gray-800 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 dark:bg-rose-400/5 rounded-full blur-3xl -mr-20 -mt-20" />
          
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-rose-700 dark:text-rose-400 uppercase tracking-tight">{language === 'fr' ? 'Passifs' : 'Liabilities'}</h3>
            <span className="bg-rose-50 dark:bg-rose-900/10 text-rose-600 px-4 py-2 rounded-2xl font-black text-sm tabular-nums border border-rose-100">
               {totalLiabilities.toLocaleString()} $
            </span>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {liabilities.length === 0 && (
              <div className="py-12 text-center bg-slate-50 dark:bg-gray-800 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 dark:text-gray-500 font-bold uppercase">{language === 'fr' ? 'Aucune dette' : 'No debts'}</p>
              </div>
            )}
            {liabilities.map(l => (
              <div key={l.id} className="group flex justify-between items-center p-5 bg-slate-50 dark:bg-gray-800/50 rounded-3xl border border-transparent hover:border-rose-100 hover:bg-rose-50/10 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center text-lg font-bold">💳</div>
                   <div>
                     <span className="font-black text-slate-900 dark:text-white block">{l.name}</span>
                     <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{l.interestRate}% INTÉRÊT</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900 dark:text-white tabular-nums">{l.value.toLocaleString()} $</span>
                  <button onClick={() => deleteLiability(l.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all font-black text-xs p-1">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-50 dark:border-gray-800 space-y-4">
            <Input placeholder={language === 'fr' ? 'Nom du passif' : 'Liability name'} value={newLiabilityName} onChange={e => setNewLiabilityName(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-xs text-slate-900 dark:text-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" placeholder={language === 'fr' ? 'Montant' : 'Amount'} value={newLiabilityValue} onChange={e => setNewLiabilityValue(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-xs text-slate-900 dark:text-gray-200" />
+              <Input type="number" placeholder={language === 'fr' ? 'Taux %' : 'Rate %'} value={newLiabilityRate} onChange={e => setNewLiabilityRate(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-gray-800 px-4 font-bold text-xs text-slate-900 dark:text-gray-200" />
            </div>
            <Button onClick={handleAddLiability} className="h-14 bg-rose-600 dark:bg-rose-700/80 hover:bg-rose-700 dark:hover:bg-rose-700 text-white w-full rounded-[1.5rem] font-black shadow-lg shadow-rose-100 dark:shadow-none transition-all">
              <Plus size={18} className="mr-2"/> {language === 'fr' ? 'AJOUTER LE PASSIF' : 'ADD LIABILITY'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
