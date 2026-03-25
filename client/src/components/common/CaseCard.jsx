import React from 'react';
import { Clock, User, Calendar } from 'lucide-react';
import { CATEGORY_CONFIG, STATUS_CONFIG, timeAgo, formatDate } from '../../utils/helpers';

export default function CaseCard({ caseItem, onClick, showCustomer = false }) {
  const cat = CATEGORY_CONFIG[caseItem.category] || CATEGORY_CONFIG.mechanical;
  const stat = STATUS_CONFIG[caseItem.status] || STATUS_CONFIG.open;

  return (
    <div
      onClick={() => onClick && onClick(caseItem)}
      className={`card hover:bg-slate-700 transition-all cursor-pointer border-l-4 ${
        caseItem.category === 'critical' ? 'border-l-red-500' :
        caseItem.category === 'mechanical' ? 'border-l-orange-500' :
        'border-l-blue-500'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cat.dot} mr-1`} />
              {cat.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.badge}`}>
              {stat.label}
            </span>
            {caseItem.priority === 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium animate-pulse">
                🔴 High Priority
              </span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-white truncate">{caseItem.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{caseItem.description}</p>

          {/* Vehicle info */}
          {caseItem.vehicle_info && (caseItem.vehicle_info.make || caseItem.vehicle_info.year) && (
            <p className="text-xs text-blue-400 mt-1">
              🚗 {[caseItem.vehicle_info.year, caseItem.vehicle_info.make, caseItem.vehicle_info.model].filter(Boolean).join(' ')}
            </p>
          )}
        </div>

        {/* Image thumbnail */}
        {caseItem.image_url && (
          <img
            src={caseItem.image_url}
            alt="Vehicle"
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-600"
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(caseItem.created_at)}
          </span>
          {showCustomer && caseItem.customer_name && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {caseItem.customer_name}
            </span>
          )}
          {caseItem.agent_name && !showCustomer && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {caseItem.agent_name}
            </span>
          )}
        </div>
        {caseItem.scheduled_at && (
          <span className="flex items-center gap-1 text-xs text-cyan-400">
            <Calendar className="w-3 h-3" />
            {formatDate(caseItem.scheduled_at).split(',')[0]}
          </span>
        )}
      </div>
    </div>
  );
}
