import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import CaseCard from '../components/common/CaseCard';
import CaseDetail from '../components/customer/CaseDetail';
import api from '../api/axios';
import { LayoutDashboard, ListChecks, Calendar, Users, X, Toggle, CheckCircle, XCircle, Wrench, Zap, AlertTriangle } from 'lucide-react';
import { CATEGORY_CONFIG, STATUS_CONFIG, formatDate } from '../utils/helpers';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState('dashboard');
  const [cases, setCases] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCasesPanel, setShowCasesPanel] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingAvail, setUpdatingAvail] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [casesRes, schRes, agentsRes] = await Promise.all([
        api.get('/cases'),
        api.get('/schedule'),
        api.get('/agents'),
      ]);
      setCases(casesRes.data);
      setSchedules(schRes.data);
      setAgents(agentsRes.data);

      // Get own availability
      const me = agentsRes.data.find(a => a.id === user.id);
      if (me) setIsAvailable(me.is_available);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleAvailability = async () => {
    setUpdatingAvail(true);
    try {
      await api.patch('/agents/availability', { isAvailable: !isAvailable });
      setIsAvailable(!isAvailable);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAvail(false);
    }
  };

  const updateCaseStatus = async (caseId, status) => {
    try {
      await api.patch(`/cases/${caseId}/status`, { status });
      fetchData();
      if (selectedCase?.id === caseId) {
        setSelectedCase(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeCases = cases.filter(c => !['resolved', 'closed'].includes(c.status));
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
        <div className="max-w-5xl mx-auto px-4 py-4">
          {/* Status update bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => { setSelectedCase(null); fetchData(); }} className="text-slate-400 hover:text-white mr-2">← Back</button>
            <span className="text-sm text-slate-400">Update status:</span>
            {['in_progress', 'scheduled', 'resolved', 'closed'].map(s => (
              <button
                key={s}
                onClick={() => updateCaseStatus(selectedCase.id, s)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  selectedCase.status === s
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
        </div>
        <CaseDetail
          caseItem={selectedCase}
          portal="agent"
          onBack={() => { setSelectedCase(null); fetchData(); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar onCasesClick={() => setShowCasesPanel(true)} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header with availability toggle */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Agent Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Welcome back, {user?.name}</p>
          </div>

          {/* Availability toggle */}
          <button
            onClick={toggleAvailability}
            disabled={updatingAvail}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-medium transition-all ${
              isAvailable
                ? 'border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
            }`}
          >
            {isAvailable ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {updatingAvail ? 'Updating...' : isAvailable ? 'Available' : 'Unavailable'}
          </button>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'cases', label: `Cases (${activeCases.length})`, icon: ListChecks },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
            { id: 'team', label: 'Team', icon: Users },
          ].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                view === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total', value: stats.total, color: 'text-slate-300', icon: '📋' },
                { label: 'Open', value: stats.open, color: 'text-yellow-400', icon: '🔓' },
                { label: 'In Progress', value: stats.inProgress, color: 'text-purple-400', icon: '⚙️' },
                { label: 'Scheduled', value: stats.scheduled, color: 'text-cyan-400', icon: '📅' },
                { label: 'Resolved', value: stats.resolved, color: 'text-green-400', icon: '✅' },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Priority queue */}
            <div>
              <h2 className="font-semibold text-white mb-3">
                🔴 Priority Queue
                {activeCases.filter(c => c.priority === 1).length > 0 && (
                  <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {activeCases.filter(c => c.priority === 1).length} Critical
                  </span>
                )}
              </h2>
              {activeCases.filter(c => c.priority === 1).length === 0 ? (
                <div className="card text-center py-6 text-slate-500 text-sm">No critical cases 🎉</div>
              ) : (
                <div className="grid gap-3">
                  {activeCases.filter(c => c.priority === 1).map(c => (
                    <CaseCard key={c.id} caseItem={c} onClick={setSelectedCase} showCustomer />
                  ))}
                </div>
              )}
            </div>

            {/* Recent cases */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">Recent Assigned Cases</h2>
                <button onClick={() => setView('cases')} className="text-sm text-blue-400 hover:text-blue-300">View all</button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : cases.length === 0 ? (
                <div className="card text-center py-8 text-slate-400">No cases assigned yet</div>
              ) : (
                <div className="grid gap-3">
                  {cases.slice(0, 4).map(c => (
                    <CaseCard key={c.id} caseItem={c} onClick={setSelectedCase} showCustomer />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Cases */}
        {view === 'cases' && (
          <div>
            {/* Filter bar */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'open', 'in_progress', 'scheduled', 'resolved'].map(f => (
                <button key={f}
                  onClick={() => {}}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-slate-500 transition-colors capitalize">
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              {cases.map(c => (
                <CaseCard key={c.id} caseItem={c} onClick={setSelectedCase} showCustomer />
              ))}
            </div>
            {cases.length === 0 && (
              <div className="card text-center py-10 text-slate-400">No cases assigned</div>
            )}
          </div>
        )}

        {/* Schedule */}
        {view === 'schedule' && (
          <div>
            <h2 className="font-semibold text-white mb-4">My Schedule ({schedules.length})</h2>
            {schedules.length === 0 ? (
              <div className="card text-center py-10">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No appointments scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map(s => (
                  <div key={s.id} className="card flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{s.case_title}</h3>
                      <p className="text-sm text-blue-400 mt-1">📅 {formatDate(s.scheduled_at)}</p>
                      <p className="text-sm text-slate-400">🔧 {s.service_type}</p>
                      <p className="text-sm text-slate-400">📍 {s.location}</p>
                      {s.customer_name && <p className="text-sm text-slate-400">👤 Customer: {s.customer_name}</p>}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        s.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        s.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>{s.status}</span>
                      {s.status === 'pending' && (
                        <button
                          onClick={() => api.patch(`/schedule/${s.id}`, { status: 'confirmed' }).then(fetchData)}
                          className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full hover:bg-green-500/30 transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team view */}
        {view === 'team' && (
          <div>
            <h2 className="font-semibold text-white mb-4">Service Team ({agents.length})</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {agents.map(a => {
                const specCfg = CATEGORY_CONFIG[a.specialty] || CATEGORY_CONFIG.mechanical;
                return (
                  <div key={a.id} className="card flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      a.is_available ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {a.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{a.full_name}</h3>
                        <span className={`w-2 h-2 rounded-full ${a.is_available ? 'bg-green-500' : 'bg-slate-500'}`} />
                      </div>
                      <p className="text-xs text-slate-400">{a.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${specCfg.badge}`}>
                          {specCfg.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {a.active_cases} active cases
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${a.is_available ? 'text-green-400' : 'text-slate-500'}`}>
                        {a.is_available ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cases slide-over panel */}
      {showCasesPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCasesPanel(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="font-semibold text-white">Active Cases ({activeCases.length})</h2>
              <button onClick={() => setShowCasesPanel(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeCases.map(c => (
                <CaseCard key={c.id} caseItem={c} showCustomer
                  onClick={(c) => { setSelectedCase(c); setShowCasesPanel(false); }} />
              ))}
              {activeCases.length === 0 && <p className="text-center text-slate-400 py-8">No active cases</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
