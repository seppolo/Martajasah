
import React, { useState, useMemo } from 'react';
import { Distribution, User } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface DistributionProps {
  distributions: Distribution[];
  setDistributions: React.Dispatch<React.SetStateAction<Distribution[]>>;
  highlightId?: string | null;
  canManage?: boolean;
  canProcess?: boolean;
  currentUser?: User | null;
}

const SCHOOLS = [
  'TK AL-MUHIBBIN', 'SMKN 3 BANGKALAN', 'SDN MLAJAH 1', 'SDN MARTAJASAH',
  'SDN KRAMAT 1', 'SDN KRAMAT 2', 'SDN SEMBILANGAN', 'SMPN 7 BANGKALAN',
  'SDIT NURUL RAHMAH', 'TK ANBUNAYYA'
];

const DistributionList: React.FC<DistributionProps> = ({ distributions, setDistributions, highlightId, canManage, canProcess, currentUser }) => {
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);

  const filteredDistributions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return distributions.filter(d => d.timestamp.startsWith(today));
  }, [distributions]);

  const updateStatus = (id: string, newStatus: Distribution['status']) => {
    setDistributions(prev => prev.map(d => {
      if (d.id === id) {
        return { 
          ...d, 
          status: newStatus,
          sentAt: newStatus === 'ON_DELIVERY' ? new Date().toISOString() : d.sentAt,
          deliveredAt: newStatus === 'DELIVERED' ? new Date().toISOString() : d.deliveredAt
        };
      }
      return d;
    }));
  };

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSchools.length === 0) return;

    const newItems: Distribution[] = selectedSchools.map(school => ({
      id: Math.random().toString(36).substr(2, 9),
      destination: school,
      recipientName: 'PANITIA MBG',
      portions: 100,
      driverName: driverName || 'Driver Utama',
      status: 'PREPARING',
      timestamp: new Date().toISOString(),
      performedBy: currentUser?.username
    }));

    setDistributions(prev => [...newItems, ...prev]);
    setIsDeployModalOpen(false);
    setSelectedSchools([]);
    setDriverName('');
  };

  const toggleSchool = (name: string) => {
    setSelectedSchools(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-5">
      <header className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alur Distribusi</h2>
          <p className="text-[8px] text-blue-400 font-bold uppercase mt-1">DROP MAKANAN HARIAN</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setIsDeployModalOpen(true)} 
            className="glossy-button text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"
          >
            <i className="fas fa-truck-ramp-box mr-2"></i> Deploy Drop
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDistributions.length > 0 ? filteredDistributions.map((dist) => (
            <div key={dist.id} className={`glass-panel rounded-[2rem] p-6 flex flex-col group transition-all duration-500 relative overflow-hidden ${highlightId === dist.id ? 'border-blue-400 ring-2 ring-blue-500/20' : ''}`}>
              <div className="flex justify-between items-start mb-5">
                <div className="flex flex-col">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border mb-2 w-fit tracking-widest ${
                    dist.status === 'PREPARING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                    dist.status === 'ON_DELIVERY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {dist.status.replace('_', ' ')}
                  </span>
                  <h4 className="font-black text-sm text-white uppercase tracking-tight">{dist.destination}</h4>
                </div>
                <div className="bg-blue-500/10 w-11 h-11 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                  <span className="text-xs font-black text-blue-400">{dist.portions}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Kurir</p>
                  <p className="text-[10px] font-bold text-white truncate">{dist.driverName || '-'}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-[10px] font-bold text-white truncate">{dist.status === 'PREPARING' ? 'Siap' : dist.status === 'ON_DELIVERY' ? 'Jalan' : 'Tuntas'}</p>
                </div>
              </div>

              {canProcess && (
                <div className="mt-auto">
                  {dist.status === 'PREPARING' && (
                    <button 
                      onClick={() => updateStatus(dist.id, 'ON_DELIVERY')}
                      className="w-full glossy-button text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <i className="fas fa-truck-fast"></i>
                      <span>SIAPKAN PENGIRIMAN</span>
                    </button>
                  )}
                  {dist.status === 'ON_DELIVERY' && (
                    <button 
                      onClick={() => updateStatus(dist.id, 'DELIVERED')}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <i className="fas fa-check-circle"></i>
                      <span>KONFIRMASI TERKIRIM</span>
                    </button>
                  )}
                  {dist.status === 'DELIVERED' && (
                    <div className="flex items-center justify-center space-x-2 text-emerald-400 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                       <i className="fas fa-check-double text-xs"></i>
                       <span className="text-[9px] font-black uppercase tracking-widest">TERKIRIM</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="col-span-full py-24 text-center opacity-20 border-2 border-dashed border-blue-500/10 rounded-[3rem]">
              <i className="fas fa-map-location-dot text-6xl mb-5"></i>
              <p className="text-[12px] font-black uppercase tracking-[0.4em]">Belum Ada Pengiriman Hari Ini</p>
            </div>
          )}
        </div>
      </div>

      {isDeployModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-500">
           <form onSubmit={handleDeploy} className="bg-[#0f172a] w-full max-w-4xl rounded-[2.5rem] border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden animate-modal-enter max-h-[90vh]">
              <div className="p-7 border-b border-blue-500/10 bg-blue-500/5 flex justify-between items-center">
                 <h3 className="font-black text-sm text-white uppercase tracking-widest flex items-center"><i className="fas fa-truck-ramp-box mr-3 text-blue-400"></i> Deploy Drop Massal</h3>
                 <button type="button" onClick={() => setIsDeployModalOpen(false)} className="text-slate-500 hover:text-white w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><i className="fas fa-times"></i></button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-2">Nama Driver Utama</label>
                    <input required type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Contoh: Pak Budi" className="w-full glass-panel border-0 bg-slate-900/60 rounded-2xl px-6 py-4.5 text-xs text-white outline-none font-bold" />
                 </div>

                 <div className="space-y-4">
                    <label className="text-[9px] font-black text-white uppercase tracking-widest px-2">Pilih Sekolah Tujuan (Default 100 Porsi)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                       {SCHOOLS.map(name => (
                         <button 
                            key={name} type="button" onClick={() => toggleSchool(name)}
                            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${selectedSchools.includes(name) ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                         >
                            <span className={`text-[10px] font-black uppercase truncate block ${selectedSchools.includes(name) ? 'text-white' : 'text-slate-500'}`}>{name}</span>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-blue-500/10 bg-[#0f172a]/98 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                 <button type="submit" disabled={selectedSchools.length === 0} className="w-full glossy-button text-white py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl disabled:opacity-30 active:scale-95 transition-all">
                   SAHKAN PENGIRIMAN ({selectedSchools.length} LOKASI)
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default DistributionList;
