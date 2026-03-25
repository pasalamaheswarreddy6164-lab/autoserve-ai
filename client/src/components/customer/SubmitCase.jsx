import React, { useState, useRef } from 'react';
import api from '../../api/axios';
import { Upload, X, AlertTriangle, Wrench, Zap, Car, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'critical',
    label: 'Critical / Safety',
    icon: AlertTriangle,
    desc: 'Brakes, steering failure, airbag warning, engine seizure',
    color: 'text-red-400',
    border: 'border-red-500',
    bg: 'bg-red-500/10',
  },
  {
    id: 'mechanical',
    label: 'Mechanical',
    icon: Wrench,
    desc: 'Engine noise, transmission, exhaust, cooling, suspension',
    color: 'text-orange-400',
    border: 'border-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    id: 'electrical_diagnostic',
    label: 'Electrical / Diagnostic',
    icon: Zap,
    desc: 'Dashboard warning lights, battery, sensors, infotainment',
    color: 'text-blue-400',
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
  },
];

export default function SubmitCase({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    make: '', model: '', year: '', vin: '', mileage: '',
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: details, 2: vehicle, 3: review
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return setError('Title and description are required');
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      if (image) fd.append('image', image);
      fd.append('vehicleInfo', JSON.stringify({
        make: form.make, model: form.model, year: form.year ? parseInt(form.year) : null,
        vin: form.vin, mileage: form.mileage ? parseInt(form.mileage) : null,
      }));

      const res = await api.post('/cases', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">←</button>
        <div>
          <h2 className="text-xl font-bold text-white">New Service Request</h2>
          <p className="text-slate-400 text-sm">AI will automatically categorize and assign your issue</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                s === step ? 'bg-blue-600 text-white' : s < step ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {s < step ? '✓' : s} {['Issue Details', 'Vehicle Info', 'Review'][s - 1]}
            </div>
            {s < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Issue details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Issue Title *</label>
              <input className="input" placeholder="e.g., Strange noise from engine when accelerating"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Category (optional - AI will auto-detect)</label>
              <div className="grid grid-cols-1 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: f.category === cat.id ? '' : cat.id }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      form.category === cat.id ? `${cat.border} ${cat.bg}` : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <cat.icon className={`w-5 h-5 ${cat.color} flex-shrink-0`} />
                    <div>
                      <p className={`text-sm font-medium ${form.category === cat.id ? cat.color : 'text-white'}`}>{cat.label}</p>
                      <p className="text-xs text-slate-400">{cat.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Describe the Problem *</label>
              <textarea
                className="input resize-none h-28"
                placeholder="Describe what you're experiencing in detail. When did it start? Any warning lights? Any unusual sounds or smells?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Upload Photo (optional)</label>
              <div
                onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                {preview ? (
                  <div className="relative inline-block">
                    <img src={preview} alt="Preview" className="h-32 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setImage(null); setPreview(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Click to upload vehicle photo</p>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <button type="button" onClick={() => setStep(2)} disabled={!form.title || !form.description}
              className="btn-primary w-full">Next: Vehicle Info</button>
          </div>
        )}

        {/* Step 2: Vehicle info */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="card bg-blue-500/5 border-blue-500/20 mb-4">
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <Car className="w-4 h-4" />
                <span>Vehicle info helps AI provide accurate diagnosis and warranty check</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Make</label>
                <input className="input" placeholder="e.g., Toyota"
                  value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Model</label>
                <input className="input" placeholder="e.g., Camry"
                  value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Year</label>
                <input className="input" type="number" placeholder="e.g., 2020"
                  value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Mileage</label>
                <input className="input" type="number" placeholder="e.g., 45000"
                  value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">VIN (optional)</label>
              <input className="input" placeholder="17-character VIN number"
                value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">Review & Submit</button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card space-y-3">
              <h3 className="font-semibold text-white border-b border-slate-700 pb-2">Review Your Request</h3>
              <div>
                <p className="text-xs text-slate-500">Title</p>
                <p className="text-sm text-white">{form.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Description</p>
                <p className="text-sm text-slate-300">{form.description}</p>
              </div>
              {form.category && (
                <div>
                  <p className="text-xs text-slate-500">Category (manual)</p>
                  <p className="text-sm text-white capitalize">{form.category.replace('_', '/')}</p>
                </div>
              )}
              {(form.make || form.year) && (
                <div>
                  <p className="text-xs text-slate-500">Vehicle</p>
                  <p className="text-sm text-white">{[form.year, form.make, form.model].filter(Boolean).join(' ')}</p>
                </div>
              )}
              {preview && <img src={preview} alt="Vehicle" className="h-24 rounded-lg object-cover" />}
            </div>

            <div className="card bg-blue-500/5 border-blue-500/20 text-sm text-blue-300">
              🤖 AI will automatically diagnose, categorize, and assign this to the best available agent
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : '🚀 Submit Request'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
