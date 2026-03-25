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

async function route({ message, history, caseData, userRole, portal }) {
  const botName = selectBot(message, caseData.category, userRole);

  const messages = [
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

module.exports = { route, selectBot };
