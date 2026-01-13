
import React, { useState, useMemo } from 'react';
import { Volunteer, VolunteerDivision, User, UserPermission, UserRole } from '../types';
import { supabaseService } from '../services/supabaseService';

interface VolunteerManagementProps {
  volunteers: Volunteer[];
  setVolunteers: React.Dispatch<React.SetStateAction<Volunteer[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  isAdmin: boolean;
}

const DIVISIONS: { value: VolunteerDivision; label: string; icon: string; color: string; defaultPermissions: UserPermission[] }[] = [
  { value: 'PERSIAPAN', label: 'Persiapan', icon: 'fa-clipboard-list', color: 'text-indigo-400', defaultPermissions: ['CAN_MANAGE_STOCK'] },
  { value: 'PENGOLAHAN', label: 'Pengolahan', icon: 'fa-fire-burner', color: 'text-orange-400', defaultPermissions: ['CAN_MANAGE_STOCK'] },
  { value: 'PACKING', label: 'Packing', icon: 'fa-box-open', color: 'text-pink-400', defaultPermissions: [] },
  { value: 'DISTRIBUSI', label: 'Distribusi', icon: 'fa-truck-fast', color: 'text-cyan-400', defaultPermissions: ['CAN_DISTRIBUTE'] },
  { value: 'CUCI_OMPRENG', label: 'Cuci Ompreng', icon: 'fa-soap', color: 'text-blue-400', defaultPermissions: [] },
  { value: 'KEBERSIHAN', label: 'Kebersihan', icon: 'fa-broom', color: 'text-emerald-400', defaultPermissions: [] },
  { value: 'PURCHASING', label: 'Purchasing', icon: 'fa-cart-shopping', color: 'text-amber-400', defaultPermissions: ['CAN_RECEIVE', 'CAN_ORDER'] },
  { value: 'KEAMANAN', label: 'Keamanan', icon: 'fa-shield-halved', color: 'text-red-400', defaultPermissions: [] },
];

const PERMISSIONS: { value: UserPermission; label: string; icon: string }[] = [
  { value: 'CAN_RECEIVE', label: 'Terima Barang', icon: 'fa-box-open' },
  { value: 'CAN_ORDER', label: 'Buat Pesanan', icon: 'fa-file-invoice' },
  { value: 'CAN_DISTRIBUTE', label: 'Atur Distribusi', icon: 'fa-truck-fast' },
  { value: 'CAN_MANAGE_STOCK', label: 'Ubah Stok', icon: 'fa-boxes-stacked' },
  { value: 'CAN_CREATE_MENU', label: 'Buat Menu', icon: 'fa-utensils' },
];

const VolunteerManagement: React.FC<VolunteerManagementProps> = ({ volunteers, setVolunteers, users, setUsers, isAdmin }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDivision, setFilterDivision] = useState<VolunteerDivision | 'ALL'>('ALL');
  
  const [formData, setFormData] = useState({ 
    name: '', 
    division: 'PERSIAPAN' as VolunteerDivision, 
    phone: '',
    isCoordinator: false,
    giveAccess: false,
    username: '',
    password: '',
    permissions: [] as UserPermission[]
  });

  // MENGGABUNGKAN DATA: Mencari User role RELAWAN yang belum ada di list Volunteer (mencegah data hilang)
  const displayVolunteers = useMemo(() => {
    const list = [...volunteers];
    const linkedUserIds = new Set(volunteers.map(v => v.userId).filter(id => !!id));
    
    // Cari user relawan yang belum terdaftar di list relawan
    const orphanRelawanUsers = users.filter(u => u.role === 'RELAWAN' && !linkedUserIds.has(u.id));
    
    orphanRelawanUsers.forEach(u => {
      list.push({
        id: `orphan-${u.id}`,
        name: u.fullName,
        division: 'DISTRIBUSI', // Default division
        phone: '-',
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
        userId: u.id
      });
    });

    return list.filter(v => filterDivision === 'ALL' ? true : v.division === filterDivision);
  }, [volunteers, users, filterDivision]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ 
      name: '', 
      division: 'PERSIAPAN', 
      phone: '', 
      isCoordinator: false, 
      giveAccess: false, 
      username: '', 
      password: '',
      permissions: DIVISIONS.find(d => d.value === 'PERSIAPAN')?.defaultPermissions || []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Volunteer) => {
    const realId = v.id.startsWith('orphan-') ? null : v.id;
    setEditingId(realId || v.userId || v.id);
    const linkedUser = users.find(u => u.id === v.userId);
    setFormData({ 
      name: v.name, 
      division: v.division, 
      phone: v.phone, 
      isCoordinator: !!v.isCoordinator,
      giveAccess: !!v.userId,
      username: linkedUser?.username || '',
      password: linkedUser?.password || '',
      permissions: linkedUser?.permissions || DIVISIONS.find(d => d.value === v.division)?.defaultPermissions || []
    });
    setIsModalOpen(true);
  };

