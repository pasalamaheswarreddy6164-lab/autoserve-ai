const express = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const email = require('../services/emailService');

const router = express.Router();

// GET /api/schedule
router.get('/', verifyToken, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'customer') {
      query = `SELECT a.*, c.title AS case_title, c.category, u.full_name AS agent_name
               FROM appointments a
               LEFT JOIN cases c ON c.id = a.case_id
               LEFT JOIN users u ON u.id = a.agent_id
               WHERE a.customer_id = $1 ORDER BY a.scheduled_at ASC`;
      params = [req.user.id];
    } else {
      query = `SELECT a.*, c.title AS case_title, c.category, u.full_name AS customer_name
               FROM appointments a
               LEFT JOIN cases c ON c.id = a.case_id
               LEFT JOIN users u ON u.id = a.customer_id
               WHERE a.agent_id = $1 ORDER BY a.scheduled_at ASC`;
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/schedule - Create appointment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { caseId, scheduledAt, serviceType, location, notes, agentId } = req.body;
    if (!caseId || !scheduledAt) return res.status(400).json({ error: 'caseId and scheduledAt required' });

    const { rows: caseRows } = await pool.query(
      `SELECT c.*, cu.email AS customer_email, cu.full_name AS customer_name,
              ag.full_name AS agent_name
       FROM cases c
       LEFT JOIN users cu ON cu.id = c.customer_id
       LEFT JOIN users ag ON ag.id = c.assigned_agent
       WHERE c.id = $1`,
      [caseId]
    );
    if (!caseRows.length) return res.status(404).json({ error: 'Case not found' });
    const c = caseRows[0];

    const { rows } = await pool.query(
      `INSERT INTO appointments (case_id, customer_id, agent_id, scheduled_at, service_type, location, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
      [caseId, c.customer_id, agentId || c.assigned_agent,
       scheduledAt, serviceType || 'General Service',
       location || 'Main Service Center', notes || null]
    );

    await pool.query(`UPDATE cases SET status = 'scheduled', updated_at = NOW() WHERE id = $1`, [caseId]);

    const appt = rows[0];

    // Email customer about the new appointment
    email.sendAppointmentScheduled({
      customerEmail: c.customer_email,
      customerName:  c.customer_name,
      caseData:      c,
      appointment:   appt,
      agentName:     c.agent_name,
    });

    res.status(201).json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/schedule/:id - Update appointment (confirm, reschedule, cancel)
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { status, scheduledAt, notes } = req.body;

    // Fetch existing appointment + related data before update
    const { rows: existing } = await pool.query(
      `SELECT a.*, c.title AS case_title, c.category,
              cu.email AS customer_email, cu.full_name AS customer_name,
              ag.full_name AS agent_name
       FROM appointments a
       LEFT JOIN cases c  ON c.id  = a.case_id
       LEFT JOIN users cu ON cu.id = a.customer_id
       LEFT JOIN users ag ON ag.id = a.agent_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Appointment not found' });
    const prev = existing[0];

    const { rows } = await pool.query(
      `UPDATE appointments SET
        status       = COALESCE($1, status),
        scheduled_at = COALESCE($2, scheduled_at),
        notes        = COALESCE($3, notes)
       WHERE id = $4 RETURNING *`,
      [status, scheduledAt, notes, req.params.id]
    );
    const appt = rows[0];

    // Email on confirmation
    if (status === 'confirmed' && prev.status !== 'confirmed') {
      email.sendAppointmentConfirmed({
        customerEmail: prev.customer_email,
        customerName:  prev.customer_name,
        appointment:   appt,
        agentName:     prev.agent_name || req.user.name,
        caseTitle:     prev.case_title,
      });
    }

    // Email on rescheduling
    if (scheduledAt && scheduledAt !== prev.scheduled_at?.toISOString()) {
      email.sendAppointmentScheduled({
        customerEmail: prev.customer_email,
        customerName:  prev.customer_name,
        caseData:      { id: prev.case_id, title: prev.case_title, category: prev.category, vehicle_info: {} },
        appointment:   appt,
        agentName:     prev.agent_name,
      });
    }

    res.json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
