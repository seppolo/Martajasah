
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StockItem, Transaction, Distribution, MenuPlan, Procurement, ViewState } from '../types';
import { supabaseService } from '../services/supabaseService';

interface DashboardProps {
  stock: StockItem[];
  transactions: Transaction[];
  distributions: Distribution[];
  menuPlans: MenuPlan[];
  procurements: Procurement[];
  schoolNames: string[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setMenuPlans: React.Dispatch<React.SetStateAction<MenuPlan[]>>;
  setProcurements: React.Dispatch<React.SetStateAction<Procurement[]>>;
  setDistributions: React.Dispatch<React.SetStateAction<Distribution[]>>;
  setSchoolNames: React.Dispatch<React.SetStateAction<string[]>>;
  onNavigate?: (view: ViewState, id: string) => void;
}

interface ActivityLog {
  id: string;
  sourceId: string;
  type: 'MUTASI' | 'MENU' | 'PEMBELIAN' | 'DISTRIBUSI' | 'PICKUP';
  targetId: string; 
  title: string;
  subtitle: string;
  timestamp: string;
  statusColor: string;
  icon: string;
  value?: string;
  performedBy?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  stock = [], 
  transactions = [], 
  distributions = [], 
  menuPlans = [], 
  procurements = [], 
  schoolNames = [],
  setTransactions,
  setMenuPlans,
  setProcurements,
  setDistributions,
  onNavigate
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPortionBreakdown, setShowPortionBreakdown] = useState(false);
  const [showItemBreakdown, setShowItemBreakdown] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'LOCATIONS'>('ALL');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  
  const galleryRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const galleryItems = useMemo(() => {
    const items: { url: string; label: string; date: string; type: string }[] = [];
    distributions.forEach(d => {
      if (d.photoUrl) items.push({ url: d.photoUrl, label: d.destination, date: d.deliveredAt || d.timestamp, type: 'DISTRIBUSI' });
    });
    procurements.forEach(p => {
      if (p.photoUrl) items.push({ url: p.photoUrl, label: p.items[0]?.name || 'Barang', date: p.date, type: 'TERIMA BARANG' });
      if (p.invoicePhotoUrl) items.push({ url: p.invoicePhotoUrl, label: `Nota ${p.items[0]?.name}`, date: p.date, type: 'INVOICE' });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [distributions, procurements]);

  useEffect(() => {
    if (!isAutoScrolling || galleryItems.length <= 1) return;
    const scrollInterval = setInterval(() => {
      if (galleryRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = galleryRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          galleryRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          galleryRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(scrollInterval);
  }, [isAutoScrolling, galleryItems.length]);

  const dummyTotalPortions = 2678;
  const totalPortionsDelivered = (distributions || [])
    .filter(d => d.status !== 'PREPARING' && d.status !== 'ON_DELIVERY')
    .reduce((sum, d) => sum + (Number(d.portions) || 0), 0);
  
  const totalOmprengPickedUp = (distributions || [])
    .reduce((sum, d) => sum + (Number(d.pickedUpCount) || 0), 0);
  
  const deliveryPercentage = Math.min(Math.round((totalPortionsDelivered / dummyTotalPortions) * 100), 100);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? '--:--' : date.toLocaleTimeString('id-ID', { 
          timeZone: 'Asia/Jakarta',
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
    } catch (e) {
        return '--:--';
    }
  };

  const handleLogClick = (log: ActivityLog) => {
    if (!onNavigate) return;
    let view: ViewState = 'dashboard';
    switch (log.type) {
      case 'MUTASI': view = 'inventory'; break;
      case 'MENU': view = 'menu'; break;
      case 'PEMBELIAN': view = 'procurement'; break;
      case 'DISTRIBUSI': 
      case 'PICKUP': view = 'distribution'; break;
    }
    onNavigate(view, log.targetId);
  };

  const handleDeleteLog = (e: React.MouseEvent, log: ActivityLog) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm(`Hapus data "${log.title}"?`)) return;
    const sourceId = log.sourceId;
    if (!sourceId) return;
    switch (log.type) {
      case 'MUTASI':
        setTransactions(prev => prev.filter(t => t.id !== sourceId));
        if (supabaseService.isConfigured()) supabaseService.deleteRow('transactions', sourceId);
        break;
      case 'MENU':
        setMenuPlans(prev => prev.filter(m => m.id !== sourceId));
        if (supabaseService.isConfigured()) supabaseService.deleteRow('menu_plans', sourceId);
        break;
      case 'PEMBELIAN':
        setProcurements(prev => prev.filter(p => p.id !== sourceId));
        if (supabaseService.isConfigured()) supabaseService.deleteRow('procurements', sourceId);
        break;
      case 'DISTRIBUSI':
      case 'PICKUP':
        setDistributions(prev => prev.filter(d => d.id !== sourceId));
        if (supabaseService.isConfigured()) supabaseService.deleteRow('distributions', sourceId);
        break;
    }
  };

  const allActivities = useMemo((): ActivityLog[] => {
    let logs: ActivityLog[] = [];
    if (logFilter === 'ALL') {
      (transactions || []).forEach(t => {
        logs.push({
          id: `${t.id}-mutasi`, sourceId: t.id, targetId: t.itemId, type: 'MUTASI',
          title: `${t.type === 'IN' ? 'Stok Masuk' : 'Stok Keluar'}: ${t.itemName || 'Item'}`,
          subtitle: t.notes || 'Update Inventori', timestamp: t.date || new Date().toISOString(),
          statusColor: 'text-blue-400', icon: t.type === 'IN' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
          value: `${t.type === 'IN' ? '+' : '-'}${t.quantity || 0}`, performedBy: t.performedBy
        });
      });
      (menuPlans || []).forEach(m => {
        const formattedDate = m.date ? new Date(m.date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' }) : '-';
        logs.push({
          id: `${m.id}-menu`, sourceId: m.id, targetId: m.id, type: 'MENU',
          title: `Menu: ${m.name || 'Tanpa Nama'}`, subtitle: `Jadwal: ${formattedDate}`,
          timestamp: m.createdAt || new Date().toISOString(), statusColor: 'text-purple-400',
          icon: 'fa-utensils', value: `${m.portions || 0} Porsi`, performedBy: m.performedBy
        });
      });
      (procurements || []).forEach(p => {
        if (!p || p.totalPrice === 0) return;
        logs.push({
          id: `${p.id}-beli`, sourceId: p.id, targetId: p.id, type: 'PEMBELIAN',
          title: p.items?.[0]?.name || 'Pembelian', subtitle: `Vendor: ${p.supplier || '-'}`,
          timestamp: p.date || new Date().toISOString(), statusColor: 'text-emerald-400',
          icon: 'fa-file-invoice-dollar', value: `IDR ${(p.totalPrice || 0).toLocaleString('id-ID')}`, performedBy: p.performedBy
        });
      });
    }
    (distributions || []).forEach(d => {
      if (d.status !== 'PREPARING') {
        logs.push({
          id: `${d.id}-dist`, sourceId: d.id, targetId: d.id, type: 'DISTRIBUSI',
          title: d.destination || 'Tujuan', subtitle: `Driver: ${d.driverName || '-'}`,
          timestamp: d.deliveredAt || d.sentAt || d.timestamp || new Date().toISOString(),
          statusColor: 'text-orange-400', icon: 'fa-truck-fast', value: `${d.portions || 0} Porsi`, performedBy: d.performedBy
        });
      }
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, menuPlans, procurements, distributions, logFilter]);

  const navigatePhoto = (direction: 'next' | 'prev') => {
    if (selectedPhotoIndex === null) return;
    if (direction === 'next') setSelectedPhotoIndex((selectedPhotoIndex + 1) % galleryItems.length);
    else setSelectedPhotoIndex((selectedPhotoIndex - 1 + galleryItems.length) % galleryItems.length);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-3 md:space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500 pt-1.5 px-0.5">
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <button onClick={() => setLogFilter(logFilter === 'LOCATIONS' ? 'ALL' : 'LOCATIONS')} className={`glass-panel p-2 md:p-3.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${logFilter === 'LOCATIONS' ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'hover:bg-white/5'}`}>
          <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center mb-1.5 ${logFilter === 'LOCATIONS' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
             <i className="fas fa-location-dot text-[10px] md:text-xs"></i>
          </div>
          <h3 className="text-sm md:text-lg font-black leading-none">{schoolNames.length}</h3>
          <p className="text-[6px] md:text-[7px] text-slate-500 font-black uppercase mt-1 tracking-tight">{logFilter === 'LOCATIONS' ? 'Reset' : 'Lokasi'}</p>
        </button>
        <button onClick={() => setShowPortionBreakdown(!showPortionBreakdown)} className="glass-panel p-2 md:p-3.5 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white/5 transition-all">
          <div className="bg-orange-500/10 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center mb-1.5 text-orange-400 border border-orange-500/20">
             <i className="fas fa-bowl-food text-[10px] md:text-xs"></i>
          </div>
          <h3 className="text-sm md:text-lg font-black leading-none">{dummyTotalPortions}</h3>
          <p className="text-[6px] md:text-[7px] text-slate-500 font-black uppercase mt-1 tracking-tight">Total Porsi</p>
        </button>
        <button onClick={() => setShowItemBreakdown(!showItemBreakdown)} className="glass-panel p-2 md:p-3.5 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white/5 transition-all">
          <div className="bg-emerald-500/10 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center mb-1.5 text-emerald-400 border border-orange-500/20">
             <i className="fas fa-layer-group text-[10px] md:text-xs"></i>
          </div>
          <h3 className="text-sm md:text-lg font-black leading-none">{stock.length}</h3>
          <p className="text-[6px] md:text-[7px] text-slate-500 font-black uppercase mt-1 tracking-tight">Total Item</p>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3 md:gap-4 overflow-hidden">
        <div className="order-1 lg:order-2 lg:col-span-4 flex flex-col shrink-0">
          <section className="glass-panel rounded-[1.75rem] p-3 md:p-4 border-white/10 relative overflow-hidden shrink-0">
            <h3 className="font-bold text-[7px] md:text-[8px] text-slate-400 uppercase tracking-wider flex items-center mb-3">
              <i className="fas fa-chart-line text-blue-500 mr-1.5"></i> PERFORMA HARIAN
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-blue-950/40 rounded-xl border border-white/5 flex flex-col justify-between h-full">
                 <div className="flex justify-between items-end mb-1">
                    <div>
                      <p className="text-[5px] md:text-[7px] font-black text-blue-500 uppercase mb-0.5">DROP TUNTAS</p>
                      <p className="text-xs md:text-lg font-black leading-none">{totalPortionsDelivered}</p>
                    </div>
                    <p className="text-[7px] md:text-[9px] font-black">{deliveryPercentage}%</p>
                 </div>
                 <div className="w-full bg-white/10 h-1 md:h-2 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${deliveryPercentage}%` }}></div>
                 </div>
              </div>
              <div className="p-2 md:p-3 bg-blue-950/40 rounded-xl border border-white/5 flex flex-col justify-center h-full">
                <p className="text-[5px] md:text-[7px] font-black text-orange-500 uppercase mb-1">BALIK OMPRENG</p>
                <p className="text-xs md:text-lg font-black leading-none">{totalOmprengPickedUp}</p>
              </div>
            </div>
          </section>
          <section className="hidden md:flex mt-4 flex-none flex-col glass-panel rounded-[1.75rem] border border-white/5 overflow-hidden min-h-[140px]">
            <div className="px-5 py-2.5 flex justify-between items-center border-b border-blue-500/5 bg-white/5">
               <h3 className="font-bold text-[9px] text-slate-400 uppercase tracking-wider flex items-center"><i className="fas fa-camera text-blue-500 mr-1.5"></i> DOKUMENTASI</h3>
               <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{galleryItems.length} ITEMS</span>
            </div>
            <div className="flex-1 relative overflow-hidden p-2.5 flex items-center">
              <div ref={galleryRef} className="flex space-x-3 overflow-hidden scroll-smooth w-full items-center px-0.5">
                {galleryItems.length > 0 ? galleryItems.map((item, idx) => (
                  <div key={idx} onClick={() => setSelectedPhotoIndex(idx)} className="flex-none w-44 h-24 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500/50 transition-all relative group">
                    <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                       <p className="text-[6px] font-black text-white uppercase truncate">{item.label}</p>
                    </div>
                  </div>
                )) : <p className="text-[7px] font-bold text-slate-500 uppercase text-center w-full italic opacity-30">Belum ada foto</p>}
              </div>
            </div>
          </section>
        </div>

        <div className="order-2 lg:order-1 lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
          <section className="flex-1 flex flex-col glass-panel rounded-[1.75rem] p-3 md:p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-3 border-b border-blue-500/5 pb-2 shrink-0">
               <h3 className="font-bold text-[8px] md:text-[9px] text-slate-500 uppercase tracking-wider flex items-center">
                  <span className={`w-1 h-1 rounded-full mr-1.5 animate-pulse ${logFilter === 'LOCATIONS' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                  {logFilter === 'LOCATIONS' ? 'TUJUAN TERKIRIM' : 'LOG AKTIVITAS'}
               </h3>
               <div className="flex items-center space-x-1.5">
                 <span className="text-[7px] md:text-[8px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 uppercase">
                    {currentTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB
                 </span>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
              <div className="space-y-2 pt-1">
                {allActivities.length > 0 ? allActivities.map((log, idx) => (
                  <div key={`${log.id}-${idx}`} onClick={() => handleLogClick(log)} className="activity-log-card flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 hover:border-blue-500/20 transition-all cursor-pointer">
                    <div className="flex items-center space-x-2 overflow-hidden flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] md:text-[9px] shrink-0 ${log.type === 'DISTRIBUSI' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'} border border-current/10`}>
                        <i className={`fas ${log.icon}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[9px] md:text-[10px] leading-tight truncate group-hover:text-blue-500">{log.title}</p>
                        <p className="text-[6px] md:text-[7px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide truncate">{log.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center ml-1.5">
                      <div className="flex flex-col items-end mr-2">
                        <p className="font-black text-[8px] md:text-[9px]">{log.value}</p>
                        <p className="text-[5px] md:text-[6px] text-slate-500 font-black uppercase mt-0.5">{formatTime(log.timestamp)}</p>
                      </div>
                      <button onClick={(e) => handleDeleteLog(e, log)} className="p-1.5 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100"><i className="fas fa-trash-alt text-[7px] md:text-[8px]"></i></button>
                    </div>
                  </div>
                )) : <p className="py-12 text-center text-[8px] text-slate-500 uppercase tracking-widest italic opacity-50">Belum ada data</p>}
              </div>
            </div>
          </section>
        </div>
      </div>

      {selectedPhotoIndex !== null && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-[2000] flex flex-col items-center justify-center p-3" onClick={() => setSelectedPhotoIndex(null)}>
           <div className="relative max-w-4xl w-full flex flex-col items-center animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-full aspect-video flex items-center justify-center">
                <img src={galleryItems[selectedPhotoIndex].url} className="max-w-full max-h-[65dvh] object-contain rounded-2xl border border-white/10 shadow-2xl" alt="Preview" />
                <button onClick={() => navigatePhoto('prev')} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white"><i className="fas fa-chevron-left text-[10px]"></i></button>
                <button onClick={() => navigatePhoto('next')} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white"><i className="fas fa-chevron-right text-[10px]"></i></button>
              </div>
              <div className="mt-5 text-center">
                 <h2 className="text-base font-black text-white uppercase tracking-widest">{galleryItems[selectedPhotoIndex].label}</h2>
                 <p className="text-[7px] md:text-[8px] font-black text-blue-400 uppercase tracking-[0.15em]">{galleryItems[selectedPhotoIndex].type} — {new Date(galleryItems[selectedPhotoIndex].date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' })} WIB</p>
                 <button onClick={() => setSelectedPhotoIndex(null)} className="mt-3 px-5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[7px] font-black text-white uppercase tracking-widest">TUTUP</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
