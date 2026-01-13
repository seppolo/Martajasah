
import React, { useState, useEffect, useRef } from 'react';
import { StockItem, Transaction } from '../types';
import { supabaseService } from '../services/supabaseService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface InventoryProps {
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  highlightId?: string | null;
  currentUsername?: string;
  canManageStock?: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ stock, setStock, transactions, setTransactions, highlightId, currentUsername, canManageStock }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'IN' | 'OUT' | 'OPNAME'>('IN');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'BAHAN' | 'ALAT'>('BAHAN');

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('id-ID', { 
      timeZone: 'Asia/Jakarta',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + " WIB";

    // --- OFFICIAL KOP SURAT ---
    // Logo Placeholder
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

    // Header Text
    doc.setFont('helvetica', 'bold');
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
    
    // Double Line
    doc.setLineWidth(0.8);
    doc.line(14, 46, 196, 46);
    doc.setLineWidth(0.2);
    doc.line(14, 47.5, 196, 47.5);

    // Document Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`LAPORAN STOK OPNAME: ${activeTab === 'BAHAN' ? 'BAHAN BAKU' : 'PERALATAN'}`, 14, 56);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Dicetak pada: ${dateStr}`, 14, 61);

    const tableColumn = [
      "No.", 
      "Nama Barang", 
      "Kategori", 
      "Sistem", 
      "Satuan", 
      "Realtime", 
      "Opname", 
      "Keterangan"
    ];
    
    const tableRows: any[] = [];
    const sortedStock = [...stock]
      .filter(item => item.itemType === activeTab)
      .sort((a, b) => a.name.localeCompare(b.name));

    sortedStock.forEach((item, index) => {
      const rowData = [
        (index + 1).toString(),
        item.name,
        item.category,
        item.quantity.toString(),
        item.unit,
        "", 
        "", 
        ""
      ];
      tableRows.push(rowData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 66,
      theme: 'grid',
      headStyles: { 
        fillColor: [37, 99, 235],
        halign: 'center',
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8, 
        textColor: [40, 40, 40]
      }
    });

    doc.save(`Opname_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const handleDeleteItem = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm(`Hapus "${name}"?`)) {
      setStock(prev => prev.filter(item => item.id !== id));
      if (supabaseService.isConfigured()) {
        supabaseService.deleteRow('stock', id);
      }
    }
  };

  const handleSaveMutation = () => {
    if (!selectedItemId || amount <= 0) return;
    const targetItem = stock.find(s => s.id === selectedItemId);
    if (!targetItem) return;

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: selectedItemId,
      itemName: targetItem.name,
      type: modalType === 'OPNAME' ? (amount >= targetItem.quantity ? 'IN' : 'OUT') : modalType,
      quantity: modalType === 'OPNAME' ? Math.abs(amount - targetItem.quantity) : amount,
      date: new Date().toISOString(),
      notes: notes || (modalType === 'OPNAME' ? 'Stok Opname' : 'Mutasi Manual'),
      performedBy: currentUsername
    };

    setStock(prev => prev.map(item => {
      if (item.id === selectedItemId) {
        let newQty = item.quantity;
        if (modalType === 'IN') newQty += amount;
        else if (modalType === 'OUT') newQty -= amount;
        else if (modalType === 'OPNAME') newQty = amount;
        return { ...item, quantity: Math.max(0, newQty), lastUpdated: new Date().toISOString() };
      }
      return item;
    }));

    setTransactions(prev => [newTransaction, ...prev]);
    setIsModalOpen(false);
    setAmount(0);
    setNotes('');
    setSelectedItemId('');
  };

  const getIconForItem = (name: string, type: 'BAHAN' | 'ALAT'): string => {
    const lowerName = name.toLowerCase();
    if (type === 'BAHAN') {
      if (lowerName.includes('beras')) return 'fa-bowl-rice';
      if (lowerName.includes('telur')) return 'fa-egg';
      if (lowerName.includes('ayam') || lowerName.includes('daging')) return 'fa-drumstick-bite';
      if (lowerName.includes('sayur')) return 'fa-leaf';
      if (lowerName.includes('susu')) return 'fa-glass-water';
      return 'fa-box-open';
    } else {
      if (lowerName.includes('wajan')) return 'fa-pan-fry';
      if (lowerName.includes('panci')) return 'fa-soup';
      if (lowerName.includes('ompreng')) return 'fa-box-archive';
      return 'fa-toolbox';
    }
  };

  const filteredStock = stock.filter(item => item.itemType === activeTab);

  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-5 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-between shrink-0 px-1 gap-4">
        <div className="flex bg-blue-900/20 p-1 rounded-lg w-fit border border-blue-500/10">
           <button onClick={() => setActiveTab('BAHAN')} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'BAHAN' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Bahan</button>
           <button onClick={() => setActiveTab('ALAT')} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALAT' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Alat</button>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={exportToPDF} className="bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg hover:bg-emerald-600/20 transition-all">
             <i className="fas fa-file-pdf mr-1.5 text-xs"></i> Export PDF
           </button>
           {canManageStock && (
              <button onClick={() => { setModalType('IN'); setIsModalOpen(true); }} className="glossy-button text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all">
                <i className="fas fa-plus mr-1.5"></i> Mutasi
              </button>
           )}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStock.map((item) => (
            <div key={item.id} className={`glass-panel rounded-[1.25rem] p-4 flex items-center justify-between group hover:border-blue-500/40 transition-all duration-300 relative ${highlightId === item.id ? 'border-blue-400' : ''}`}>
               <div className="flex items-center space-x-3.5">
                  <div className={`inventory-icon-box w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${item.quantity <= item.minThreshold ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                     <i className={`fas ${getIconForItem(item.name, item.itemType)}`}></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-[11px] text-slate-100 leading-tight">{item.name}</h4>
                    <p className={`text-[9px] font-black uppercase mt-0.5 tracking-wider ${item.quantity <= item.minThreshold ? 'text-orange-400' : 'text-blue-400'}`}>
                      {item.quantity} {item.unit}
                      {item.quantity <= item.minThreshold && <span className="ml-1.5 text-[7px] text-orange-500/60">(KRITIS)</span>}
                    </p>
                  </div>
               </div>
               <button onClick={(e) => handleDeleteItem(e, item.id, item.name)} className="text-slate-500/30 hover:text-red-500 p-1.5 transition-colors"><i className="fas fa-times text-[10px]"></i></button>
            </div>
          ))}
          {filteredStock.length === 0 && (
             <div className="col-span-full py-20 text-center opacity-30">
               <i className="fas fa-boxes-stacked text-4xl mb-3"></i>
               <p className="text-[10px] font-black uppercase tracking-widest">Belum ada barang di kategori ini</p>
             </div>
          )}
        </div>
      </section>

      {/* Mutation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-3 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] w-full max-sm rounded-[2rem] border border-blue-500/20 shadow-2xl p-7 animate-modal-enter">
            <h3 className="font-black text-base text-white uppercase tracking-widest mb-6">Mutasi Barang</h3>
            <div className="flex gap-2 mb-6">
              <button onClick={() => setModalType('IN')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${modalType === 'IN' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Masuk</button>
              <button onClick={() => setModalType('OUT')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${modalType === 'OUT' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Keluar</button>
              <button onClick={() => setModalType('OPNAME')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${modalType === 'OPNAME' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Opname</button>
            </div>
            <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-blue-400 uppercase px-1">Barang</label>
                 <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold appearance-none">
                   <option value="">Pilih Barang...</option>
                   {stock.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({s.quantity} {s.unit})</option>)}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-blue-400 uppercase px-1">Jumlah</label>
                 <input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold" />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-blue-400 uppercase px-1">Keterangan</label>
                 <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alasan mutasi..." className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold" />
               </div>
               <div className="flex gap-3 pt-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 text-slate-400 py-3.5 rounded-xl font-black text-[9px] uppercase active:scale-95">Batal</button>
                 <button onClick={handleSaveMutation} disabled={!selectedItemId || amount <= 0} className="flex-1 glossy-button text-white py-3.5 rounded-xl font-black text-[9px] uppercase active:scale-95 disabled:opacity-30">Simpan</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
