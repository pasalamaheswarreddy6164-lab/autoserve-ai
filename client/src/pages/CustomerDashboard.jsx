import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import ChatWidget from '../components/common/ChatWidget';
import CaseCard from '../components/common/CaseCard';
import SubmitCase from '../components/customer/SubmitCase';
import CaseDetail from '../components/customer/CaseDetail';
import api from '../api/axios';
import { Plus, LayoutDashboard, ListChecks, Calendar, X, Car, Wrench, Zap, AlertTriangle } from 'lucide-react';
import { CATEGORY_CONFIG, STATUS_CONFIG, formatDate } from '../utils/helpers';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState('dashboard');
  const [cases, setCases] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCasesPanel, setShowCasesPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [casesRes, schRes] = await Promise.all([
        api.get('/cases'),
        api.get('/schedule'),
      ]);
      setCases(casesRes.data);
      setSchedules(schRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeCases = cases.filter(c => !['closed'].includes(c.status));
  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === 'open').length,
    inProgress: cases.filter(c => ['assigned', 'in_progress'].includes(c.status)).length,
    scheduled: cases.filter(c => c.status === 'scheduled').length,
    resolved: cases.filter(c => ['resolved', 'closed'].includes(c.status)).length,
  };

  if (selectedCase) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar onCasesClick={() => setShowCasesPanel(true)} />
        <CaseDetail
          caseItem={selectedCase}
          portal="customer"
          onBack={() => { setSelectedCase(null); fetchData(); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar onCasesClick={() => setShowCasesPanel(true)} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage your vehicle service requests</p>
          </div>
          <button
            onClick={() => setView('submit')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Service Request
          </button>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-0">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'cases', label: `My Cases (${activeCases.length})`, icon: ListChecks },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                view === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Submit Case */}
        {view === 'submit' && (
          <SubmitCase onSuccess={(c) => { fetchData(); setSelectedCase(c); setView('dashboard'); }} onCancel={() => setView('dashboard')} />
        )}

        {/* Dashboard view */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Cases', value: stats.total, icon: '📋', color: 'text-slate-300' },
                { label: 'Open', value: stats.open, icon: '🔓', color: 'text-yellow-400' },
                { label: 'In Progress', value: stats.inProgress, icon: '⚙️', color: 'text-purple-400' },
                { label: 'Scheduled', value: stats.scheduled, icon: '📅', color: 'text-cyan-400' },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Problem categories info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { cat: 'critical', icon: AlertTriangle, desc: 'Safety-critical issues requiring immediate attention' },
                { cat: 'mechanical', icon: Wrench, desc: 'Engine, transmission, and drivetrain problems' },
                { cat: 'electrical_diagnostic', icon: Zap, desc: 'Electrical systems, sensors, and diagnostics' },
              ].map(({ cat, icon: Icon, desc }) => {
                const cfg = CATEGORY_CONFIG[cat];
                const count = cases.filter(c => c.category === cat).length;
                return (
                  <div key={cat} className={`card border ${cfg.border} ${cfg.bg}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</h3>
                        <p className="text-xs text-slate-400">{count} case{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent cases */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">Recent Cases</h2>
                <button onClick={() => setView('cases')} className="text-sm text-blue-400 hover:text-blue-300">View all</button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : cases.length === 0 ? (
                <div className="card text-center py-10">
                  <Car className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No service requests yet</p>
                  <button onClick={() => setView('submit')} className="btn-primary mt-3 text-sm">Submit your first request</button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {cases.slice(0, 3).map(c => (
                    <CaseCard key={c.id} caseItem={c} onClick={setSelectedCase} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cases list */}
        {view === 'cases' && (
          <div>
            <h2 className="font-semibold text-white mb-4">All Cases ({cases.length})</h2>
            {cases.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-slate-400">No cases found</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {cases.map(c => (
                  <CaseCard key={c.id} caseItem={c} onClick={setSelectedCase} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule */}
        {view === 'schedule' && (
          <div>
            <h2 className="font-semibold text-white mb-4">Upcoming Appointments ({schedules.length})</h2>
            {schedules.length === 0 ? (
              <div className="card text-center py-10">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No appointments scheduled</p>
                <p className="text-xs text-slate-500 mt-1">Use the AI assistant to schedule service</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {schedules.map(s => {
                  const cfg = CATEGORY_CONFIG[s.category] || CATEGORY_CONFIG.mechanical;
                  return (
                    <div key={s.id} className={`card border-l-4 ${s.category === 'critical' ? 'border-l-red-500' : s.category === 'mechanical' ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{s.case_title}</h3>
                          <p className="text-sm text-blue-400 mt-1">📅 {formatDate(s.scheduled_at)}</p>
                          <p className="text-sm text-slate-400">🔧 {s.service_type}</p>
                          <p className="text-sm text-slate-400">📍 {s.location}</p>
                          {s.agent_name && <p className="text-sm text-slate-400">👤 Agent: {s.agent_name}</p>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          s.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          s.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>{s.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cases slide-over panel */}
      {showCasesPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCasesPanel(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="font-semibold text-white">Active Cases ({activeCases.length})</h2>
              <button onClick={() => setShowCasesPanel(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeCases.map(c => (
                <CaseCard key={c.id} caseItem={c} onClick={(c) => { setSelectedCase(c); setShowCasesPanel(false); }} />
              ))}
              {activeCases.length === 0 && (
                <p className="text-center text-slate-400 py-8">No active cases</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat widget - needs selected case */}
      {selectedCase && (
        <ChatWidget caseId={selectedCase.id} portal="customer" caseTitle={selectedCase.title} />
      )}
    </div>
  );
}
