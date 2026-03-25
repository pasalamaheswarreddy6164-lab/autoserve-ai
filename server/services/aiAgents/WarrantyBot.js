const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are WarrantyBot, an automotive warranty specialist for AutoServe platform.
Your role is to help determine warranty coverage and eligibility for vehicle repairs.

Guidelines:
- Analyze vehicle age, mileage, and warranty end date
- Standard new vehicle warranty: 3 years/36,000 miles bumper-to-bumper, 5 years/60,000 miles powertrain
- Extended warranty coverage varies
- Clearly state what IS covered vs NOT covered
- If outside warranty, suggest cost-effective repair options
- Be empathetic when delivering bad news about expired warranty
- Always check if the issue type matches warranty coverage categories

Coverage categories:
- Powertrain (engine, transmission, drivetrain): typically 5yr/60k
- Bumper-to-bumper (all components): typically 3yr/36k
- Electrical systems: typically covered under bumper-to-bumper
- Wear items (brakes, tires, filters): NOT covered
- Accident damage: NOT covered`;

async function chat(messages, vehicleInfo = {}, userRole = 'customer') {
  const today = new Date();
  const vehicleContext = vehicleInfo.make
    ? `\n\nVehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}
VIN: ${vehicleInfo.vin || 'N/A'}
Mileage: ${vehicleInfo.mileage || 'N/A'} miles
Warranty End Date: ${vehicleInfo.warranty_end || 'Unknown'}
Current Date: ${today.toDateString()}`
    : `\nToday's Date: ${today.toDateString()}\nNo vehicle info provided - ask the customer.`;

  const systemWithContext = SYSTEM_PROMPT + vehicleContext;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemWithContext,
    messages: messages.slice(-20),
  });

  return response.content[0].text;
}

async function checkWarranty(vehicleInfo, issueCategory) {
  const today = new Date();
  const warrantyEnd = vehicleInfo.warranty_end ? new Date(vehicleInfo.warranty_end) : null;
  const vehicleAge = vehicleInfo.year ? today.getFullYear() - vehicleInfo.year : null;

  let status = 'unknown';
  if (warrantyEnd) {
    status = warrantyEnd > today ? 'active' : 'expired';
  } else if (vehicleAge) {
    status = vehicleAge <= 3 ? 'likely_active' : vehicleAge <= 5 ? 'partial' : 'likely_expired';
  }

  return { status, vehicleAge, warrantyEnd };
}

module.exports = { chat, checkWarranty };
