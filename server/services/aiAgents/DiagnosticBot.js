const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are DiagnosticBot, an expert automotive diagnostic AI for AutoServe platform.
Your role is to help diagnose vehicle issues based on customer descriptions and available information.

Guidelines:
- Ask targeted clarifying questions to narrow down the problem
- Provide likely causes ranked by probability
- Identify if the issue is CRITICAL (safety risk), MECHANICAL (drivetrain/engine), or ELECTRICAL/DIAGNOSTIC (electronics/sensors)
- Suggest immediate actions if safety is at risk
- Be concise and use plain language for customers, technical language for agents
- When you have enough info, provide a structured diagnosis with: Problem Summary, Likely Cause(s), Urgency Level, Recommended Action

Always end customer responses with reassurance. Always end agent responses with repair procedure hints.`;

async function chat(messages, vehicleInfo = {}, userRole = 'customer') {
  const vehicleContext = vehicleInfo.make
    ? `\n\nVehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model} | VIN: ${vehicleInfo.vin || 'N/A'} | Mileage: ${vehicleInfo.mileage || 'N/A'} miles`
    : '';

  const systemWithContext = SYSTEM_PROMPT + vehicleContext +
    `\n\nYou are currently speaking with a ${userRole}. Adjust your language accordingly.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemWithContext,
    messages: messages.slice(-20),
  });

  return response.content[0].text;
}

async function quickDiagnosis(description, vehicleInfo = {}) {
  const vehicleContext = vehicleInfo.make
    ? `Vehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`
    : 'Vehicle info not provided';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are an automotive diagnostic expert. Based on the issue description, provide:
1. Category: one of [critical, mechanical, electrical_diagnostic]
2. Priority: 1 (high/critical), 2 (medium), or 3 (low)
3. Brief diagnosis summary (2-3 sentences)
Respond in JSON: {"category": "...", "priority": 1, "summary": "..."}`,
    messages: [{
      role: 'user',
      content: `${vehicleContext}\n\nIssue: ${description}`
    }],
  });

  try {
    const text = response.content[0].text;
    const json = text.match(/\{[\s\S]*\}/);
    return json ? JSON.parse(json[0]) : { category: 'mechanical', priority: 2, summary: text };
  } catch {
    return { category: 'mechanical', priority: 2, summary: response.content[0].text };
  }
}

module.exports = { chat, quickDiagnosis };
