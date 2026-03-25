import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Car, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import api from '../../api/axios';

export default function Navbar({ onCasesClick }) {
  const { user, logout } = useAuth();
  const [count, setCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCount = async () => {
    try {
      const res = await api.get('/cases/count');
      setCount(res.data.count);
    } catch {}
  };

  return (
    <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      {/* Logo */}
      <Link to={user?.role === 'agent' ? '/agent' : '/customer'} className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Car className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-white text-lg">AutoServe AI</span>
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
          {user?.role === 'agent' ? 'Agent' : 'Customer'}
        </span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Cases badge */}
        <button
          onClick={onCasesClick}
          className="relative flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Cases</span>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-slate-300 max-w-[120px] truncate">{user?.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50">
              <div className="px-3 py-2 border-b border-slate-700">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-b-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
