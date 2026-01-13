
import React, { useState } from 'react';
import { User, UserRole, UserPermission } from '../types';
import { supabaseService } from '../services/supabaseService';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const ROLES: { value: UserRole; label: string; icon: string; color: string }[] = [
  { value: 'AKUNTAN', label: 'Akuntan', icon: 'fa-calculator', color: 'text-emerald-400' },
  { value: 'KA_SPPG', label: 'KA SPPG', icon: 'fa-user-tie', color: 'text-blue-400' },
  { value: 'AHLI_GIZI', label: 'Ahli Gizi', icon: 'fa-apple-whole', color: 'text-orange-400' },
  { value: 'ADMIN_GUDANG', label: 'Admin Gudang', icon: 'fa-boxes-stacked', color: 'text-indigo-400' },
  { value: 'MITRA', label: 'Mitra', icon: 'fa-handshake', color: 'text-slate-400' },
  { value: 'RELAWAN', label: 'Relawan', icon: 'fa-handshake-angle', color: 'text-cyan-400' },
  { value: 'ADMIN', label: 'Admin Utama', icon: 'fa-shield-halved', color: 'text-red-400' },
];

const PERMISSIONS: { value: UserPermission; label: string; icon: string }[] = [
  { value: 'CAN_RECEIVE', label: 'Terima Barang', icon: 'fa-box-open' },
  { value: 'CAN_ORDER', label: 'Buat Pesanan', icon: 'fa-file-invoice' },
  { value: 'CAN_DISTRIBUTE', label: 'Atur Distribusi', icon: 'fa-truck-fast' },
  { value: 'CAN_MANAGE_STOCK', label: 'Ubah Stok', icon: 'fa-boxes-stacked' },
  { value: 'CAN_CREATE_MENU', label: 'Buat Menu', icon: 'fa-utensils' },
];

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    username: '',
    password: '',
    fullName: '',
    role: 'MITRA',
    permissions: []
  });

  // Filter out volunteers from the staff list
  const staffUsers = users.filter(u => u.role !== 'RELAWAN');

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormData({ username: '', password: '', fullName: '', role: 'MITRA', permissions: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      password: user.password || '',
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      setUsers(prev => prev.map(u => u.id === editingUserId ? { ...formData, id: editingUserId } : u));
    } else {
      const newUser: User = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      };
      setUsers(prev => [...prev, newUser]);
    }
    setIsModalOpen(false);
  };

  const togglePermission = (perm: UserPermission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const handleDeleteUser = (e: React.MouseEvent, id: string, username: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (id === 'master-admin' || username === 'aslap') {
      alert("⚠️ Operasi Ditolak: Akun Admin Utama (ASLAP) tidak dapat dihapus.");
      return;
    }

    if (window.confirm(`Hapus personil "${username}" secara permanen?`)) {
      setUsers((currentUsers) => currentUsers.filter(u => u.id !== id));
      if (supabaseService.isConfigured()) {
        supabaseService.deleteRow('users', id).catch(err => {
          console.error("Penghapusan gagal di cloud:", err);
        });
      }
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-5 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-end shrink-0">
        <button 
          type="button"
          onClick={handleOpenAdd}
          className="glossy-button text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"
        >
          <i className="fas fa-user-plus mr-1.5 text-xs pointer-events-none"></i> Tambah Staff
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4.5">
          {staffUsers.map((user) => {
            const roleConfig = ROLES.find(r => r.value === user.role);
            const isMaster = user.id === 'master-admin' || user.username === 'aslap';
            
            return (
              <div 
                key={user.id} 
                className="glass-panel rounded-[1.25rem] p-5 flex flex-col group transition-all duration-300 hover:border-blue-500/40 relative overflow-hidden shrink-0"
              >
                <div className="flex items-center space-x-3 mb-3.5 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-blue-500/10 ${roleConfig?.color} border border-current/10 shadow-md`}>
                      <i className={`fas ${roleConfig?.icon} pointer-events-none`}></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[12px] md:text-sm text-slate-100 leading-tight group-hover:text-white transition-colors truncate">{user.fullName}</h4>
                      <p className="text-[8px] text-blue-400/60 font-black uppercase tracking-widest mt-0.5">@{user.username}</p>
                    </div>
                </div>

                <div className="flex-1 space-y-1.5 mb-3.5 relative z-10">
                    <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest mb-1">Izin Operasional:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.length > 0 ? user.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[6px] text-slate-400 font-bold uppercase">
                          {PERMISSIONS.find(per => per.value === p)?.label}
                        </span>
                      )) : <span className="text-[6px] text-slate-600 font-bold italic">Tanpa izin operasional</span>}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-auto pt-3.5 border-t border-blue-500/10 relative z-30">
                    <span className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border border-blue-500/20 bg-blue-500/5 ${roleConfig?.color}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                    <div className="flex space-x-0.5">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(user); }} 
                        className="text-blue-400/30 hover:text-blue-400 transition-all p-1.5 hover:bg-blue-500/10 rounded-lg"
                        title="Edit Staff"
                      >
                        <i className="fas fa-user-pen pointer-events-none text-[10px]"></i>
                      </button>
                      {!isMaster && (
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteUser(e, user.id, user.username)} 
                          className="text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all p-1.5 rounded-lg cursor-pointer"
                          title="Hapus Staff"
                        >
                          <i className="fas fa-trash-can pointer-events-none text-[10px]"></i>
                        </button>
                      )}
                    </div>
                </div>

                <div className="absolute -right-3 -bottom-3 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                    <i className={`fas ${roleConfig?.icon} text-[75px]`}></i>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1000] flex items-center justify-center px-3 backdrop-smooth-enter">
          <form 
            onSubmit={handleSubmit}
            className="bg-[#0f172a] w-full max-md rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden animate-modal-enter"
          >
            <div className="p-5 border-b border-blue-500/10 bg-blue-500/5 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg glossy-button flex items-center justify-center text-white">
                  <i className={`fas ${editingUserId ? 'fa-user-pen' : 'fa-user-plus'} text-xs pointer-events-none`}></i>
                </div>
                <div>
                  <h3 className="font-black text-xs text-white uppercase tracking-widest leading-none">
                    {editingUserId ? 'Perbarui Staff' : 'Staff Baru'}
                  </h3>
                  <p className="text-[7px] text-blue-400 font-black uppercase tracking-widest mt-1">Otorisasi Martajasah</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-blue-400/40 hover:text-white w-9 h-9 flex items-center justify-center glass-panel border-0 rounded-lg bg-white/5 transition-all"><i className="fas fa-times text-base pointer-events-none"></i></button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1" style={{ maxHeight: '65dvh' }}>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-1">Identitas Dasar</label>
                <input required type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder="Nama Lengkap" className="w-full glass-panel border-0 bg-slate-900/50 rounded-lg px-4 py-3 text-xs text-white outline-none font-bold focus:bg-slate-900" />
                <div className="grid grid-cols-2 gap-2">
                  <input required type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="Username" className="w-full glass-panel border-0 bg-slate-900/50 rounded-lg px-4 py-3 text-xs text-white outline-none font-bold focus:bg-slate-900" />
                  <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Password" className="w-full glass-panel border-0 bg-slate-900/50 rounded-lg px-4 py-3 text-xs text-white outline-none font-bold focus:bg-slate-900" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-1">Jabatan (Role)</label>
                <div className="relative">
                   <select 
                    required 
                    value={formData.role} 
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full glass-panel border-0 bg-slate-900/50 rounded-lg px-4 py-3 text-xs text-white outline-none font-bold focus:bg-slate-900 appearance-none cursor-pointer pr-9"
                  >
                    {ROLES.filter(r => r.value !== 'ADMIN' && r.value !== 'RELAWAN').map((role) => (
                      <option key={role.value} value={role.value} className="bg-slate-900">{role.label}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-blue-400/40 pointer-events-none"></i>
                </div>
              </div>

              <div className="p-4 glass-panel border-blue-500/10 rounded-[1.5rem] bg-blue-500/5 space-y-3">
                <label className="text-[8px] font-black text-blue-300 uppercase tracking-widest px-1 flex items-center">
                  <i className="fas fa-shield-halved mr-1.5 opacity-50 text-[9px]"></i>
                  Hak Operasional
                </label>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3.5">
                  {PERMISSIONS.map((p) => (
                    <div 
                      key={p.value}
                      onClick={() => togglePermission(p.value)}
                      className="flex items-center space-x-2 cursor-pointer group"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${formData.permissions.includes(p.value) ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-white/10 group-hover:border-white/20'}`}>
                        {formData.permissions.includes(p.value) && <i className="fas fa-check text-[7px] text-white"></i>}
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <i className={`fas ${p.icon} text-[8px] ${formData.permissions.includes(p.value) ? 'text-emerald-400' : 'text-slate-500 opacity-40'} transition-colors`}></i>
                        <span className={`text-[7px] font-black uppercase tracking-widest transition-colors ${formData.permissions.includes(p.value) ? 'text-slate-100' : 'text-slate-500'}`}>{p.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-blue-500/10 bg-[#0f172a]/95 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button 
                type="submit" 
                className="w-full glossy-button text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                <i className={`fas ${editingUserId ? 'fa-save' : 'fa-check-circle'} text-[11px] pointer-events-none`}></i>
                <span>{editingUserId ? 'SIMPAN PERUBAHAN' : 'SAHKAN STAFF'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
