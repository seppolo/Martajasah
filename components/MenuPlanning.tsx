
import React, { useState } from 'react';
import { StockItem, MenuPlan, Procurement } from '../types';
import { supabaseService } from '../services/supabaseService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface MenuPlanningProps {
  stock: StockItem[];
  menuPlans: MenuPlan[];
  setMenuPlans: React.Dispatch<React.SetStateAction<MenuPlan[]>>;
  procurements: Procurement[];
  onProcurementRequest: (menu: MenuPlan) => void;
  highlightId?: string | null;
  currentUsername?: string;
  canCreateMenu?: boolean;
  canOrder?: boolean;
}

const MenuPlanning: React.FC<MenuPlanningProps> = ({ stock, menuPlans, setMenuPlans, procurements, onProcurementRequest, currentUsername, canCreateMenu, canOrder }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMenu, setNewMenu] = useState({ name: '', portions: 0 });
  const [selectedIngredients, setSelectedIngredients] = useState<{ itemId: string; name: string; quantity: number; unit: string }[]>([]);

  const addIngredientLine = () => {
    setSelectedIngredients([...selectedIngredients, { itemId: '', name: '', quantity: 0, unit: '' }]);
  };

  const updateIngredient = (index: number, itemId: string) => {
    const item = stock.find(s => s.id === itemId);
    if (!item) return;
    const newIngs = [...selectedIngredients];
    newIngs[index] = { itemId, name: item.name, quantity: newIngs[index].quantity, unit: item.unit };
    setSelectedIngredients(newIngs);
  };

  const updateIngQty = (index: number, qty: number) => {
    const newIngs = [...selectedIngredients];
    newIngs[index].quantity = qty;
    setSelectedIngredients(newIngs);
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenu.name || selectedIngredients.length === 0) return;

    const plan: MenuPlan = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      name: newMenu.name,
      portions: newMenu.portions,
      ingredients: selectedIngredients.map(ing => ({ name: ing.name, quantity: ing.quantity, unit: ing.unit })),
      createdAt: new Date().toISOString(),
      performedBy: currentUsername
    };

    setMenuPlans(prev => [plan, ...prev]);
    setIsModalOpen(false);
    setNewMenu({ name: '', portions: 0 });
    setSelectedIngredients([]);
  };

  const exportMenuToPDF = (plan: MenuPlan) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('RENCANA MENU MBG', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Menu: ${plan.name}`, 20, 30);
    doc.text(`Porsi: ${plan.portions}`, 20, 35);

    const tableColumn = ["Bahan", "Jumlah", "Satuan"];
    const tableRows = plan.ingredients.map(ing => [ing.name, ing.quantity.toString(), ing.unit]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save(`Menu_${plan.name}.pdf`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-4">
      <header className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Daftar Rencana Menu</h2>
        {canCreateMenu && (
          <button onClick={() => setIsModalOpen(true)} className="glossy-button text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all">
            <i className="fas fa-plus mr-1.5"></i> Buat Menu
          </button>
        )}
      </header>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menuPlans.length > 0 ? menuPlans.map((plan) => (
            <div key={plan.id} className="glass-panel rounded-[1.75rem] p-5 flex flex-col group hover:border-indigo-500/40 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                 <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-white uppercase truncate">{plan.name}</h3>
                    <p className="text-[10px] text-indigo-400 font-bold mt-1">{plan.portions} Porsi</p>
                 </div>
                 <div className="flex space-x-2 shrink-0">
                    <button onClick={() => exportMenuToPDF(plan)} className="text-emerald-500 bg-emerald-500/10 w-9 h-9 rounded-xl flex items-center justify-center border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                      <i className="fas fa-file-pdf"></i>
                    </button>
                    {canOrder && (
                      <button onClick={() => onProcurementRequest(plan)} className="text-blue-500 bg-blue-500/10 w-9 h-9 rounded-xl flex items-center justify-center border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                        <i className="fas fa-shopping-cart"></i>
                      </button>
                    )}
                 </div>
              </div>
              <div className="space-y-1 mt-auto">
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Bahan Baku Utama:</p>
                <div className="flex flex-wrap gap-1">
                   {plan.ingredients.slice(0, 4).map((ing, i) => (
                     <span key={i} className="text-[8px] bg-white/5 px-2 py-0.5 rounded-md text-slate-400">{ing.name}</span>
                   ))}
                   {plan.ingredients.length > 4 && <span className="text-[8px] text-slate-500">+{plan.ingredients.length - 4} lainnya</span>}
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center opacity-30">
              <i className="fas fa-utensils text-4xl mb-4"></i>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Belum Ada Rencana Menu</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1000] flex items-center justify-center p-3 animate-in fade-in duration-300">
          <form onSubmit={handleSaveMenu} className="bg-[#0f172a] w-full max-w-2xl rounded-[2.5rem] border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden animate-modal-enter max-h-[90vh]">
            <div className="p-6 border-b border-blue-500/10 flex justify-between items-center shrink-0">
               <h3 className="font-black text-sm text-white uppercase tracking-widest">Susun Menu Baru</h3>
               <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-1">Nama Menu</label>
                    <input required type="text" value={newMenu.name} onChange={(e) => setNewMenu({...newMenu, name: e.target.value})} placeholder="Misal: Nasi Ayam Geprek" className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-5 py-4 text-xs text-white outline-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-1">Jumlah Porsi</label>
                    <input required type="number" value={newMenu.portions || ''} onChange={(e) => setNewMenu({...newMenu, portions: Number(e.target.value)})} placeholder="0" className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-5 py-4 text-xs text-white outline-none font-bold" />
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Daftar Bahan Baku</label>
                    <button type="button" onClick={addIngredientLine} className="text-[9px] font-black text-indigo-400 uppercase hover:text-indigo-300 transition-colors flex items-center">
                       <i className="fas fa-plus-circle mr-1.5"></i> Tambah Bahan
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    {selectedIngredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-300">
                         <select required value={ing.itemId} onChange={(e) => updateIngredient(idx, e.target.value)} className="flex-1 glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-[10px] text-white outline-none font-bold">
                           <option value="">Pilih Bahan...</option>
                           {stock.filter(s => s.itemType === 'BAHAN').map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
                         </select>
                         <div className="w-24 relative">
                            <input required type="number" step="any" value={ing.quantity || ''} onChange={(e) => updateIngQty(idx, Number(e.target.value))} placeholder="Qty" className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-3 py-3 text-[10px] text-white outline-none font-bold pr-7" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-500 uppercase">{ing.unit}</span>
                         </div>
                         <button type="button" onClick={() => removeIngredient(idx)} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 hover:bg-red-500/20 transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                      </div>
                    ))}
                    {selectedIngredients.length === 0 && (
                      <div className="text-center py-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Belum ada bahan ditambahkan</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
            
            <div className="p-6 border-t border-blue-500/10 bg-[#0f172a]/95 shrink-0">
               <button type="submit" className="w-full glossy-button text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">Simpan Rencana Menu</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MenuPlanning;
