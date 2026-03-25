const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/agents - List all agents
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.email, ap.is_available, ap.specialty, ap.max_cases,
        (SELECT COUNT(*) FROM cases c WHERE c.assigned_agent = u.id AND c.status NOT IN ('resolved','closed')) AS active_cases
      FROM users u
      JOIN agent_profiles ap ON ap.user_id = u.id
      ORDER BY ap.is_available DESC, u.full_name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/agents/availability - Toggle own availability
router.patch('/availability', verifyToken, requireRole('agent'), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const { rows } = await pool.query(
      `UPDATE agent_profiles SET is_available = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
      [isAvailable, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Agent profile not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/agents/specialty
router.patch('/specialty', verifyToken, requireRole('agent'), async (req, res) => {
  try {
    const { specialty } = req.body;
    const valid = ['critical', 'mechanical', 'electrical_diagnostic', 'general'];
    if (!valid.includes(specialty)) return res.status(400).json({ error: 'Invalid specialty' });

    const { rows } = await pool.query(
      `UPDATE agent_profiles SET specialty = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
      [specialty, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
