
import React, { useState, useEffect } from 'react';
import { ViewState, StockItem, Transaction, MenuPlan, Procurement, Distribution, User, UserPermission, Volunteer } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import MenuPlanning from './components/MenuPlanning';
import ProcurementList from './components/Procurement';
import DistributionList from './components/Distribution';
import UserManagement from './components/UserManagement';
import VolunteerManagement from './components/VolunteerManagement';
import Login from './components/Login';
import { supabaseService } from './services/supabaseService';

const INITIAL_STOCK: StockItem[] = [
  { id: '1', name: 'Beras Premium', category: 'Karbohidrat', itemType: 'BAHAN', quantity: 150, unit: 'kg', minThreshold: 50, lastUpdated: new Date().toISOString() },
  { id: '2', name: 'Telur Ayam', category: 'Protein Hewani', itemType: 'BAHAN', quantity: 200, unit: 'butir', minThreshold: 50, lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Daging Ayam', category: 'Protein Hewani', itemType: 'BAHAN', quantity: 25, unit: 'kg', minThreshold: 10, lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Tempe Kedelai', category: 'Protein Nabati', itemType: 'BAHAN', quantity: 40, unit: 'papan', minThreshold: 10, lastUpdated: new Date().toISOString() },
  { id: '5', name: 'Tahu Putih', category: 'Protein Nabati', itemType: 'BAHAN', quantity: 100, unit: 'potong', minThreshold: 20, lastUpdated: new Date().toISOString() },
  { id: '6', name: 'Sayur Bayam', category: 'Sayuran', itemType: 'BAHAN', quantity: 30, unit: 'ikat', minThreshold: 5, lastUpdated: new Date().toISOString() },
  { id: '7', name: 'Pisang Ambon', category: 'Buah Atau Susu', itemType: 'BAHAN', quantity: 50, unit: 'sisir', minThreshold: 10, lastUpdated: new Date().toISOString() },
  { id: '8', name: 'Susu UHT 200ml', category: 'Buah Atau Susu', itemType: 'BAHAN', quantity: 120, unit: 'kotak', minThreshold: 30, lastUpdated: new Date().toISOString() },
  { id: '9', name: 'Wajan Stainless', category: 'Masak', itemType: 'ALAT', quantity: 5, unit: 'unit', minThreshold: 2, lastUpdated: new Date().toISOString() },
];

const MASTER_ADMIN: User = {
  id: 'master-admin',
  username: 'aslap',
  password: 'Seppolo10@',
  fullName: 'Moh. Fuadi',
  role: 'ADMIN',
  permissions: ['CAN_RECEIVE', 'CAN_ORDER', 'CAN_DISTRIBUTE', 'CAN_MANAGE_STOCK', 'CAN_CREATE_MENU']
};

