const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are SchedulingBot, an automotive service appointment coordinator for AutoServe.
Your role is to help schedule vehicle repairs and maintenance appointments.

Guidelines:
- Suggest appointment times based on issue urgency
- Critical issues: recommend same-day or next-day
- Mechanical issues: within 3-5 business days
- Electrical/Diagnostic: within 1 week
- Service center hours: Monday-Saturday, 8 AM - 6 PM
- Each appointment slot is 2 hours
- Ask for preferred dates/times if not provided
- Confirm all appointment details: date, time, service type, location
- When confirming, format details clearly

Service Center Location:
- Main: 123 Auto Drive, Service Bay A
- Express: 456 Quick Lane, Service Bay B

When the user wants to book, respond with JSON in this format:
{"action": "book", "scheduledAt": "2024-01-15T10:00:00", "serviceType": "...", "location": "...", "notes": "..."}
For regular conversation, respond normally without JSON.`;

async function chat(messages, caseInfo = {}, userRole = 'customer') {
  const urgencyContext = caseInfo.priority === 1
    ? '\n\nURGENT: This is a CRITICAL safety issue - prioritize earliest available slot.'
    : caseInfo.priority === 2
    ? '\n\nThis is a MEDIUM priority mechanical issue - schedule within 3-5 days.'
    : '\n\nThis is a LOWER priority electrical/diagnostic issue - schedule within 1 week.';

  const systemWithContext = SYSTEM_PROMPT + urgencyContext;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemWithContext,
    messages: messages.slice(-20),
  });

  const text = response.content[0].text;

  // Try to extract booking JSON
  const jsonMatch = text.match(/\{[\s\S]*"action"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const booking = JSON.parse(jsonMatch[0]);
      return { text: text.replace(jsonMatch[0], '').trim() || 'Appointment details confirmed!', booking };
    } catch {}
  }

  return { text };
}

module.exports = { chat };
