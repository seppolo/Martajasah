
import React, { useState, useMemo } from 'react';
import { Distribution, User } from '../types';
import { supabaseService } from '../services/supabaseService';

interface ManageDistributionProps {
  distributions: Distribution[];
  setDistributions: React.Dispatch<React.SetStateAction<Distribution[]>>;
  schoolNames?: string[]; 
  currentUsername?: string;
}

const STATIC_SCHOOL_NAMES = [
  'TK AL-MUHIBBIN',
  'SMKN 3 BANGKALAN',
  'SDN MLAJAH 1',
  'SDN MARTAJASAH',
  'SDN KRAMAT 1',
  'SDN KRAMAT 2',
  'SDN SEMBILANGAN',
  'SMPN 7 BANGKALAN',
  'SDIT NURUL RAHMAH',
  'TK ANBUNAYYA'
];

/**
 * Robust helper to get Full ISO-like string in Asia/Jakarta timezone
 */
const getJakartaFullTimestamp = (date: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
};

const ManageDistribution: React.FC<ManageDistributionProps> = ({ distributions, setDistributions, schoolNames = STATIC_SCHOOL_NAMES, currentUsername }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchoolsMap, setSelectedSchoolsMap] = useState<Record<string, number>>({});
  const [commonConfig, setCommonConfig] = useState({ 
    recipientName: 'PANITIA MBG', 
    defaultPortions: 100, 
    driverName: '' 
  });

  const selectedCount = Object.keys(selectedSchoolsMap).length;

  const totalPortions = useMemo(() => {
    return (Object.values(selectedSchoolsMap) as number[]).reduce((sum, p) => sum + p, 0);
  }, [selectedSchoolsMap]);

  const toggleSchool = (school: string) => {
    setSelectedSchoolsMap(prev => {
      const next = { ...prev };
      if (next[school] !== undefined) {
        delete next[school];
      } else {
        next[school] = commonConfig.defaultPortions;
      }
      return next;
    });
  };

  const updatePortion = (school: string, val: number) => {
    if (val < 0) return;
    setSelectedSchoolsMap(prev => ({
      ...prev,
      [school]: val
    }));
  };

  const toggleAll = () => {
    if (selectedCount === schoolNames.length) {
      setSelectedSchoolsMap({});
    } else {
      const all: Record<string, number> = {};
      schoolNames.forEach(s => {
        all[s] = commonConfig.defaultPortions;
      });
      setSelectedSchoolsMap(all);
    }
  };

  const handleBulkDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEntries = Object.entries(selectedSchoolsMap);
    if (selectedEntries.length === 0) {
      alert("Pilih setidaknya satu sekolah tujuan.");
      return;
    }

    const newDeployments: Distribution[] = (selectedEntries as [string, number][]).map(([name, portions]) => ({
      id: Math.random().toString(36).substr(2, 9),
      destination: name,
      recipientName: commonConfig.recipientName,
      portions: portions,
      driverName: commonConfig.driverName,
      status: 'PREPARING',
      timestamp: getJakartaFullTimestamp(),
      performedBy: currentUsername
    }));

    setDistributions(prev => [...newDeployments, ...prev]);
    setIsModalOpen(false);
    setSelectedSchoolsMap({});
    setCommonConfig(prev => ({ ...prev, driverName: '' }));
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Batalkan rencana distribusi ini?")) {
      setDistributions(prev => prev.filter(d => d.id !== id));
      if (supabaseService.isConfigured()) {
        supabaseService.deleteRow('distributions', id);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Bersihkan semua riwayat distribusi yang sudah selesai (PICKED UP)?")) {
      const toDelete = distributions.filter(d => d.status === 'PICKED_UP');
      setDistributions(prev => prev.filter(d => d.status !== 'PICKED_UP'));
      
      if (supabaseService.isConfigured()) {
        toDelete.forEach(d => supabaseService.deleteRow('distributions', d.id));
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-end gap-4 px-1 shrink-0">
        <div className="flex gap-2">
          <button 
            onClick={handleClearHistory} 
            className="glass-panel border-red-500/20 text-red-400 px-4 py-2 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95 transition-all"
          >
            Bersihkan Riwayat
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="glossy-button text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-black text-[10px] md:text-[11px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"
          >
            <i className="fas fa-layer-group mr-2 text-sm"></i> Deploy Massal
          </button>
        </div>
      </header>

      <div className="glass-panel rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0f172a] border-b border-blue-500/10">
                <th className="px-5 py-4 text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest">Tujuan</th>
                <th className="px-5 py-4 text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest">Porsi</th>
                <th className="px-5 py-4 text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest">Driver</th>
                <th className="px-5 py-4 text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-4 text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {distributions.length > 0 ? distributions.map((dist) => (
                <tr key={dist.id} className="border-b border-blue-500/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-[10px] md:text-[11px] font-bold text-white uppercase">{dist.destination}</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter opacity-60">Rec: {dist.recipientName}</p>
                  </td>
                  <td className="px-5 py-4 text-[10px] md:text-[11px] font-bold text-blue-100">{dist.portions}</td>
                  <td className="px-5 py-4 text-[10px] md:text-[11px] text-slate-300 font-medium">{dist.driverName || '-'}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border ${
                      dist.status === 'PREPARING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                      dist.status === 'PICKED_UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {dist.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button 
                      onClick={() => handleDelete(dist.id)} 
                      className="text-slate-500/40 hover:text-red-500 transition-colors p-2 cursor-pointer"
                    >
                      <i className="fas fa-times text-xs md:text-sm"></i>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500 text-[9px] uppercase font-black tracking-widest opacity-50">Belum ada rencana distribusi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1000] flex items-center justify-center p-2 md:p-4 backdrop-smooth-enter">
          <form onSubmit={handleBulkDeploy} className="bg-[#0f172a] w-full max-w-6xl rounded-[2rem] md:rounded-[2.5rem] border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden animate-modal-enter" style={{ maxHeight: '96dvh' }}>
            <div className="shrink-0 p-4 md:p-6 pb-2 md:pb-3 border-b border-blue-500/10 bg-blue-500/5">
               <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl glossy-button flex items-center justify-center text-white"><i className="fas fa-truck-ramp-box text-xs md:text-sm"></i></div>
                    <div>
                      <h3 className="font-black text-[10px] md:text-[12px] text-white uppercase tracking-[0.2em] leading-none">Deploy Massal</h3>
                      <p className="text-[7px] text-blue-400 font-black uppercase mt-1 tracking-widest">Hover to set portions</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setIsModalOpen(false)} className="text-blue-400/40 hover:text-white w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/5 rounded-xl transition-all"><i className="fas fa-times"></i></button>
               </div>
            </div>
            
            <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col space-y-4 md:space-y-6">
              <div className="flex justify-between items-center px-1 shrink-0">
                <label className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Daftar Sekolah ({selectedCount})</label>
                <button type="button" onClick={toggleAll} className="text-[8px] font-black text-blue-500/60 hover:text-blue-400 uppercase tracking-widest">
                  {selectedCount === schoolNames.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0">
                {schoolNames.map(school => {
                  const portion = selectedSchoolsMap[school];
                  const isActive = portion !== undefined;
                  return (
                    <div 
                      key={school} 
                      className={`h-14 md:h-16 rounded-xl border transition-all duration-300 relative group overflow-hidden ${
                        isActive ? 'bg-blue-600/20 border-blue-500/50 shadow-md scale-[0.98]' : 'glass-panel border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="absolute inset-0 flex items-center px-3 transition-opacity duration-300 group-hover:opacity-0 group-focus-within:opacity-0 pointer-events-none">
                         <div className="flex items-center space-x-2 w-full">
                           <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-blue-500 border-blue-400' : 'border-white/10'}`}>
                             {isActive && <i className="fas fa-check text-[7px] text-white"></i>}
                           </div>
                           <div className="flex-1 min-w-0">
                             <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-tight truncate block leading-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>{school}</span>
                             {isActive && <span className="text-[7px] font-bold text-blue-400 uppercase tracking-widest">{portion} Porsi</span>}
                           </div>
                         </div>
                      </div>

                      <div className="absolute inset-0 bg-slate-900/95 flex flex-col justify-center px-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-30">
                         <div className="flex items-center justify-between mb-1">
                            <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest truncate max-w-[70%]">{school}</span>
                            <button 
                              type="button" 
                              onClick={() => toggleSchool(school)}
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] transition-all ${isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-blue-500 text-white'}`}
                            >
                              <i className={`fas ${isActive ? 'fa-minus' : 'fa-plus'}`}></i>
                            </button>
                         </div>
                         <div className="relative">
                           <input 
                             type="number" 
                             value={portion || ''} 
                             placeholder={isActive ? "Edit..." : "Set Porsi"}
                             onChange={(e) => {
                               const val = e.target.value === '' ? 0 : Number(e.target.value);
                               if (!isActive && val > 0) {
                                  toggleSchool(school);
                                  updatePortion(school, val);
                               } else {
                                  updatePortion(school, val);
                                }
                             }}
                             className="w-full bg-slate-950 border border-blue-500/40 rounded-lg px-2 py-1 text-[10px] text-white font-black outline-none focus:border-blue-500 placeholder-slate-700"
                           />
                           {isActive && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-blue-500 uppercase">P</span>}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-1">Nama Driver</label>
                  <input required type="text" value={commonConfig.driverName} onChange={(e) => setCommonConfig({...commonConfig, driverName: e.target.value})} placeholder="Input Nama Driver..." className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-2 text-[10px] text-white outline-none font-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-1">Nama Penerima</label>
                  <input required type="text" value={commonConfig.recipientName} onChange={(e) => setCommonConfig({...commonConfig, recipientName: e.target.value})} className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-2 text-[10px] text-white outline-none font-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-1">Porsi Default</label>
                  <input type="number" value={commonConfig.defaultPortions} onChange={(e) => setCommonConfig({...commonConfig, defaultPortions: Number(e.target.value)})} className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-2 text-[10px] text-white outline-none font-black opacity-60" />
                </div>
              </div>

              <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 flex items-center justify-between shadow-inner shrink-0">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-blue-400 uppercase tracking-[0.3em]">Total Lokasi</span>
                  <span className="text-sm font-black text-white">{selectedCount} Lokasi</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[7px] font-black text-blue-400 uppercase tracking-[0.3em]">Total Akumulasi Porsi</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xl font-black text-white">{totalPortions.toLocaleString('id-ID')}</span>
                    <span className="text-[8px] font-bold text-blue-400/50 uppercase">Porsi</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 p-4 md:p-6 border-t border-blue-500/10 bg-[#0f172a]/95 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button 
                type="submit" 
                disabled={selectedCount === 0}
                className="w-full glossy-button text-white py-3.5 rounded-xl font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-30"
              >
                DEPLOY {selectedCount} LOKASI
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageDistribution;