  const togglePermission = (perm: UserPermission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const handleDivisionChange = (newDivision: VolunteerDivision) => {
    const divConfig = DIVISIONS.find(d => d.value === newDivision);
    setFormData(prev => ({
      ...prev,
      division: newDivision,
      permissions: divConfig?.defaultPermissions || []
    }));
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string, userId?: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAdmin) return;
    const cleanId = id.startsWith('orphan-') ? null : id;

    if (window.confirm(`Hapus relawan "${name}"? Akun yang tertaut (jika ada) juga akan dihapus.`)) {
      if (cleanId) setVolunteers(prev => prev.filter(v => v.id !== cleanId));
      if (userId) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        if (supabaseService.isConfigured()) supabaseService.deleteRow('users', userId);
      }
      if (cleanId && supabaseService.isConfigured()) supabaseService.deleteRow('volunteers', cleanId);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let linkedUserId = '';

    if (formData.giveAccess) {
      if (!formData.username) {
        alert("Username wajib diisi untuk akses akun.");
        return;
      }

      const currentVolunteer = volunteers.find(v => v.id === editingId);
      const existingUser = users.find(u => u.username === formData.username && u.id !== currentVolunteer?.userId);
      
      if (existingUser) {
        alert("Username sudah digunakan oleh staff/relawan lain.");
        return;
      }

      const userPayload: User = {
        id: currentVolunteer?.userId || Math.random().toString(36).substr(2, 9),
        username: formData.username,
        password: formData.password || 'MBG123',
        fullName: formData.name,
        role: 'RELAWAN' as UserRole,
        permissions: formData.permissions
      };
      
      linkedUserId = userPayload.id;
      setUsers(prev => {
        const otherUsers = prev.filter(u => u.id !== userPayload.id);
        return [...otherUsers, userPayload];
      });
    } else {
      const existingVolunteer = volunteers.find(v => v.id === editingId);
      if (existingVolunteer?.userId) {
        setUsers(prev => prev.filter(u => u.id !== existingVolunteer.userId));
        if (supabaseService.isConfigured()) supabaseService.deleteRow('users', existingVolunteer.userId);
      }
    }
    
    if (editingId && !editingId.startsWith('orphan-')) {
      setVolunteers(prev => prev.map(v => 
        v.id === editingId 
          ? { ...v, name: formData.name, division: formData.division, phone: formData.phone, isCoordinator: formData.isCoordinator, userId: linkedUserId || undefined } 
          : v
      ));
    } else {
      const newV: Volunteer = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: formData.name,
        division: formData.division,
        phone: formData.phone,
        isCoordinator: formData.isCoordinator,
        status: 'ACTIVE', 
        joinedAt: new Date().toISOString(),
        userId: linkedUserId || undefined
      };
      setVolunteers(prev => [newV, ...prev]);
    }
    
