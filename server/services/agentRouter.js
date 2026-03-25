const DiagnosticBot = require('./aiAgents/DiagnosticBot');
const WarrantyBot = require('./aiAgents/WarrantyBot');
const SchedulingBot = require('./aiAgents/SchedulingBot');
const DocuBot = require('./aiAgents/DocuBot');

const SCHEDULING_KEYWORDS = /schedule|appointment|book|when can|available slot|repair date|come in/i;
const WARRANTY_KEYWORDS = /warrant|cover|insurance|cost|pay|charge|free/i;
const DOCU_KEYWORDS = /procedure|how to fix|repair steps|tsb|bulletin|torque|spec|manual/i;

function selectBot(message, caseCategory, userRole) {
  if (userRole === 'agent' && DOCU_KEYWORDS.test(message)) return 'DocuBot';
  if (SCHEDULING_KEYWORDS.test(message)) return 'SchedulingBot';
  if (WARRANTY_KEYWORDS.test(message)) return 'WarrantyBot';
  return 'DiagnosticBot';
}

// Build full case context string to inject into every AI conversation
function buildCaseContext(caseData) {
  const v = caseData.vehicle_info || {};
  const vehicle = [v.year, v.make, v.model].filter(Boolean).join(' ');
  const vin     = v.vin      ? `VIN: ${v.vin}`           : '';
  const mileage = v.mileage  ? `Mileage: ${v.mileage} miles` : '';
  const warranty= v.warranty_end ? `Warranty End: ${v.warranty_end}` : '';

  return [
    `=== CASE CONTEXT ===`,
    `Case #${caseData.id} | Category: ${caseData.category} | Priority: ${caseData.priority === 1 ? 'HIGH' : caseData.priority === 2 ? 'MEDIUM' : 'LOW'}`,
    `Issue Title: ${caseData.title}`,
    `Customer Description: ${caseData.description}`,
    vehicle  ? `Vehicle: ${vehicle}` : '',
    vin      ? vin      : '',
    mileage  ? mileage  : '',
    warranty ? warranty : '',
    caseData.ai_diagnosis ? `Prior AI Diagnosis: ${caseData.ai_diagnosis}` : '',
    `====================`,
  ].filter(Boolean).join('\n');
}

async function route({ message, history, caseData, userRole, portal }) {
  const botName = selectBot(message, caseData.category, userRole);
  const caseContext = buildCaseContext(caseData);

  // Inject case context as the very first system-level user message
  // so the AI always knows exactly what vehicle and problem it's dealing with
  const contextMessage = { role: 'user', content: caseContext };
  const contextAck     = { role: 'assistant', content: `Understood. I have full context for Case #${caseData.id} — ${caseData.title}. How can I help?` };

  const messages = [
    contextMessage,
    contextAck,
    ...history.map(m => ({
      role: m.sender_role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  let reply, booking;

  switch (botName) {
    case 'WarrantyBot':
      reply = await WarrantyBot.chat(messages, caseData.vehicle_info || {}, userRole);
      break;
    case 'SchedulingBot': {
      const result = await SchedulingBot.chat(messages, caseData, userRole);
      reply = result.text;
      booking = result.booking;
      break;
    }
    case 'DocuBot':
      reply = await DocuBot.chat(messages, caseData.vehicle_info || {});
      break;
    default:
      reply = await DiagnosticBot.chat(messages, caseData.vehicle_info || {}, userRole);
  }

  return { reply, botName, booking };
}

// Auto-diagnosis when agent first opens a case (no prior copilot messages)
async function autoAnalyze(caseData) {
  const v = caseData.vehicle_info || {};
  const vehicle = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown vehicle';

  const prompt = `Analyze this vehicle issue for my agent team:

Vehicle: ${vehicle}
Issue: ${caseData.title}
Customer says: ${caseData.description}
Category: ${caseData.category}
Priority: ${caseData.priority === 1 ? 'HIGH - Safety Critical' : caseData.priority === 2 ? 'MEDIUM' : 'LOW'}
${caseData.ai_diagnosis ? `Initial AI diagnosis: ${caseData.ai_diagnosis}` : ''}

Provide:
1. **Most Likely Cause** — top 2-3 possibilities
2. **Diagnostic Steps** — what to check first
3. **Estimated Severity** — minor / moderate / major
4. **Recommended Action** — immediate steps
5. **Parts Likely Needed** — if applicable`;

  const messages = [{ role: 'user', content: prompt }];
  return await DiagnosticBot.chat(messages, caseData.vehicle_info || {}, 'agent');
}

module.exports = { route, selectBot, autoAnalyze };
