
import React, { useState, useEffect, useRef } from 'react';
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

const CATEGORIES = [
  'Karbohidrat',
  'Protein Hewani',
  'Protein Nabati',
  'Sayuran',
  'Buah Atau Susu'
];

const MenuPlanning: React.FC<MenuPlanningProps> = ({ stock, menuPlans, setMenuPlans, procurements, onProcurementRequest, highlightId, currentUsername, canCreateMenu, canOrder }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<MenuPlan, 'id' | 'createdAt'>>({
    date: new Date().toISOString().split('T')[0],
    name: '',
    portions: 100,
    ingredients: []
  });

  const [selections, setSelections] = useState<Record<string, { name: string, quantity: number, unit: string }>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: { name: '', quantity: 0, unit: 'kg' } }), {})
  );

  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isModalOpen]);

  const handleSelectionChange = (category: string, field: string, value: any) => {
    setSelections(prev => {
      const updated = { ...prev[category], [field]: value };
      if (field === 'name') {
        const item = stock.find(s => s.name.toLowerCase() === value.toLowerCase());
        updated.unit = item?.unit || 'kg';
      }
      return { ...prev, [category]: updated };
    });
  };

  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedIngredients = (Object.values(selections) as Array<{ name: string; quantity: number; unit: string }>)
      .filter(s => s.name.trim() !== '' && s.quantity > 0);
    
    if (!formData.name || selectedIngredients.length === 0) {
      alert("Mohon isi nama menu dan lengkapi setidaknya satu kategori bahan.");
      return;
    }

    const newPlan: MenuPlan = {
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      ingredients: selectedIngredients,
      performedBy: currentUsername
    };
    
    setMenuPlans(prev => [newPlan, ...prev]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ date: new Date().toISOString().split('T')[0], name: '', portions: 100, ingredients: [] });
    setSelections(CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: { name: '', quantity: 0, unit: 'kg' } }), {}));
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (e) { return dateStr; }
  };

  const exportMenuToPDF = (plan: MenuPlan) => {
    const doc = new jsPDF();
    const dateFormatted = formatDate(plan.date);

    // --- OFFICIAL KOP SURAT ---
    doc.setDrawColor(0, 48, 87);
    doc.setLineWidth(0.5);
    doc.circle(30, 25, 14, 'S');
    doc.setFillColor(255, 204, 0);
    doc.circle(30, 25, 11, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('BADAN GIZI', 30, 24, { align: 'center' });
    doc.text('NASIONAL', 30, 27, { align: 'center' });

    doc.setFontSize(14);
    doc.text('BADAN GIZI NASIONAL', 120, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text('YAYASAN SEHAT LUHUR MANDIRI', 120, 24, { align: 'center' });
    doc.setFontSize(14);
    doc.text('SPPG MARTAJASAH', 120, 31, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Alamat : Martajasah, Kec. Bangkalan, Kab. Bangkalan-Madura. Jawa Timur, 69115.', 120, 37, { align: 'center' });
    doc.text('Telepon : 089612827022.', 120, 42, { align: 'center' });
    
    doc.setLineWidth(0.8);
    doc.line(14, 46, 196, 46);
    doc.setLineWidth(0.2);
    doc.line(14, 47.5, 196, 47.5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RENCANA MENU MAKAN BERGIZI GRATIS (MBG)', 14, 56);

    doc.setDrawColor(200);
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(`TANGGAL: ${dateFormatted.toUpperCase()}`, 14, 65);
    doc.text(`NAMA MENU: ${plan.name.toUpperCase()}`, 14, 71);
    doc.text(`TOTAL PORSI: ${plan.portions} PORSI`, 14, 77);

    const tableColumn = ["No.", "Bahan Baku", "Kebutuhan", "Satuan"];
    const tableRows = plan.ingredients.map((ing, index) => [
      (index + 1).toString(),
      ing.name,
      ing.quantity.toString(),
      ing.unit
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'grid',
      headStyles: { 
        fillColor: [37, 99, 235],
        halign: 'center',
        fontSize: 9
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        valign: 'middle'
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setFontSize(10);
    doc.text('Bangkalan, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 140, finalY);
    doc.text('Disusun Oleh,', 140, finalY + 6);
    doc.text('Petugas Dapur SPPG', 140, finalY + 26);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${plan.performedBy || 'Petugas'})`, 140, finalY + 32);

    doc.save(`Menu_${plan.name.replace(/\s+/g, '_')}_${plan.date}.pdf`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-end px-1 shrink-0">
        {canCreateMenu && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="glossy-button text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"
          >
            <i className="fas fa-plus mr-1.5 text-xs"></i> Buat Menu
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...menuPlans].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((plan) => {
            const isExpanded = expandedMenuId === plan.id;
            const alreadyOrdered = procurements.some(p => p.sourceMenuId === plan.id);
            return (
              <div 
                key={plan.id} 
                className={`glass-panel rounded-[1.75rem] overflow-hidden flex flex-col transition-all duration-300 bg-[#0f172a]/80 border-blue-500/10 hover:border-blue-500/40 cursor-pointer`}
                onClick={() => setExpandedMenuId(isExpanded ? null : plan.id)}
              >
                <div className="px-5 py-3.5 flex justify-between items-center border-b border-blue-500/5">
                  <h4 className="font-black text-slate-400 uppercase tracking-widest text-[8px]">{formatDate(plan.date)}</h4>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); exportMenuToPDF(plan); }}
                      className="text-emerald-500/60 hover:text-emerald-400 p-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10 transition-all"
                      title="Export PDF"
                    >
                      <i className="fas fa-file-pdf text-[10px]"></i>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm('Hapus menu?')){setMenuPlans(prev => prev.filter(p => p.id !== plan.id)); if(supabaseService.isConfigured()) supabaseService.deleteRow('menu_plans', plan.id);}}} className="text-slate-500/30 hover:text-red-500 p-1"><i className="fas fa-times text-[10px]"></i></button>
                  </div>
                </div>
                <div className="p-5 flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><i className="fas fa-utensils"></i></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white uppercase truncate">{plan.name}</h3>
                      <p className="text-[8px] text-blue-400 font-black uppercase mt-1">{plan.portions} PORSI</p>
                    </div>
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-96 opacity-100 mt-4 pt-4 border-t border-blue-500/10' : 'max-h-0 opacity-0'}`}>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.ingredients.map((ing, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-900/20 text-blue-100 text-[8px] font-bold rounded border border-blue-500/10">
                          {ing.name} <span className="text-blue-400 ml-1">{ing.quantity}{ing.unit}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-5">
                   {alreadyOrdered ? (
                     <div className="w-full bg-emerald-500/10 text-emerald-400 py-2.5 rounded-xl text-[8px] font-black uppercase text-center border border-emerald-500/20"><i className="fas fa-check-circle mr-1.5"></i> PESANAN DIPROSES</div>
                   ) : (
                     <button onClick={(e) => { e.stopPropagation(); onProcurementRequest(plan); }} className="w-full glossy-button text-white py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg">PROSES PENGADAAN</button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1000] flex items-end md:items-center justify-center px-0 md:px-3">
          <form dangerouslySetInnerHTML={{ __html: '' }} onSubmit={handleSaveMenu} className="bg-[#0f172a] w-full max-w-3xl rounded-t-[1.75rem] md:rounded-[2.25rem] border-t md:border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden animate-modal-enter max-h-[92vh]">
            <div className="p-5 border-b border-blue-500/10 bg-blue-500/5 flex justify-between items-center">
              <h3 className="font-black text-xs text-white uppercase tracking-widest">Susun Menu Baru</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><i className="fas fa-times text-lg"></i></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-blue-400 uppercase px-1">Tanggal</label>
                  <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full glass-panel rounded-xl px-4 py-3 text-xs text-white outline-none font-bold bg-slate-900 border-0" />
                </div>
                <div className="md:col-span-1 space-y-1">
                  <label className="text-[8px] font-black text-blue-400 uppercase px-1">Menu Utama</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nama Masakan" className="w-full glass-panel rounded-xl px-4 py-3 text-xs text-white outline-none font-bold bg-slate-900 border-0" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-blue-400 uppercase px-1">Target Porsi</label>
                  <input required type="number" value={formData.portions} onChange={(e) => setFormData({...formData, portions: Number(e.target.value)})} className="w-full glass-panel rounded-xl px-4 py-3 text-xs text-white outline-none font-bold bg-slate-900 border-0" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => (
                  <div key={cat} className="glass-panel p-4 rounded-2xl border-blue-500/10 bg-blue-500/5 space-y-3">
                    <label className="text-[8px] font-black text-blue-300 uppercase tracking-widest">{cat}</label>
                    <input list={`dl-${cat}`} type="text" placeholder={`Pilih ${cat}...`} value={selections[cat].name} onChange={(e) => handleSelectionChange(cat, 'name', e.target.value)} className="w-full glass-panel border-0 bg-slate-900/80 rounded-lg px-3 py-2 text-[10px] text-white outline-none font-bold" />
                    <datalist id={`dl-${cat}`}>{stock.filter(s => s.category === cat).map(s => <option key={s.id} value={s.name} />)}</datalist>
                    <div className="flex items-center space-x-2">
                       <input type="number" placeholder="Qty" value={selections[cat].quantity || ''} onChange={(e) => handleSelectionChange(cat, 'quantity', Number(e.target.value))} className="w-full glass-panel border-0 bg-slate-900/80 rounded-lg px-3 py-2 text-[10px] text-white outline-none font-bold" />
                       <span className="text-[8px] font-black text-blue-400/40 uppercase">{selections[cat].unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-blue-500/10 bg-[#0f172a]">
              <button type="submit" className="w-full glossy-button text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98]">Simpan Perencanaan Menu</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MenuPlanning;
