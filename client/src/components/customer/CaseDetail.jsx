import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import ChatWidget from '../common/ChatWidget';
import { CATEGORY_CONFIG, STATUS_CONFIG, formatDate, BOT_CONFIG } from '../../utils/helpers';
import { ArrowLeft, Car, Calendar, User, MessageSquare, Shield } from 'lucide-react';

export default function CaseDetail({ caseItem, portal, onBack }) {
  const [caseData, setCaseData] = useState(caseItem);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/cases/${caseItem.id}`)
      .then(res => setCaseData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caseItem.id]);

  const cat = CATEGORY_CONFIG[caseData.category] || CATEGORY_CONFIG.mechanical;
  const stat = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.open;
  const vehicle = caseData.vehicle_info || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-4">
          {/* Case header */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
                    {cat.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.badge}`}>
                    {stat.label}
                  </span>
                  {caseData.priority === 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                      🔴 High Priority
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-white">{caseData.title}</h1>
                <p className="text-slate-400 text-sm mt-1">{caseData.description}</p>
              </div>
              {caseData.image_url && (
                <img src={caseData.image_url} alt="Vehicle" className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-slate-600" />
              )}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700 text-xs text-slate-500">
              <span>Case #{caseData.id}</span>
              <span>Created {formatDate(caseData.created_at)}</span>
              {caseData.agent_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {caseData.agent_name}</span>}
            </div>
          </div>

          {/* AI Diagnosis */}
          {caseData.ai_diagnosis && (
            <div className="card bg-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔧</span>
                <h3 className="font-semibold text-orange-400 text-sm">AI Diagnosis</h3>
              </div>
              <p className="text-sm text-slate-300">{caseData.ai_diagnosis}</p>
            </div>
          )}

          {/* Warranty status */}
          {caseData.warranty_status && caseData.warranty_status !== 'unknown' && (
            <div className={`card ${
              caseData.warranty_status.includes('active') || caseData.warranty_status === 'likely_active'
                ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${
                  caseData.warranty_status.includes('active') ? 'text-green-400' : 'text-slate-400'
                }`} />
                <p className="text-sm font-medium text-white">
                  Warranty: {' '}
                  <span className={caseData.warranty_status.includes('active') ? 'text-green-400' : 'text-red-400'}>
                    {caseData.warranty_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Appointment */}
          {caseData.appointments?.length > 0 && (
            <div className="card bg-cyan-500/5 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-cyan-400 text-sm">Scheduled Appointment</h3>
              </div>
              {caseData.appointments.map(a => (
                <div key={a.id} className="text-sm space-y-1">
                  <p className="text-white font-medium">{formatDate(a.scheduled_at)}</p>
                  <p className="text-slate-400">Service: {a.service_type}</p>
                  <p className="text-slate-400">📍 {a.location}</p>
                  {a.notes && <p className="text-slate-400">Notes: {a.notes}</p>}
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                    a.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chat history */}
          {caseData.messages?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversation History ({caseData.messages.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {caseData.messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${
                      m.sender_role === 'ai' ? 'bg-slate-700 text-slate-100' : 'bg-blue-600 text-white'
                    }`}>
                      {m.sender_role === 'ai' && m.ai_bot && (
                        <p className={`text-xs font-medium mb-1 ${(BOT_CONFIG[m.ai_bot] || {}).color || 'text-slate-400'}`}>
                          {(BOT_CONFIG[m.ai_bot] || {}).icon} {m.ai_bot}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Vehicle Info */}
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" />
              Vehicle Info
            </h3>
            {vehicle.make || vehicle.year ? (
              <div className="space-y-2 text-sm">
                {vehicle.year && <div className="flex justify-between"><span className="text-slate-400">Year</span><span className="text-white">{vehicle.year}</span></div>}
                {vehicle.make && <div className="flex justify-between"><span className="text-slate-400">Make</span><span className="text-white">{vehicle.make}</span></div>}
                {vehicle.model && <div className="flex justify-between"><span className="text-slate-400">Model</span><span className="text-white">{vehicle.model}</span></div>}
                {vehicle.mileage && <div className="flex justify-between"><span className="text-slate-400">Mileage</span><span className="text-white">{vehicle.mileage?.toLocaleString()}</span></div>}
                {vehicle.vin && <div className="flex justify-between"><span className="text-slate-400">VIN</span><span className="text-white text-xs">{vehicle.vin}</span></div>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No vehicle info provided</p>
            )}
          </div>

          {/* Case timeline */}
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Case Timeline</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-400">Submitted</span>
                <span className="text-slate-500 ml-auto">{formatDate(caseData.created_at)}</span>
              </div>
              {caseData.assigned_agent && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-slate-400">Assigned to {caseData.agent_name}</span>
                </div>
              )}
              {caseData.status === 'scheduled' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className="text-slate-400">Appointment Scheduled</span>
                </div>
              )}
              {['resolved', 'closed'].includes(caseData.status) && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-slate-400">Resolved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat widget */}
      <ChatWidget caseId={caseData.id} portal={portal} caseTitle={caseData.title} />
    </div>
  );
}