export const LogoIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center group`}>
    <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20"></div>
    <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 filter drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="rgba(15, 23, 42, 0.4)" stroke="url(#logoGrad)" strokeWidth="2" />
      <path d="M35 50 C35 35 65 35 65 50 L65 65 L35 65 Z" fill="white" stroke="white" strokeWidth="1" />
      <circle cx="35" cy="45" r="8" fill="white" />
      <circle cx="50" cy="38" r="10" fill="white" />
      <circle cx="65" cy="45" r="8" fill="white" />
      <path d="M35 60 H65 V68 Q50 72 35 68 Z" fill="url(#logoGrad)" />
    </svg>
  </div>
);

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => {
    try { return JSON.parse(localStorage.getItem('sppg_users') || JSON.stringify([MASTER_ADMIN])); } catch(e) { return [MASTER_ADMIN]; }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('sppg_current_user') || 'null'); } catch(e) { return null; }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!currentUser);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(() => localStorage.getItem('sppg_theme') === 'light');
  
  const [stock, setStock] = useState<StockItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('sppg_stock') || JSON.stringify(INITIAL_STOCK)); } catch(e) { return INITIAL_STOCK; }
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [menuPlans, setMenuPlans] = useState<MenuPlan[]>([]);
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [schoolNames, setSchoolNames] = useState<string[]>([]);

  useEffect(() => {
    if (isLightMode) document.documentElement.classList.add('light-mode');
    else document.documentElement.classList.remove('light-mode');
    localStorage.setItem('sppg_theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  useEffect(() => {
    const initData = async () => {
      if (supabaseService.isConfigured()) {
        const data = await supabaseService.fetchAll();
        if (data) {
          if (data.users?.length) setUsers(data.users);
          if (data.stock?.length) setStock(data.stock);
          if (data.transactions?.length) setTransactions(data.transactions);
          if (data.menuPlans?.length) setMenuPlans(data.menuPlans);
          if (data.procurements?.length) setProcurements(data.procurements);
          if (data.distributions?.length) setDistributions(data.distributions);
          if (data.volunteers?.length) setVolunteers(data.volunteers);
        }
      }
    };
    initData();
  }, []);

  useEffect(() => { localStorage.setItem('sppg_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('sppg_stock', JSON.stringify(stock)); }, [stock]);
  useEffect(() => { localStorage.setItem('sppg_distributions', JSON.stringify(distributions)); }, [distributions]);

  if (!isAuthenticated) return <Login onLoginSuccess={(u) => { setCurrentUser(u); setIsAuthenticated(true); localStorage.setItem('sppg_current_user', JSON.stringify(u)); }} users={users} isLightMode={isLightMode} />;

  const userHasPermission = (perm: UserPermission) => currentUser?.role === 'ADMIN' || (currentUser?.permissions || []).includes(perm);

  return (
    <div className={`flex flex-col md:flex-row h-screen h-dvh ${isLightMode ? 'bg-transparent' : 'bg-[#0a1128]'} text-slate-100 overflow-hidden transition-colors duration-500`}>
      
      <aside className="hidden md:flex flex-col w-60 glass-panel m-3 rounded-[2rem] p-6 shrink-0 border-blue-500/10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col items-center mb-8 px-2 group">
          <LogoIcon className="w-16 h-16 mb-4 hover:scale-105 transition-transform duration-500" />
          <div className="text-center">
            <h1 className="font-black text-lg text-white tracking-[0.1em] uppercase leading-none">MARTAJASAH</h1>
            <p className="text-[7px] text-blue-400 uppercase font-black tracking-[0.3em] mt-2 opacity-80">Kitchen Management</p>
          </div>
        </div>

        <div className="flex flex-col items-center mb-6 space-y-2">
            <div className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 w-full justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">TEMA</span>
                <label className="theme-switch">
                    <input type="checkbox" checked={isLightMode} onChange={() => setIsLightMode(!isLightMode)} />
                    <span className="slider"><i className="fas fa-moon"></i><i className="fas fa-sun"></i></span>
                </label>
            </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-house' },
            { id: 'distribution', label: 'Distribusi', icon: 'fa-truck-fast' },
            { id: 'inventory', label: 'Stok Barang', icon: 'fa-boxes-stacked' },
            { id: 'procurement', label: 'Pembelian', icon: 'fa-receipt' },
            { id: 'menu', label: 'Rencana Menu', icon: 'fa-calendar-day' },
            { id: 'volunteers', label: 'Tim Relawan', icon: 'fa-handshake-angle' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as ViewState)} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${activeView === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <i className={`fas ${item.icon} w-5 text-sm`}></i>
              <span className="font-bold text-[11px] uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
          {currentUser?.role === 'ADMIN' && (
            <button onClick={() => setActiveView('user-management')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all ${activeView === 'user-management' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
              <i className="fas fa-users-gear w-5 text-sm"></i>
              <span className="font-bold text-[11px] uppercase tracking-wider">Akses Staff</span>
            </button>
          )}
        </nav>

        <div className="p-4 glass-panel border-0 bg-blue-900/20 rounded-2xl mt-6 flex items-center justify-between">
           <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30 shrink-0"><i className="fas fa-user text-xs text-blue-400"></i></div>
              <div className="min-w-0"><p className="text-[10px] font-bold text-white truncate">{currentUser?.fullName}</p><p className="text-[7px] text-blue-400 font-black uppercase">{currentUser?.role}</p></div>
           </div>
           <button onClick={() => { setCurrentUser(null); setIsAuthenticated(false); }} className="text-slate-500 hover:text-red-400 transition-colors p-2"><i className="fas fa-power-off text-sm"></i></button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="md:hidden glass-nav px-4 py-3.5 z-50 shrink-0 flex justify-between items-center shadow-xl">
           <div className="flex items-center space-x-3">
             <LogoIcon className="w-10 h-10" />
             <span className="font-black text-sm uppercase tracking-widest text-white">MARTAJASAH</span>
           </div>
           <div className="flex items-center space-x-4">
             <label className="theme-switch scale-[0.8]">
                 <input type="checkbox" checked={isLightMode} onChange={() => setIsLightMode(!isLightMode)} />
                 <span className="slider"><i className="fas fa-moon"></i><i className="fas fa-sun"></i></span>
             </label>
             <button onClick={() => { setCurrentUser(null); setIsAuthenticated(false); }} className="text-slate-400 bg-white/5 w-8 h-8 rounded-xl flex items-center justify-center border border-white/10"><i className="fas fa-power-off text-xs"></i></button>
           </div>
        </header>

        <main className="flex-1 overflow-hidden py-4 px-4 md:p-8 flex flex-col pb-[100px] md:pb-8">
          <div className="flex-1 overflow-hidden flex flex-col max-w-6xl mx-auto w-full">
            {activeView === 'dashboard' && (
                <Dashboard 
                    stock={stock} transactions={transactions} distributions={distributions} menuPlans={menuPlans} procurements={procurements} schoolNames={schoolNames}
                    setTransactions={setTransactions} setMenuPlans={setMenuPlans} setProcurements={setProcurements} setDistributions={setDistributions} setSchoolNames={setSchoolNames}
                    onNavigate={(v, id) => { setActiveView(v); setHighlightId(id); setTimeout(() => setHighlightId(null), 2000); }} 
                />
            )}
            {activeView === 'inventory' && <Inventory stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} highlightId={highlightId} currentUsername={currentUser?.username} canManageStock={userHasPermission('CAN_MANAGE_STOCK')} />}
            {activeView === 'menu' && <MenuPlanning stock={stock} menuPlans={menuPlans} setMenuPlans={setMenuPlans} procurements={procurements} onProcurementRequest={(m) => setActiveView('procurement')} currentUsername={currentUser?.username} canCreateMenu={userHasPermission('CAN_CREATE_MENU')} canOrder={userHasPermission('CAN_ORDER')} />}
            {activeView === 'procurement' && <ProcurementList stock={stock} procurements={procurements} setProcurements={setProcurements} highlightId={highlightId} currentUsername={currentUser?.username} canOrder={userHasPermission('CAN_ORDER')} canReceive={userHasPermission('CAN_RECEIVE')} />}
            {activeView === 'distribution' && (
              <DistributionList 
                distributions={distributions} 
                setDistributions={setDistributions} 
                canManage={userHasPermission('CAN_DISTRIBUTE')} 
                canProcess={userHasPermission('CAN_DISTRIBUTE')}
                currentUser={currentUser}
                highlightId={highlightId}
              />
            )}
            {activeView === 'volunteers' && <VolunteerManagement volunteers={volunteers} setVolunteers={setVolunteers} users={users} setUsers={setUsers} isAdmin={currentUser?.role === 'ADMIN'} />}
            {activeView === 'user-management' && <UserManagement users={users} setUsers={setUsers} />}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav z-[100] h-[85px] pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-around px-2 border-t border-blue-500/10 shadow-2xl">
        {[
          { id: 'distribution', label: 'Distribusi', icon: 'fa-truck-fast' },
          { id: 'inventory', label: 'Stok', icon: 'fa-boxes-stacked' },
          { id: 'dashboard', label: 'Beranda', icon: 'fa-house' },
          { id: 'procurement', label: 'Beli', icon: 'fa-receipt' },
          { id: 'menu', label: 'Menu', icon: 'fa-calendar-day' }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveView(item.id as ViewState)} className={`flex flex-col items-center justify-center flex-1 transition-all ${activeView === item.id ? 'text-blue-400' : 'text-slate-500'}`}>
            <i className={`fas ${item.icon} text-lg mb-1`}></i>
            <span className="text-[8px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
