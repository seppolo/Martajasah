
import React, { useState, useEffect, useRef } from 'react';
import { Procurement, StockItem } from '../types';
import { supabaseService } from '../services/supabaseService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ProcurementProps {
  stock: StockItem[];
  procurements: Procurement[];
  setProcurements: React.Dispatch<React.SetStateAction<Procurement[]>>;
  highlightId?: string | null;
  currentUsername?: string;
  canOrder?: boolean;
  canReceive?: boolean;
}

const ProcurementList: React.FC<ProcurementProps> = ({ stock, procurements, setProcurements, highlightId, currentUsername, canOrder, canReceive }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ supplier: '', item: '', qty: 0, price: 0, isOperational: false });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<{ id: string, field: 'supplier' | 'price' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCapturing, setIsCapturing] = useState<{ id: string; type: 'INVOICE' | 'DELIVERY' } | null>(null);

  useEffect(() => {
    if (highlightId && cardRefs.current[highlightId]) {
      cardRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

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
    doc.text(`LAPORAN PENGADAAN BARANG - PROGRAM MBG`, 14, 56);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Dicetak pada: ${dateStr}`, 14, 61);

    const tableColumn = ["ID Pesanan", "Sumber", "Supplier", "Barang", "Qty", "Harga (IDR)", "Status", "Total"];
    const tableRows: any[] = [];

    procurements.forEach(p => {
      const item = p.items[0];
      const rowData = [
        p.id.slice(0, 8),
        p.fundingSource || 'YAYASAN',
        p.supplier,
        item?.name || '-',
        `${item?.quantity} ${item?.unit || ''}`,
        (item?.price || 0).toLocaleString('id-ID'),
        p.status,
        p.totalPrice.toLocaleString('id-ID')
      ];
      tableRows.push(rowData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 66,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 }
    });

    doc.save(`Pengadaan_MARTAJASAH_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDeleteProcurement = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm("Batalkan pesanan pembelian ini?")) {
      setProcurements(prev => prev.filter(p => p.id !== id));
      if (supabaseService.isConfigured()) supabaseService.deleteRow('procurements', id);
    }
  };

  const startCapture = (id: string, type: 'INVOICE' | 'DELIVERY') => {
    setIsCapturing({ id, type });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(err => alert("Gagal kamera: " + err));
  };

  const stopCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(null);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCapturing) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    ctx.fillStyle = "white";
    ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`TIMESTAMP (WIB): ${timeStr}`, 20, canvas.height - 25);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setProcurements(prev => prev.map(p => {
      if (p.id === isCapturing.id) {
        if (isCapturing.type === 'INVOICE') return { ...p, status: 'ORDERED', invoicePhotoUrl: dataUrl };
        return { ...p, status: 'RECEIVED', photoUrl: dataUrl, date: now.toISOString() };
      }
      return p;
    }));
    stopCapture();
  };

  const handleAddProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    const itemInStock = stock.find(s => s.name.toLowerCase() === newOrder.item.toLowerCase());
    const unit = itemInStock?.unit || 'Unit';
    const order: Procurement = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      supplier: newOrder.supplier,
      items: [{ name: newOrder.item, quantity: newOrder.qty, price: newOrder.price, unit }],
      status: 'PENDING',
      fundingSource: newOrder.isOperational ? 'OPERASIONAL' : 'YAYASAN',
      totalPrice: newOrder.qty * newOrder.price,
      performedBy: currentUsername
    };
    setProcurements(prev => [order, ...prev]);
    setIsModalOpen(false);
    setNewOrder({ supplier: '', item: '', qty: 0, price: 0, isOperational: false });
  };

  const commitEdit = () => {
    if (!editingId) return;
    const { id, field } = editingId;
    setProcurements(prev => prev.map(p => {
      if (p.id === id) {
        if (field === 'supplier') return { ...p, supplier: editValue };
        if (field === 'price') {
            const items = [...p.items];
            const newPrice = Number(editValue) || 0;
            items[0].price = newPrice;
            return { ...p, items, totalPrice: items[0].quantity * newPrice };
        }
      }
      return p;
    }));
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-end px-1 shrink-0 gap-2">
        <button onClick={exportToPDF} className="bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg hover:bg-emerald-600/20 transition-all">
          <i className="fas fa-file-pdf mr-1.5 text-xs"></i> Export PDF
        </button>
        {canOrder && (
          <button onClick={() => setIsModalOpen(true)} className="glossy-button text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all">
            <i className="fas fa-plus mr-2 text-xs"></i> Baru
          </button>
        )}
      </header>
      <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...procurements].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((order) => {
            const isFromMenu = !!order.sourceMenuId;
            const orderItem = order.items[0];
            const unitToDisplay = orderItem?.unit || stock.find(s => s.name.toLowerCase() === orderItem?.name.toLowerCase())?.unit || 'Unit';
            const fundingType = order.fundingSource || 'YAYASAN';
            
            return (
              <div key={order.id} ref={el => { if (el) cardRefs.current[order.id] = el; }} className={`glass-panel rounded-[1.5rem] overflow-hidden flex flex-col relative transition-all duration-500 group border-blue-500/10 ${highlightId === order.id ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : ''}`}>
                <button onClick={(e) => handleDeleteProcurement(e, order.id)} className="absolute top-4 right-5 text-slate-500/30 hover:text-red-500 p-2 z-40 transition-colors cursor-pointer">
                  <i className="fas fa-times text-xs"></i>
                </button>
                <div className="p-5 md:p-6 flex-1">
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border inline-block ${order.status === 'PENDING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : order.status === 'ORDERED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {order.status === 'PENDING' ? 'Draf' : order.status === 'ORDERED' ? 'Proses' : 'Selesai'}
                          </span>
                          <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border inline-block ${fundingType === 'OPERASIONAL' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                            {fundingType}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-white uppercase truncate max-w-[200px]">{orderItem?.name}</h4>
                      </div>
                      {(order.photoUrl || order.invoicePhotoUrl) && (
                        <div className="flex gap-2">
                            {order.invoicePhotoUrl && <button onClick={() => setSelectedPhoto(order.invoicePhotoUrl!)} className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/40 text-blue-400 text-[10px]"><i className="fas fa-file-invoice"></i></button>}
                            {order.photoUrl && <button onClick={() => setSelectedPhoto(order.photoUrl!)} className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/40 text-emerald-400 text-[10px]"><i className="fas fa-box"></i></button>}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex flex-col">
                        <p className="text-[7px] font-black text-slate-500 uppercase mb-0.5">Vendor</p>
                        <p className="text-[10px] font-bold text-slate-100 truncate">{order.supplier}</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[7px] font-black text-slate-500 uppercase mb-0.5">Qty</p>
                        <p className="text-[10px] text-slate-100 font-bold truncate">x{orderItem?.quantity} {unitToDisplay}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                       <span className="text-[7px] font-black text-blue-400/40 uppercase mb-0.5">Total Biaya</span>
                       <p className="text-[12px] font-black text-white">IDR {order.totalPrice.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div className="px-5 md:px-6 pb-5 md:pb-6 mt-auto relative z-20">
                  {order.status === 'PENDING' && canOrder && <button onClick={() => setProcurements(prev => prev.map(p => p.id === order.id ? {...p, status: 'ORDERED'} : p))} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all">Proses Pesanan</button>}
                  {order.status === 'ORDERED' && canReceive && (
                    <div className="flex flex-col gap-2">
                       {!order.invoicePhotoUrl ? <button onClick={() => startCapture(order.id, 'INVOICE')} className="w-full glossy-button text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest"><i className="fas fa-camera mr-2"></i> Foto Nota</button> : <button onClick={() => startCapture(order.id, 'DELIVERY')} className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase"><i className="fas fa-box-open mr-2"></i> Terima Barang</button>}
                    </div>
                  )}
                  {order.status === 'RECEIVED' && <div className="w-full py-3.5 rounded-2xl flex items-center justify-center bg-emerald-500/5 border border-emerald-500/10"><span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.4em]"><i className="fas fa-check-double mr-2"></i> SELESAI</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[2000] flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
           <div className="relative max-w-2xl w-full animate-in zoom-in-95 duration-300">
              <img src={selectedPhoto} className="w-full h-auto rounded-[2rem] border border-white/10 shadow-2xl" alt="Preview" />
           </div>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 z-[1000] flex items-center justify-center p-4">
          <form onSubmit={handleAddProcurement} className="bg-[#0f172a] w-full max-w-2xl rounded-[2.5rem] border border-blue-500/20 p-8 space-y-7 shadow-2xl animate-modal-enter">
            <h3 className="font-black text-sm text-white uppercase tracking-widest">Buat Pesanan Baru</h3>
            <div className="space-y-4">
              <input required type="text" value={newOrder.supplier} onChange={(e) => setNewOrder({...newOrder, supplier: e.target.value})} placeholder="Nama Toko / Supplier" className="w-full glass-panel border-0 bg-slate-900/40 rounded-2xl px-6 py-5 text-sm text-white outline-none font-bold" />
              <input required type="text" value={newOrder.item} onChange={(e) => setNewOrder({...newOrder, item: e.target.value})} placeholder="Nama Barang..." className="w-full glass-panel border-0 bg-slate-900/40 rounded-2xl px-6 py-5 text-sm text-white outline-none font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" value={newOrder.qty || ''} onChange={(e) => setNewOrder({...newOrder, qty: Number(e.target.value)})} placeholder="Jumlah" className="w-full glass-panel rounded-2xl px-6 py-5 text-sm text-white outline-none font-bold bg-slate-900/40" />
                <input required type="number" value={newOrder.price || ''} onChange={(e) => setNewOrder({...newOrder, price: Number(e.target.value)})} placeholder="Harga Satuan" className="w-full glass-panel rounded-2xl px-6 py-5 text-sm text-white outline-none font-bold bg-slate-900/40" />
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer group" onClick={() => setNewOrder({...newOrder, isOperational: !newOrder.isOperational})}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${newOrder.isOperational ? 'bg-blue-600 border-blue-400' : 'border-white/20'}`}>
                  {newOrder.isOperational && <i className="fas fa-check text-[10px] text-white"></i>}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${newOrder.isOperational ? 'text-white' : 'text-slate-500'}`}>Biaya Operasional</span>
                  <span className="text-[7px] text-slate-500 uppercase">Tandai jika pesanan menggunakan dana operasional</span>
                </div>
              </div>
            </div>
            
            <button type="submit" className="w-full glossy-button text-white py-6 rounded-2xl font-black text-[13px] uppercase tracking-[0.4em]">Simpan Pesanan</button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-500 font-black text-[10px] uppercase">Batal</button>
          </form>
        </div>
      )}
      {isCapturing && (
        <div className="fixed inset-0 bg-black z-[2000] flex flex-col items-center justify-center">
           <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted></video>
           <canvas ref={canvasRef} className="hidden"></canvas>
           <div className="absolute bottom-10 left-0 right-0 flex justify-around items-center px-10">
              <button onClick={stopCapture} className="w-14 h-14 rounded-full bg-slate-800 text-white"><i className="fas fa-times text-2xl"></i></button>
              <button onClick={takePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-blue-500"></div></button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementList;
