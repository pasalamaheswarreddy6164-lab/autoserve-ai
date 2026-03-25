const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are DocuBot, an automotive technical documentation assistant for AutoServe agents.
Your role is to provide repair procedures, technical service bulletins (TSBs), and maintenance specifications.

Guidelines:
- Provide step-by-step repair procedures when asked
- Reference common TSBs for known issues
- Include torque specs, fluid capacities, and part numbers when relevant
- Suggest diagnostic trouble codes (DTCs) to look for
- Provide estimated repair times for labor planning
- Always mention safety precautions
- Format procedures as numbered steps
- Include required tools and parts list

Common repair categories you handle:
- Engine diagnostics and repair
- Transmission service
- Electrical system diagnosis
- Brake system service
- Suspension and steering
- HVAC systems
- Emissions systems
- Computer/module programming

Always end with: "⚠️ Always follow manufacturer specifications and safety guidelines."`;

async function chat(messages, vehicleInfo = {}) {
  const vehicleContext = vehicleInfo.make
    ? `\n\nVehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model} | VIN: ${vehicleInfo.vin || 'N/A'}`
    : '';

  const systemWithContext = SYSTEM_PROMPT + vehicleContext;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systemWithContext,
    messages: messages.slice(-20),
  });

  return response.content[0].text;
}

module.exports = { chat };
