/**
 * Run: node db/seed.js
 * Seeds:
 *   - 4 agent accounts  (password: "password")
 *   - 2 sample customer accounts with realistic vehicle cases
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function seed() {
  const hash = await bcrypt.hash('password', 10);

  // ── Agents ──────────────────────────────────────────────────────────────────
  const agents = [
    { email: 'agent1@autoserve.com', name: 'Mike Johnson',    specialty: 'critical' },
    { email: 'agent2@autoserve.com', name: 'Sarah Williams',  specialty: 'mechanical' },
    { email: 'agent3@autoserve.com', name: 'David Chen',      specialty: 'electrical_diagnostic' },
    { email: 'agent4@autoserve.com', name: 'Lisa Rodriguez',  specialty: 'general' },
  ];

  for (const a of agents) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'agent')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, full_name = $3
       RETURNING id`,
      [a.email, hash, a.name]
    );
    await pool.query(
      `INSERT INTO agent_profiles (user_id, is_available, specialty, max_cases)
       VALUES ($1, TRUE, $2, 5)
       ON CONFLICT (user_id) DO UPDATE SET specialty = $2, is_available = TRUE`,
      [rows[0].id, a.specialty]
    );
    console.log(`✅ Agent: ${a.name} (${a.email})`);
  }

  // ── Sample Customers ─────────────────────────────────────────────────────────
  const customers = [
    {
      email: 'maheswarreddy681@gmail.com',
      name:  'Maheswar Reddy',
      phone: '+91-9876543210',
      cases: [
        {
          title:       'Engine check light on — losing power on highway',
          description: 'My 2019 Toyota Camry dashboard shows a check engine light for the past 3 days. The car feels sluggish above 80 km/h and fuel consumption has increased noticeably. No strange noises but acceleration is definitely weaker.',
          vehicle:     { make: 'Toyota', model: 'Camry', year: 2019, vin: '4T1B11HK9KU123456', mileage: 52000, warranty_end: '2024-12-31' },
        },
        {
          title:       'AC not cooling — blows warm air',
          description: 'The air conditioning stopped working last week. It blows air but not cold. The compressor seems to kick on for a second then cuts off. Happened before monsoon season.',
          vehicle:     { make: 'Toyota', model: 'Camry', year: 2019, vin: '4T1B11HK9KU123456', mileage: 52000 },
        },
      ],
    },
    {
      email: 'Gavps2310@gmail.com',
      name:  'Gavaskar PS',
      phone: '+91-9988776655',
      cases: [
        {
          title:       'Brake pedal feels spongy — safety concern',
          description: 'When I press the brake pedal on my 2020 Honda City, it feels soft and goes almost to the floor before the car stops. This started after a long highway drive yesterday. Very concerned about safety.',
          vehicle:     { make: 'Honda', model: 'City', year: 2020, vin: '2HGFE2F59LH456789', mileage: 38000, warranty_end: '2025-06-30' },
        },
        {
          title:       'Unusual grinding noise from front-left wheel',
          description: 'There is a grinding/scraping noise coming from the front-left wheel area, especially when turning left or braking. The noise started about a week ago and is getting louder. I think it might be the brake pads or wheel bearing.',
          vehicle:     { make: 'Honda', model: 'City', year: 2020, vin: '2HGFE2F59LH456789', mileage: 38000 },
        },
      ],
    },
  ];

  for (const c of customers) {
    // Upsert customer user
    const { rows: userRows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, 'customer')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, full_name = $3, phone = $4
       RETURNING id`,
      [c.email, hash, c.name, c.phone]
    );
    const customerId = userRows[0].id;
    console.log(`✅ Customer: ${c.name} (${c.email})`);

    // Insert sample cases
    for (const sc of c.cases) {
      // Determine a simple category based on title keywords
      let category = 'mechanical';
      let priority  = 2;
      const lower = (sc.title + sc.description).toLowerCase();
      if (/brake|steering|spongy|safety|airbag|seized/.test(lower)) {
        category = 'critical'; priority = 1;
      } else if (/check light|battery|sensor|electrical|ac|compressor|dashboard/.test(lower)) {
        category = 'electrical_diagnostic'; priority = 2;
      }

      // Find an available agent with matching specialty
      const { rows: agents } = await pool.query(
        `SELECT u.id FROM users u
         JOIN agent_profiles ap ON ap.user_id = u.id
         WHERE ap.specialty = $1 OR ap.specialty = 'general'
         ORDER BY ap.specialty = $1 DESC LIMIT 1`,
        [category]
      );
      const agentId = agents[0]?.id || null;

      const { rows: caseRows } = await pool.query(
        `INSERT INTO cases
           (customer_id, assigned_agent, title, description, category, priority,
            vehicle_info, warranty_status, status, ai_diagnosis)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          customerId,
          agentId,
          sc.title,
          sc.description,
          category,
          priority,
          sc.vehicle,
          sc.vehicle.warranty_end ? 'likely_active' : 'unknown',
          agentId ? 'assigned' : 'open',
          `AI Pre-diagnosis: Based on the description, this appears to be a ${category.replace('_', '/')} issue. Priority set to ${priority === 1 ? 'HIGH' : 'MEDIUM'}. Assigned to specialist for further diagnosis.`,
        ]
      );
      console.log(`   📋 Case #${caseRows[0].id}: "${sc.title}"`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('   All accounts password: password');
  console.log('   Customer emails:');
  console.log('     maheswarreddy681@gmail.com');
  console.log('     Gavps2310@gmail.com');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