    setIsModalOpen(false);
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col space-y-5 md:space-y-6 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-end gap-3.5 shrink-0 px-1">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select 
              value={filterDivision} 
              onChange={(e) => setFilterDivision(e.target.value as any)}
              className="glass-panel border-blue-500/20 bg-slate-900/50 rounded-lg px-3 py-1.5 text-[9px] text-white font-black uppercase tracking-widest outline-none appearance-none pr-9 cursor-pointer"
            >
              <option value="ALL">Semua Divisi</option>
              {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <i className="fas fa-filter absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-[9px] pointer-events-none"></i>
          </div>
          {isAdmin && (
            <button onClick={handleOpenAdd} className="glossy-button text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all">
              <i className="fas fa-plus mr-1.5"></i> Relawan
            </button>
          )}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayVolunteers.map((v) => {
            const div = DIVISIONS.find(d => d.value === v.division);
            const hasAccount = !!v.userId;
            return (
              <div key={v.id} className="glass-panel rounded-[1.25rem] p-5 flex flex-col group hover:border-blue-500/40 transition-all duration-300 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3.5 relative z-10">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-blue-500/10 ${div?.color} border border-current/10`}><i className={`fas ${div?.icon}`}></i></div>
                    {v.isCoordinator && (
                      <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded-md text-[6px] font-black uppercase tracking-widest">Kordinator</span>
                    )}
                    {hasAccount && (
                      <div className="flex items-center space-x-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.2)] group/acc">
                        <i className="fas fa-key text-[8px] text-blue-300 group-hover/acc:rotate-12 transition-transform"></i>
                        <span>Akun</span>
                      </div>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => handleOpenEdit(v)} 
                        className="text-blue-400/30 hover:text-blue-400 transition-colors p-1.5"
                        title="Edit Relawan"
                      >
                        <i className="fas fa-pen text-[10px]"></i>
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, v.id, v.name, v.userId)} 
                        className="text-slate-500/30 hover:text-red-500 transition-colors p-1.5"
                        title="Hapus Relawan"
                      >
                        <i className="fas fa-times text-[10px]"></i>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="relative z-10">
                  <h4 className="font-bold text-sm md:text-base text-white truncate">{v.name}</h4>
                  <p className="text-[9px] text-blue-400 font-black uppercase mt-0.5 tracking-widest">{div?.label}</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-1.5 flex items-center"><i className="fab fa-whatsapp mr-1 text-emerald-500 text-xs"></i> {v.phone}</p>
                </div>
                <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity"><i className={`fas ${div?.icon} text-7xl`}></i></div>
              </div>
            );
          })}
          {displayVolunteers.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <i className="fas fa-users-slash text-blue-500/10 text-3xl mb-3.5"></i>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest opacity-60">Tidak ada relawan di divisi ini</p>
            </div>
          )}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-3 animate-in fade-in duration-300">
          <form onSubmit={handleSave} className="bg-[#0f172a] w-full max-w-sm rounded-[2rem] border border-blue-500/20 shadow-2xl p-7 animate-modal-enter max-h-[90vh] overflow-y-auto no-scrollbar">
            <h3 className="font-black text-base text-white uppercase tracking-widest mb-5">
              {editingId ? 'Edit Data Relawan' : 'Tambah Relawan Baru'}
            </h3>
            <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[7px] font-black text-blue-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                 <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Input nama..." className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold placeholder:opacity-20" />
               </div>
               
               <div className="space-y-1">
                 <label className="text-[7px] font-black text-blue-400 uppercase tracking-widest px-1">Divisi Penempatan</label>
                 <div className="relative">
                    <select value={formData.division} onChange={(e) => handleDivisionChange(e.target.value as VolunteerDivision)} className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold appearance-none">
                      {DIVISIONS.map(d => <option key={d.value} value={d.value} className="bg-slate-900">{d.label}</option>)}
                    </select>
                    <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-blue-400/30"></i>
                 </div>
               </div>
               
               <div className="space-y-1">
                 <label className="text-[7px] font-black text-blue-400 uppercase tracking-widest px-1">Nomor WhatsApp</label>
                 <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="0812..." className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold" />
               </div>

               <div className="flex items-center space-x-2.5 p-2 bg-blue-500/5 rounded-lg border border-blue-500/10 cursor-pointer" onClick={() => setFormData({...formData, isCoordinator: !formData.isCoordinator})}>
                 <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.isCoordinator ? 'bg-blue-600 border-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-slate-900 border-white/10'}`}>
                   {formData.isCoordinator && <i className="fas fa-check text-[8px] text-white"></i>}
                 </div>
                 <span className="text-[9px] font-black text-slate-100 uppercase tracking-widest">Kordinator Divisi</span>
               </div>

               <div className="mt-6 border-t border-blue-500/10 pt-5 space-y-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Akses Akun Relawan</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.giveAccess} onChange={() => setFormData({...formData, giveAccess: !formData.giveAccess})} className="sr-only peer" />
                      <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {formData.giveAccess && (
                    <div className="space-y-3.5 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest px-1">Relawan Username</label>
                        <input required={formData.giveAccess} type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} placeholder="Username unik..." className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest px-1">Relawan Password</label>
                        <input required={formData.giveAccess} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full glass-panel border-0 bg-slate-900/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-bold" />
                      </div>

                      <div className="p-3.5 glass-panel border-blue-500/10 rounded-xl bg-blue-500/5 space-y-2.5">
                        <label className="text-[7px] font-black text-blue-300 uppercase tracking-widest flex items-center">
                          <i className="fas fa-shield-halved mr-1.5 opacity-50"></i>
                          Hak Operasional Akun
                        </label>
                        <div className="grid grid-cols-2 gap-y-2">
                          {PERMISSIONS.map((p) => (
                            <div 
                              key={p.value}
                              onClick={() => togglePermission(p.value)}
                              className="flex items-center space-x-2 cursor-pointer group"
                            >
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${formData.permissions.includes(p.value) ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-white/10'}`}>
                                {formData.permissions.includes(p.value) && <i className="fas fa-check text-[7px] text-white"></i>}
                              </div>
                              <span className={`text-[7px] font-black uppercase tracking-widest ${formData.permissions.includes(p.value) ? 'text-slate-100' : 'text-slate-500'}`}>{p.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
               </div>

               <div className="flex gap-2.5 pt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 text-slate-400 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                 <button type="submit" className="flex-1 glossy-button text-white py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">
                    {editingId ? 'Simpan' : 'Sahkan'}
                 </button>
               </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VolunteerManagement;
