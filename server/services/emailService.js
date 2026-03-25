const nodemailer = require('nodemailer');

// ─── Transporter ─────────────────────────────────────────────────────────────
let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_HOST) {
    // Custom SMTP (e.g. Outlook, Office365)
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
    // Gmail with App Password
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS },
    });
  } else {
    // Dev: log to console, no actual send
    transporter = {
      sendMail: async (opts) => {
        console.log('\n📧 [EMAIL - DEV MODE]');
        console.log(`   To: ${opts.to}`);
        console.log(`   Subject: ${opts.subject}`);
        console.log(`   [HTML email body suppressed in dev mode]`);
        console.log('');
        return { messageId: 'dev-mode' };
      },
    };
  }
  return transporter;
}

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────
function wrap(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#0f172a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; padding:32px 16px; }
    .card { background:#1e293b; border-radius:16px; overflow:hidden; border:1px solid #334155; }
    .header { background:linear-gradient(135deg,#1d4ed8,#0f172a); padding:32px 32px 24px; }
    .header-logo { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
    .logo-icon { width:40px; height:40px; background:#2563eb; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; }
    .logo-text { color:#fff; font-size:20px; font-weight:700; }
    .header h1 { color:#fff; font-size:22px; font-weight:700; margin:0 0 6px; }
    .header p  { color:#94a3b8; font-size:14px; margin:0; }
    .body { padding:28px 32px; }
    .section-title { color:#94a3b8; font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; margin:0 0 12px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
    .info-item { background:#0f172a; border-radius:10px; padding:12px 14px; }
    .info-item .label { color:#64748b; font-size:11px; margin-bottom:3px; }
    .info-item .value { color:#f1f5f9; font-size:14px; font-weight:600; }
    .badge { display:inline-block; padding:4px 10px; border-radius:99px; font-size:12px; font-weight:600; }
    .badge-critical  { background:rgba(239,68,68,.15);  color:#f87171; border:1px solid rgba(239,68,68,.3); }
    .badge-mechanical{ background:rgba(249,115,22,.15); color:#fb923c; border:1px solid rgba(249,115,22,.3); }
    .badge-electrical{ background:rgba(59,130,246,.15); color:#60a5fa; border:1px solid rgba(59,130,246,.3); }
    .badge-open      { background:rgba(234,179,8,.15);  color:#facc15; border:1px solid rgba(234,179,8,.3); }
    .badge-assigned  { background:rgba(59,130,246,.15); color:#60a5fa; border:1px solid rgba(59,130,246,.3); }
    .badge-inprogress{ background:rgba(168,85,247,.15); color:#c084fc; border:1px solid rgba(168,85,247,.3); }
    .badge-scheduled { background:rgba(34,211,238,.15); color:#22d3ee; border:1px solid rgba(34,211,238,.3); }
    .badge-resolved  { background:rgba(34,197,94,.15);  color:#4ade80; border:1px solid rgba(34,197,94,.3); }
    .ai-box { background:#0f172a; border:1px solid #334155; border-left:3px solid #f97316; border-radius:10px; padding:14px 16px; margin:16px 0; }
    .ai-box .ai-label { color:#f97316; font-size:11px; font-weight:600; margin-bottom:6px; }
    .ai-box p { color:#cbd5e1; font-size:13px; margin:0; line-height:1.5; }
    .appt-box { background:#0f172a; border:1px solid #334155; border-left:3px solid #22d3ee; border-radius:10px; padding:16px; margin:16px 0; }
    .appt-box .appt-time { color:#22d3ee; font-size:18px; font-weight:700; margin-bottom:8px; }
    .appt-box .appt-detail { color:#94a3b8; font-size:13px; margin:4px 0; }
    .msg-box { background:#0f172a; border:1px solid #334155; border-radius:10px; padding:14px 16px; margin:16px 0; }
    .msg-box .msg-author { color:#60a5fa; font-size:12px; font-weight:600; margin-bottom:6px; }
    .msg-box .msg-content { color:#e2e8f0; font-size:14px; line-height:1.6; white-space:pre-wrap; }
    .cta { text-align:center; margin:24px 0 8px; }
    .cta a { display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:12px 28px; border-radius:10px; font-size:14px; font-weight:600; }
    .cta a:hover { background:#1d4ed8; }
    .divider { border:none; border-top:1px solid #1e293b; margin:20px 0; }
    .footer { padding:0 32px 28px; }
    .footer p { color:#475569; font-size:12px; margin:0 0 4px; }
    .footer a { color:#60a5fa; text-decoration:none; }
    .warranty-ok  { background:rgba(34,197,94,.1);  border:1px solid rgba(34,197,94,.2);  border-radius:10px; padding:12px 16px; color:#4ade80; font-size:13px; }
    .warranty-exp { background:rgba(239,68,68,.1);   border:1px solid rgba(239,68,68,.2);  border-radius:10px; padding:12px 16px; color:#f87171; font-size:13px; }
    .timeline { margin:0; padding:0; list-style:none; }
    .timeline li { display:flex; gap:10px; align-items:flex-start; padding:8px 0; border-bottom:1px solid #1e293b; }
    .timeline li:last-child { border-bottom:none; }
    .tl-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:4px; }
    .tl-text { color:#94a3b8; font-size:13px; }
    .tl-time { color:#475569; font-size:11px; margin-top:2px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">
          <div class="logo-icon">🚗</div>
          <div class="logo-text">AutoServe AI</div>
        </div>
        ${bodyHtml.header}
      </div>
      <div class="body">
        ${bodyHtml.content}
      </div>
      <div class="footer">
        <hr style="border:none;border-top:1px solid #1e293b;margin-bottom:16px"/>
        <p>This is an automated notification from <strong style="color:#60a5fa">AutoServe AI</strong> platform.</p>
        <p>To view your full case history, <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}">log in to your dashboard</a>.</p>
        <p style="margin-top:10px">© ${new Date().getFullYear()} AutoServe AI · All rights reserved</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Category / Status helpers ────────────────────────────────────────────────
function catBadge(cat) {
  const map = { critical: 'critical', mechanical: 'mechanical', electrical_diagnostic: 'electrical' };
  const label = { critical: '🔴 Critical', mechanical: '🟠 Mechanical', electrical_diagnostic: '🔵 Electrical/Diagnostic' };
  return `<span class="badge badge-${map[cat] || 'mechanical'}">${label[cat] || cat}</span>`;
}

function statusBadge(status) {
  const map = { open: 'open', assigned: 'assigned', in_progress: 'inprogress', scheduled: 'scheduled', resolved: 'resolved', closed: 'assigned' };
  const label = { open: '🔓 Open', assigned: '👤 Assigned', in_progress: '⚙️ In Progress', scheduled: '📅 Scheduled', resolved: '✅ Resolved', closed: '🔒 Closed' };
  return `<span class="badge badge-${map[status] || 'open'}">${label[status] || status}</span>`;
}

function vehicleHtml(v) {
  if (!v || (!v.make && !v.year)) return '';
  const parts = [v.year, v.make, v.model].filter(Boolean).join(' ');
  const vin = v.vin ? `&nbsp;·&nbsp;VIN: ${v.vin}` : '';
  return `<p style="color:#64748b;font-size:13px;margin:8px 0 0">🚗 ${parts}${vin}</p>`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Send helper ──────────────────────────────────────────────────────────────
async function send({ to, subject, html }) {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"AutoServe AI" <${process.env.GMAIL_USER || process.env.EMAIL_USER || 'noreply@autoserve.ai'}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent → ${to} | ${subject}`);
  } catch (err) {
    console.error(`📧 Email failed → ${to}: ${err.message}`);
    // Never let email failure break the API
  }
}

// ─── 1. Case Submitted ────────────────────────────────────────────────────────
async function sendCaseSubmitted({ customerEmail, customerName, caseData }) {
  const html = wrap('Case Submitted — AutoServe AI', {
    header: `
      <h1>We've received your service request ✅</h1>
      <p>Your case has been logged and our AI is analyzing the issue.</p>`,
    content: `
      <p class="section-title">Case Details</p>
      <div class="info-grid">
        <div class="info-item"><div class="label">Case ID</div><div class="value">#${caseData.id}</div></div>
        <div class="info-item"><div class="label">Category</div><div class="value">${catBadge(caseData.category)}</div></div>
        <div class="info-item"><div class="label">Priority</div><div class="value">${caseData.priority === 1 ? '🔴 High' : caseData.priority === 2 ? '🟡 Medium' : '🟢 Low'}</div></div>
        <div class="info-item"><div class="label">Status</div><div class="value">${statusBadge(caseData.status)}</div></div>
      </div>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="color:#f1f5f9;font-size:15px;font-weight:600;margin-bottom:6px">${caseData.title}</div>
        <div style="color:#94a3b8;font-size:13px;line-height:1.5">${caseData.description}</div>
        ${vehicleHtml(caseData.vehicle_info)}
      </div>
      ${caseData.ai_diagnosis ? `
      <div class="ai-box">
        <div class="ai-label">🤖 AI Preliminary Diagnosis</div>
        <p>${caseData.ai_diagnosis}</p>
      </div>` : ''}
      ${caseData.warranty_status && caseData.warranty_status !== 'unknown' ? `
      <div class="${caseData.warranty_status.includes('active') || caseData.warranty_status === 'likely_active' ? 'warranty-ok' : 'warranty-exp'}">
        🛡️ Warranty Status: <strong>${caseData.warranty_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
      </div>` : ''}
      <p style="color:#94a3b8;font-size:13px;margin:16px 0">
        We are now finding the best available agent for your case. You'll receive another email once assigned.
      </p>
      <div class="cta"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer">View Case Dashboard →</a></div>`,
  });

  await send({ to: customerEmail, subject: `[AutoServe] Case #${caseData.id} Submitted — ${caseData.title}`, html });
}

// ─── 2. Case Assigned ─────────────────────────────────────────────────────────
async function sendCaseAssigned({ customerEmail, customerName, caseData, agentName }) {
  const html = wrap('Agent Assigned — AutoServe AI', {
    header: `
      <h1>Your case has been assigned 👤</h1>
      <p>A specialist is now handling your service request.</p>`,
    content: `
      <p class="section-title">Assignment Details</p>
      <div class="info-grid">
        <div class="info-item"><div class="label">Case ID</div><div class="value">#${caseData.id}</div></div>
        <div class="info-item"><div class="label">Assigned Agent</div><div class="value" style="color:#60a5fa">👤 ${agentName}</div></div>
        <div class="info-item"><div class="label">Category</div><div class="value">${catBadge(caseData.category)}</div></div>
        <div class="info-item"><div class="label">Status</div><div class="value">${statusBadge('assigned')}</div></div>
      </div>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="color:#f1f5f9;font-size:15px;font-weight:600;">${caseData.title}</div>
        ${vehicleHtml(caseData.vehicle_info)}
      </div>
      <p style="color:#94a3b8;font-size:13px;">
        <strong style="color:#f1f5f9">${agentName}</strong> specializes in ${caseData.category.replace('_', ' ')} issues and will begin reviewing your case shortly.
        You'll be notified when they start working on it.
      </p>
      <div class="cta"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer">Track Your Case →</a></div>`,
  });

  await send({ to: customerEmail, subject: `[AutoServe] Case #${caseData.id} — Agent ${agentName} Assigned`, html });
}

// ─── 3. Status Updated ────────────────────────────────────────────────────────
async function sendStatusUpdate({ customerEmail, customerName, caseData, newStatus, agentName, notes }) {
  const messages = {
    in_progress: { emoji: '⚙️', headline: 'Your case is being worked on', body: `<strong style="color:#f1f5f9">${agentName || 'Your agent'}</strong> has started working on your vehicle issue. We'll keep you updated on progress.` },
    scheduled:   { emoji: '📅', headline: 'Repair appointment scheduled', body: `An appointment has been scheduled for your vehicle service. Check your dashboard for full appointment details.` },
    resolved:    { emoji: '✅', headline: 'Your case has been resolved!', body: `Great news — ${agentName || 'your agent'} has marked this case as resolved. We hope your vehicle is back in top shape!` },
    closed:      { emoji: '🔒', headline: 'Case closed', body: `This case has been closed. Thank you for choosing AutoServe AI for your vehicle service needs.` },
  };

  const info = messages[newStatus] || { emoji: '🔔', headline: `Case status updated to ${newStatus}`, body: 'Your case status has been updated.' };

  const html = wrap(`Case ${info.headline} — AutoServe AI`, {
    header: `
      <h1>${info.emoji} ${info.headline}</h1>
      <p>Case #${caseData.id} · ${caseData.title}</p>`,
    content: `
      <p class="section-title">Status Update</p>
      <div class="info-grid">
        <div class="info-item"><div class="label">Case ID</div><div class="value">#${caseData.id}</div></div>
        <div class="info-item"><div class="label">New Status</div><div class="value">${statusBadge(newStatus)}</div></div>
        <div class="info-item"><div class="label">Category</div><div class="value">${catBadge(caseData.category)}</div></div>
        ${agentName ? `<div class="info-item"><div class="label">Agent</div><div class="value" style="color:#60a5fa">👤 ${agentName}</div></div>` : ''}
      </div>
      <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px">${info.body}</p>
      ${notes ? `<div class="msg-box"><div class="msg-author">📝 Agent Notes</div><div class="msg-content">${notes}</div></div>` : ''}
      <div class="cta"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer">View Full Case →</a></div>`,
  });

  await send({ to: customerEmail, subject: `[AutoServe] Case #${caseData.id} — ${info.headline}`, html });
}

// ─── 4. Appointment Scheduled ────────────────────────────────────────────────
async function sendAppointmentScheduled({ customerEmail, customerName, caseData, appointment, agentName }) {
  const html = wrap('Appointment Scheduled — AutoServe AI', {
    header: `
      <h1>📅 Appointment Confirmed</h1>
      <p>Your vehicle service appointment has been booked.</p>`,
    content: `
      <p class="section-title">Appointment Details</p>
      <div class="appt-box">
        <div class="appt-time">📅 ${fmtDate(appointment.scheduled_at)}</div>
        <div class="appt-detail">🔧 Service: ${appointment.service_type || 'General Service'}</div>
        <div class="appt-detail">📍 Location: ${appointment.location || 'Main Service Center'}</div>
        ${agentName ? `<div class="appt-detail">👤 Technician: ${agentName}</div>` : ''}
        ${appointment.notes ? `<div class="appt-detail">📝 Notes: ${appointment.notes}</div>` : ''}
        <div style="margin-top:10px">${statusBadge('scheduled')}</div>
      </div>
      <div class="info-grid" style="margin-top:16px">
        <div class="info-item"><div class="label">Case ID</div><div class="value">#${caseData.id}</div></div>
        <div class="info-item"><div class="label">Issue</div><div class="value" style="font-size:12px">${caseData.title}</div></div>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin-top:16px">
        ⚠️ Please bring your vehicle 10 minutes early. If you need to reschedule, contact us at least 24 hours before.
      </p>
      <div class="cta"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer">View in Dashboard →</a></div>`,
  });

  await send({ to: customerEmail, subject: `[AutoServe] Appointment Scheduled — ${fmtDate(appointment.scheduled_at)}`, html });
}

// ─── 5. Appointment Confirmed (agent confirmed) ───────────────────────────────
async function sendAppointmentConfirmed({ customerEmail, customerName, appointment, agentName, caseTitle }) {
  const html = wrap('Appointment Confirmed — AutoServe AI', {
    header: `
      <h1>✅ Appointment Confirmed by Agent</h1>
      <p>${agentName || 'Your technician'} has confirmed your appointment.</p>`,
    content: `
      <div class="appt-box">
        <div class="appt-time">📅 ${fmtDate(appointment.scheduled_at)}</div>
        <div class="appt-detail">🔧 ${appointment.service_type || 'General Service'}</div>
        <div class="appt-detail">📍 ${appointment.location || 'Main Service Center'}</div>
        ${agentName ? `<div class="appt-detail">👤 Confirmed by: ${agentName}</div>` : ''}
        <div style="margin-top:10px"><span class="badge badge-resolved">✅ Confirmed</span></div>
      </div>
      <p style="color:#94a3b8;font-size:13px">Please arrive on time. Questions? Reply to this email or log into your dashboard.</p>
      <div class="cta"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer">View Dashboard →</a></div>`,
  });

  await send({ to: customerEmail, subject: `[AutoServe] ✅ Appointment Confirmed — ${fmtDate(appointment.scheduled_at)}`, html });
}

// ─── 6. Agent Reply / Message ─────────────────────────────────────────────────
async function sendAgentMessage({ customerEmail, customerName, caseData, agentName, message }) {
  const html = wrap('New Message from Agent — AutoServe AI', {
    header: `
      <h1>💬 New message from ${agentName}</h1>
      <p>Regarding Case #${caseData.id} · ${caseData.title}</p>`,
    content: `
      <div class="msg-box">
        <div class="msg-author">👤 ${agentName} · ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="msg-content">${message}</div>
      </div>
      <div class="info-grid" style="margin-top:16px">
        <div class="info-item"><div class="label">Case</div><div class="value">#${caseData.id}</div></div>
        <div class="info-item"><div class="label">Status</div><div class="value">${statusBadge(caseData.status)}</div></div>
      </div>
      <p style="color:#94a3b8;font-size:13px">Log in to your dashboard to reply or get more details from your AI assistant.</p>
      <div class="cta"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer">Reply in Dashboard →</a></div>`,
  });

  await send({ to: customerEmail, subject: `[AutoServe] 💬 ${agentName} sent a message — Case #${caseData.id}`, html });
}

// ─── 7. Case Resolved Summary ─────────────────────────────────────────────────
async function sendResolutionSummary({ customerEmail, customerName, caseData, agentName, resolution }) {
  const html = wrap('Case Resolved — AutoServe AI', {
    header: `
      <h1>🎉 Your vehicle issue has been resolved!</h1>
      <p>Case #${caseData.id} is now marked as Resolved.</p>`,
    content: `
      <p class="section-title">Resolution Summary</p>
      <div class="info-grid">
        <div class="info-item"><div class="label">Case ID</div><div class="value">#${caseData.id}</div></div>
        <div class="info-item"><div class="label">Category</div><div class="value">${catBadge(caseData.category)}</div></div>
        <div class="info-item"><div class="label">Resolved By</div><div class="value" style="color:#4ade80">👤 ${agentName || 'Agent'}</div></div>
        <div class="info-item"><div class="label">Date</div><div class="value" style="font-size:12px">${new Date().toLocaleDateString()}</div></div>
      </div>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="color:#f1f5f9;font-size:15px;font-weight:600;margin-bottom:6px">${caseData.title}</div>
        <div style="color:#94a3b8;font-size:13px">${caseData.description}</div>
        ${vehicleHtml(caseData.vehicle_info)}
      </div>
      ${resolution ? `
      <div class="ai-box" style="border-left-color:#4ade80">
        <div class="ai-label" style="color:#4ade80">✅ Resolution Notes</div>
        <p>${resolution}</p>
      </div>` : ''}
      <p style="color:#94a3b8;font-size:13px;margin:16px 0">
        Thank you for trusting AutoServe AI with your vehicle service. We hope everything is running smoothly!
      </p>
      <div class="cta"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer">View Full History →</a></div>`,
  });

  await send({ to: customerEmail, subject: `[AutoServe] ✅ Case #${caseData.id} Resolved — ${caseData.title}`, html });
}

module.exports = {
  sendCaseSubmitted,
  sendCaseAssigned,
  sendStatusUpdate,
  sendAppointmentScheduled,
  sendAppointmentConfirmed,
  sendAgentMessage,
  sendResolutionSummary,
};
