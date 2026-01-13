
import React, { useState } from 'react';
import { User } from '../types';
import { LogoIcon } from '../App';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  isLightMode?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, users, isLightMode }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay for premium feel
    setTimeout(() => {
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Akses ditolak. Periksa kredensial Anda.');
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-['Plus_Jakarta_Sans'] transition-colors duration-500 ${isLightMode ? 'bg-[var(--blueprint-paper)]' : 'bg-[#050b1a]'}`}>
      
      {/* 🌌 Animated Background Elements - Hidden in light mode for cleaner blueprint look */}
      {!isLightMode && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700 pointer-events-none"></div>
        </>
      )}

      {/* Blueprint Grid Lines for Light Mode */}
      {isLightMode && (
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}></div>
      )}

      <div className="w-full max-w-[420px] relative z-10">
        
        {/* 🏛️ Branding Header */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-6 duration-1000">
          <div className="relative mb-6">
            {!isLightMode && <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>}
            <LogoIcon className="w-24 h-24 md:w-28 md:h-28 relative z-10" />
          </div>
          <h1 className={`text-2xl md:text-3xl font-black tracking-[0.25em] uppercase leading-none text-center drop-shadow-2xl ${isLightMode ? 'text-black' : 'text-white'}`}>
            MARTAJASAH
          </h1>
          <div className={`h-px w-12 my-3 ${isLightMode ? 'bg-black/20' : 'bg-blue-500/40'}`}></div>
          <p className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] opacity-90 text-center ${isLightMode ? 'text-black/60' : 'text-blue-400/80'}`}>
            Kitchen Intelligence System
          </p>
        </div>

        {/* 🥛 Main Login Card */}
        <div className={`p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 glass-panel ${isLightMode ? 'border-dashed border-2 border-black bg-[var(--ivory-white)] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'border-blue-500/20 bg-slate-900/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'}`}>
          
          {/* Subtle top light reflection - Dark only */}
          {!isLightMode && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>}
          
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            
            {/* Username Input */}
            <div className="space-y-3">
              <label className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 flex items-center ${isLightMode ? 'text-black/80' : 'text-blue-400'}`}>
                <span className={`w-1 h-1 rounded-full mr-2 ${isLightMode ? 'bg-black' : 'bg-blue-500'}`}></span>
                Staff Username
              </label>
              <div className="relative group">
                <span className={`absolute left-6 top-1/2 -translate-y-1/2 transition-all duration-300 ${isLightMode ? 'text-black/30 group-focus-within:text-black' : 'text-blue-500/30 group-focus-within:text-blue-400'}`}>
                  <i className="fas fa-id-badge text-sm"></i>
                </span>
                <input 
                  required
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Input username..."
                  className={`w-full rounded-2xl px-14 py-5 text-sm outline-none font-bold transition-all ${isLightMode ? 'bg-[var(--ivory-white)] border-2 border-dashed border-black text-black focus:border-solid focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-black/20' : 'bg-[#0a1128]/60 border border-white/5 text-white focus:border-blue-500/50 focus:bg-[#0a1128]/80 focus:ring-4 focus:ring-blue-500/5 placeholder:text-white/10'}`}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-3">
              <label className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 flex items-center ${isLightMode ? 'text-black/80' : 'text-blue-400'}`}>
                <span className={`w-1 h-1 rounded-full mr-2 ${isLightMode ? 'bg-black' : 'bg-blue-500'}`}></span>
                Secure Key
              </label>
              <div className="relative group">
                <span className={`absolute left-6 top-1/2 -translate-y-1/2 transition-all duration-300 ${isLightMode ? 'text-black/30 group-focus-within:text-black' : 'text-blue-500/30 group-focus-within:text-blue-400'}`}>
                  <i className="fas fa-shield-halved text-sm"></i>
                </span>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-2xl px-14 py-5 text-sm outline-none font-bold transition-all ${isLightMode ? 'bg-[var(--ivory-white)] border-2 border-dashed border-black text-black focus:border-solid focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-black/20' : 'bg-[#0a1128]/60 border border-white/5 text-white focus:border-blue-500/50 focus:bg-[#0a1128]/80 focus:ring-4 focus:ring-blue-500/5 placeholder:text-white/10'}`}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`p-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-top-2 duration-500 ${isLightMode ? 'bg-black/5 border-2 border-dashed border-black' : 'bg-red-500/5 border border-red-500/20'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isLightMode ? 'bg-black/10' : 'bg-red-500/10'}`}>
                  <i className={`fas fa-exclamation-triangle text-[10px] ${isLightMode ? 'text-black' : 'text-red-500'}`}></i>
                </div>
                <p className={`text-[9px] font-black uppercase tracking-widest leading-relaxed ${isLightMode ? 'text-black' : 'text-red-400'}`}>{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-300 active:scale-[0.97] flex items-center justify-center mt-2 group/btn ${isLightMode ? 'bg-white border-2 border-black text-black hover:bg-black/5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]' : 'glossy-button text-white shadow-[0_15px_30px_-5px_rgba(59,130,246,0.4)] hover:shadow-blue-500/60 hover:-translate-y-1 border border-white/10'}`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <i className="fas fa-spinner fa-spin text-lg"></i>
                  <span className="text-[8px] font-black text-black">AUTHENTICATING...</span>
                </div>
              ) : (
                <span className={`flex items-center ${isLightMode ? 'text-black' : 'text-white'}`}>
                  AUTHORIZE ACCESS <i className={`fas fa-chevron-right ml-4 text-[8px] opacity-40 group-hover/btn:translate-x-2 transition-transform duration-500`}></i>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* 🏛️ Footer Credits */}
        <div className="mt-12 text-center animate-in fade-in duration-1000 delay-500">
           <p className={`text-[8px] font-black uppercase tracking-[0.3em] opacity-40 flex items-center justify-center space-x-2 ${isLightMode ? 'text-black' : 'text-slate-500'}`}>
             <i className="fas fa-copyright"></i>
             <span>2026 AKSARA CIPTA DIGITAL — SPPG MARTAJASAH</span>
           </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
