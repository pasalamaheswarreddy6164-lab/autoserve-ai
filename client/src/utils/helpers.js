export const CATEGORY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    dot: 'bg-red-500',
  },
  mechanical: {
    label: 'Mechanical',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    dot: 'bg-orange-500',
  },
  electrical_diagnostic: {
    label: 'Electrical/Diagnostic',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    dot: 'bg-blue-500',
  },
};

export const STATUS_CONFIG = {
  open: { label: 'Open', badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  assigned: { label: 'Assigned', badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  in_progress: { label: 'In Progress', badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  scheduled: { label: 'Scheduled', badge: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' },
  resolved: { label: 'Resolved', badge: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  closed: { label: 'Closed', badge: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
};

export const BOT_CONFIG = {
  DiagnosticBot: { label: 'DiagnosticBot', icon: '🔧', color: 'text-orange-400' },
  WarrantyBot: { label: 'WarrantyBot', icon: '🛡️', color: 'text-green-400' },
  SchedulingBot: { label: 'SchedulingBot', icon: '📅', color: 'text-cyan-400' },
  DocuBot: { label: 'DocuBot', icon: '📖', color: 'text-purple-400' },
};

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
