const pool = require('../config/db');

async function assignAgent(caseId, category) {
  const specialtyMap = {
    critical: ['critical', 'general'],
    mechanical: ['mechanical', 'general'],
    electrical_diagnostic: ['electrical_diagnostic', 'general'],
  };

  const specialties = specialtyMap[category] || ['general'];

  // Find available agent with matching specialty and fewest current cases
  const query = `
    SELECT u.id, u.full_name, ap.specialty,
      (SELECT COUNT(*) FROM cases c WHERE c.assigned_agent = u.id AND c.status NOT IN ('resolved', 'closed')) AS active_cases
    FROM users u
    JOIN agent_profiles ap ON ap.user_id = u.id
    WHERE ap.is_available = TRUE
      AND ap.specialty = ANY($1)
    ORDER BY active_cases ASC, RANDOM()
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [specialties]);
  if (!rows.length) return null;

  const agent = rows[0];

  // Assign the case
  await pool.query(
    `UPDATE cases SET assigned_agent = $1, status = 'assigned', updated_at = NOW() WHERE id = $2`,
    [agent.id, caseId]
  );

  return agent;
}

module.exports = { assignAgent };
