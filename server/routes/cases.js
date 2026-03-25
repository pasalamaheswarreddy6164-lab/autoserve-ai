const express = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { assignAgent } = require('../services/caseAssignment');
const DiagnosticBot = require('../services/aiAgents/DiagnosticBot');
const WarrantyBot = require('../services/aiAgents/WarrantyBot');
const email = require('../services/emailService');

const router = express.Router();

// POST /api/cases - Create new case
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, vehicleInfo } = req.body;
    let parsedVehicle = {};
    try { parsedVehicle = vehicleInfo ? JSON.parse(vehicleInfo) : {}; } catch {}

    if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

    // AI auto-categorize
    let category = 'mechanical', priority = 2, aiDiagnosis = null, warrantyStatus = 'unknown';
    try {
      const diag = await DiagnosticBot.quickDiagnosis(description, parsedVehicle);
      category = diag.category || 'mechanical';
      priority = diag.priority || 2;
      aiDiagnosis = diag.summary;

      const wResult = await WarrantyBot.checkWarranty(parsedVehicle, category);
      warrantyStatus = wResult.status;
    } catch (e) {
      console.error('AI diagnosis failed:', e.message);
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `INSERT INTO cases (customer_id, title, description, category, priority, image_url, vehicle_info, ai_diagnosis, warranty_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, title, description, category, priority, imageUrl, parsedVehicle, aiDiagnosis, warrantyStatus]
    );

    const newCase = rows[0];

    // Auto-assign to available agent
    let assignedAgent = null;
    try {
      assignedAgent = await assignAgent(newCase.id, category);
    } catch (e) {
      console.error('Agent assignment failed:', e.message);
    }

    const { rows: updated } = await pool.query(
      `SELECT c.*, u.full_name AS agent_name, u.email AS agent_email,
              cu.email AS customer_email, cu.full_name AS customer_name
       FROM cases c
       LEFT JOIN users u  ON u.id  = c.assigned_agent
       LEFT JOIN users cu ON cu.id = c.customer_id
       WHERE c.id = $1`,
      [newCase.id]
    );
    const finalCase = updated[0];

    // ── Emails ──────────────────────────────────────────────────────────────
    // 1. Confirm submission to customer
    email.sendCaseSubmitted({
      customerEmail: finalCase.customer_email,
      customerName:  finalCase.customer_name,
      caseData:      finalCase,
    });

    // 2. Notify customer of agent assignment
    if (assignedAgent) {
      email.sendCaseAssigned({
        customerEmail: finalCase.customer_email,
        customerName:  finalCase.customer_name,
        caseData:      finalCase,
        agentName:     assignedAgent.full_name,
      });
    }

    res.status(201).json(finalCase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases - List cases
router.get('/', verifyToken, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'customer') {
      query = `SELECT c.*, u.full_name AS agent_name,
        (SELECT scheduled_at FROM appointments WHERE case_id = c.id LIMIT 1) AS scheduled_at
        FROM cases c LEFT JOIN users u ON u.id = c.assigned_agent
        WHERE c.customer_id = $1 ORDER BY c.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT c.*, u.full_name AS customer_name,
        (SELECT scheduled_at FROM appointments WHERE case_id = c.id LIMIT 1) AS scheduled_at
        FROM cases c LEFT JOIN users u ON u.id = c.customer_id
        WHERE c.assigned_agent = $1 ORDER BY c.priority ASC, c.created_at DESC`;
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/count
router.get('/count', verifyToken, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'customer') {
      query = `SELECT COUNT(*) FROM cases WHERE customer_id = $1 AND status NOT IN ('closed')`;
      params = [req.user.id];
    } else {
      query = `SELECT COUNT(*) FROM cases WHERE assigned_agent = $1 AND status NOT IN ('resolved', 'closed')`;
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
        cu.full_name AS customer_name, cu.email AS customer_email,
        ag.full_name AS agent_name
       FROM cases c
       LEFT JOIN users cu ON cu.id = c.customer_id
       LEFT JOIN users ag ON ag.id = c.assigned_agent
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });

    const caseData = rows[0];
    if (req.user.role === 'customer' && caseData.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const msgQuery = req.user.role === 'customer'
      ? `SELECT m.*, u.full_name AS sender_name FROM messages m LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.case_id = $1 AND m.is_copilot = FALSE ORDER BY m.created_at ASC`
      : `SELECT m.*, u.full_name AS sender_name FROM messages m LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.case_id = $1 ORDER BY m.created_at ASC`;

    const { rows: msgs } = await pool.query(msgQuery, [req.params.id]);
    const { rows: appts } = await pool.query('SELECT * FROM appointments WHERE case_id = $1', [req.params.id]);

    res.json({ ...caseData, messages: msgs, appointments: appts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/cases/:id/status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['open', 'assigned', 'in_progress', 'scheduled', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const { rows } = await pool.query(
      `UPDATE cases SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });

    const updatedCase = rows[0];

    // Fetch customer + agent details for email
    const { rows: detail } = await pool.query(
      `SELECT c.*,
              cu.email AS customer_email, cu.full_name AS customer_name,
              ag.full_name AS agent_name
       FROM cases c
       LEFT JOIN users cu ON cu.id = c.customer_id
       LEFT JOIN users ag ON ag.id = c.assigned_agent
       WHERE c.id = $1`,
      [updatedCase.id]
    );
    const d = detail[0];

    // ── Email on status change ───────────────────────────────────────────────
    if (['in_progress', 'scheduled', 'resolved', 'closed'].includes(status)) {
      if (status === 'resolved') {
        email.sendResolutionSummary({
          customerEmail: d.customer_email,
          customerName:  d.customer_name,
          caseData:      d,
          agentName:     d.agent_name || req.user.name,
          resolution:    notes || null,
        });
      } else {
        email.sendStatusUpdate({
          customerEmail: d.customer_email,
          customerName:  d.customer_name,
          caseData:      d,
          newStatus:     status,
          agentName:     d.agent_name || req.user.name,
          notes:         notes || null,
        });
      }
    }

    res.json(updatedCase);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
