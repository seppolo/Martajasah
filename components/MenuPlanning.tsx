import React, { useState } from 'react';
import { StockItem, MenuPlan, Procurement } from '../types';
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

const MenuPlanning: React.FC<MenuPlanningProps> = ({ 
  stock, 
  menuPlans, 
  setMenuPlans, 
  procurements, 
  onProcurementRequest, 
  currentUsername, 
  canCreateMenu, 
  canOrder 
}) => {
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
    if (!newMenu.name || selectedIngredients.length === 0) {
      alert("Mohon isi nama menu dan minimal satu bahan baku.");
      return;
    }

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
    doc.text(`Target Porsi: ${plan.portions}`, 20, 35);

    const tableColumn = ["Nama Bahan", "Kebutuhan", "Satuan"];
    const tableRows = plan.ingredients.map(ing => [ing.name, ing.quantity.toString(), ing.unit]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], halign: 'center' }
    });

    doc.save(`Menu_${plan.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-4">
      <header className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Perencanaan Menu</h2>
        {canCreateMenu && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="glossy-button text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"
          >
            <i className="fas fa-plus mr-2 text-xs"></i> Buat Menu Baru
          </button>
        )}
      </header>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {menuPlans.length > 0 ? menuPlans.map((plan) => (
            <div key={plan.id} className="glass-panel rounded-[2rem] p-6 flex flex-col group hover:border-indigo-500/40 transition-all duration-500 relative overflow-hidden">
              <div className="flex justify-between items-start mb-5 relative z-10">
                 <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-white uppercase truncate tracking-tight">{plan.name}</h3>
                    <div className="flex items-center mt-1.5 space-x-2">
                       <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-black border border-indigo-500/20">{plan.portions} PORSI</span>
                    </div>
                 </div>
                 <div className="flex space-x-2 shrink-0">
                    <button onClick={() => exportMenuToPDF(plan)} className="text-emerald-500 bg-emerald-500/10 w-10 h-10 rounded-xl flex items-center justify-center border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-md">
                      <i className="fas fa-file-pdf"></i>
                    </button>
                    {canOrder && (
                      <button onClick={() => onProcurementRequest(plan)} className="text-blue-500 bg-blue-500/10 w-10 h-10 rounded-xl flex items-center justify-center border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-md">
                        <i className="fas fa-shopping-cart"></i>
                      </button>
                    )}
                 </div>
              </div>

              <div className="space-y-2 mt-auto relative z-10">
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Bahan Baku:</p>
                <div className="flex flex-wrap gap-1.5">
                   {plan.ingredients.map((ing, i) => (
                     <span key={i} className="text-[8px] bg-white/5 px-2.5 py-1 rounded-lg text-slate-300 border border-white/5 font-bold">
                       {ing.name} <span className="text-indigo-400 ml-1">{ing.quantity}{ing.unit}</span>
                     </span>
                   ))}
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity">
                 <i className="fas fa-utensils text-8xl"></i>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-24 text-center opacity-20 border-2 border-dashed border-blue-500/10 rounded-[3rem]">
              <i className="fas fa-calendar-plus text-5xl mb-5"></i>
              <p className="text-[11px] font-black uppercase tracking-[0.4em]">Belum Ada Menu Terjadwal</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[2000] flex items-center justify-center p-3 animate-in fade-in duration-500">
          <form onSubmit={handleSaveMenu} className="bg-[#0f172a] w-full max-w-2xl rounded-[2.5rem] border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden animate-modal-enter max-h-[92vh]">
            <div className="p-7 border-b border-blue-500/10 bg-blue-500/5 flex justify-between items-center shrink-0">
               <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 rounded-2xl glossy-button flex items-center justify-center text-white shadow-lg"><i className="fas fa-clipboard-list text-sm"></i></div>
                 <div>
                    <h3 className="font-black text-sm text-white uppercase tracking-widest">Susun Menu Baru</h3>
                    <p className="text-[7px] text-blue-400 font-black uppercase tracking-[0.3em] mt-1">Sistem Perencanaan MBG</p>
                 </div>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="p-7 overflow-y-auto custom-scrollbar flex-1 space-y-7">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] px-1">Nama Masakan / Menu</label>
                    <input required type="text" value={newMenu.name} onChange={(e) => setNewMenu({...newMenu, name: e.target.value})} placeholder="Contoh: Nasi Ayam Serundeng" className="w-full glass-panel border-0 bg-slate-900/60 rounded-xl px-5 py-4 text-xs text-white outline-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] px-1">Jumlah Porsi</label>
                    <input required type="number" value={newMenu.portions || ''} onChange={(e) => setNewMenu({...newMenu, portions: Number(e.target.value)})} placeholder="0" className="w-full glass-panel border-0 bg-slate-900/60 rounded-xl px-5 py-4 text-xs text-white outline-none font-bold" />
                  </div>
               </div>

               <div className="space-y-5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-black text-white uppercase tracking-[0.2em] flex items-center"><i className="fas fa-layer-group mr-2 text-indigo-400"></i> Daftar Bahan Baku</label>
                    <button type="button" onClick={addIngredientLine} className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 uppercase hover:bg-indigo-500 hover:text-white transition-all">
                       <i className="fas fa-plus mr-1.5"></i> Tambah
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedIngredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-left-4 duration-300">
                         <div className="flex-1 relative">
                           <select required value={ing.itemId} onChange={(e) => updateIngredient(idx, e.target.value)} className="w-full glass-panel border-0 bg-slate-900/60 rounded-xl px-4 py-3.5 text-[10px] text-white outline-none font-bold appearance-none cursor-pointer">
                             <option value="">Pilih Bahan Baku...</option>
                             {stock.filter(s => s.itemType === 'BAHAN').sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                               <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({s.unit})</option>
                             ))}
                           </select>
                         </div>
                         <div className="w-28 relative">
                            <input required type="number" step="any" value={ing.quantity || ''} onChange={(e) => updateIngQty(idx, Number(e.target.value))} placeholder="Qty" className="w-full glass-panel border-0 bg-slate-900/60 rounded-xl px-4 py-3.5 text-[10px] text-white outline-none font-bold" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black text-indigo-500 uppercase">{ing.unit || '-'}</span>
                         </div>
                         <button type="button" onClick={() => removeIngredient(idx)} className="w-11 h-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-[10px]"></i></button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
            
            <div className="p-7 border-t border-blue-500/10 bg-[#0f172a]/98 shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
               <button type="submit" className="w-full glossy-button text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">SIMPAN RENCANA MENU</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MenuPlanning;