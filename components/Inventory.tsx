
import React, { useState } from 'react';
import { StockItem, Transaction } from '../types';
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BADAN GIZI NASIONAL', 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text('SPPG MARTAJASAH - PROGRAM MBG', 105, 25, { align: 'center' });
    
    doc.setLineWidth(0.8);
    doc.line(14, 30, 196, 30);

    doc.setFontSize(11);
    doc.text(`LAPORAN STOK: ${activeTab === 'BAHAN' ? 'BAHAN BAKU' : 'PERALATAN'}`, 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Dicetak pada: ${dateStr}`, 14, 45);

    const tableColumn = ["No.", "Nama Barang", "Kategori", "Stok Sistem", "Satuan", "Kondisi"];
    const tableRows = stock
      .filter(item => item.itemType === activeTab)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item, index) => [
        (index + 1).toString(),
        item.name,
        item.category,
        item.quantity.toString(),
        item.unit,
        item.quantity <= item.minThreshold ? "KRITIS" : "AMAN"
      ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 8 }
    });

    doc.save(`Stok_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
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
      notes: notes || (modalType === 'OPNAME' ? 'Update Stok Opname' : 'Mutasi Manual'),
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

  const filteredStock = stock.filter(item => item.itemType === activeTab);

  return (
    <div className="h-full flex flex-col space-y-5 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-between shrink-0 px-1 gap-4">
        <div className="flex bg-blue-900/30 p-1.5 rounded-2xl w-fit border border-blue-500/10">
           <button onClick={() => setActiveTab('BAHAN')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BAHAN' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Bahan Baku</button>
           <button onClick={() => setActiveTab('ALAT')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Peralatan</button>
        </div>
        <div className="flex flex-wrap gap-2.5">
           <button onClick={exportToPDF} className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center shadow-md hover:bg-emerald-600/20 transition-all">
             <i className="fas fa-file-pdf mr-2 text-xs"></i> Export PDF
           </button>
           {canManageStock && (
              <button onClick={() => { setModalType('IN'); setIsModalOpen(true); }} className="glossy-button text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center shadow-lg active:scale-95 transition-all">
                <i className="fas fa-arrows-rotate mr-2 text-xs"></i> Mutasi Stok
              </button>
           )}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStock.map((item) => (
            <div key={item.id} className={`glass-panel rounded-[1.75rem] p-5 flex items-center justify-between group hover:border-blue-500/50 transition-all duration-500 relative ${highlightId === item.id ? 'border-blue-400 ring-2 ring-blue-400/20' : ''}`}>
               <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110 duration-500 ${item.quantity <= item.minThreshold ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                     <i className={`fas ${item.itemType === 'BAHAN' ? 'fa-box-open' : 'fa-toolbox'}`}></i>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-[11px] text-slate-100 leading-tight uppercase truncate tracking-tight">{item.name}</h4>
                    <div className="flex items-baseline mt-1 space-x-1.5">
                      <p className={`text-sm font-black ${item.quantity <= item.minThreshold ? 'text-red-400' : 'text-blue-400'}`}>{item.quantity}</p>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.unit}</p>
                    </div>
                  </div>
               </div>
               {item.quantity <= item.minThreshold && (
                 <div className="bg-red-500/20 w-2 h-2 rounded-full animate-pulse border border-red-500/40"></div>
               )}
            </div>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[2000] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] border border-blue-500/20 shadow-2xl p-8 space-y-6 animate-modal-enter">
            <h3 className="font-black text-sm text-white uppercase tracking-widest text-center">Mutasi Stok Gudang</h3>
            
            <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-white/5">
              {(['IN', 'OUT', 'OPNAME'] as const).map(type => (
                <button key={type} onClick={() => setModalType(type)} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${modalType === type ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                  {type === 'IN' ? 'Masuk' : type === 'OUT' ? 'Keluar' : 'Opname'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
               <div className="space-y-1.5">
                 <label className="text-[7px] font-black text-blue-400 uppercase tracking-widest px-1">Pilih Barang</label>
                 <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="w-full glass-panel border-0 bg-slate-900/80 rounded-xl px-5 py-4 text-xs text-white outline-none font-bold appearance-none cursor-pointer">
                   <option value="">-- Cari Nama Barang --</option>
                   {stock.sort((a,b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
                 </select>
               </div>
               
               <div className="space-y-1.5">
                 <label className="text-[7px] font-black text-blue-400 uppercase tracking-widest px-1">Jumlah</label>
                 <input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Masukkan angka..." className="w-full glass-panel border-0 bg-slate-900/80 rounded-xl px-5 py-4 text-xs text-white outline-none font-bold placeholder:opacity-20" />
               </div>

               <div className="space-y-1.5">
                 <label className="text-[7px] font-black text-blue-400 uppercase tracking-widest px-1">Catatan (Opsional)</label>
                 <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Belanja Pasar" className="w-full glass-panel border-0 bg-slate-900/80 rounded-xl px-5 py-4 text-xs text-white outline-none font-bold" />
               </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 text-slate-500 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:text-white transition-all">Batal</button>
              <button onClick={handleSaveMutation} className="flex-1 glossy-button text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] shadow-xl">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
