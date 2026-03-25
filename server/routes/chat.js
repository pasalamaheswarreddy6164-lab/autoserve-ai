const express = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { route } = require('../services/agentRouter');
const email = require('../services/emailService');

const router = express.Router();

// POST /api/chat - Send message, get AI response
router.post('/', verifyToken, async (req, res) => {
  try {
    const { caseId, message, portal = 'customer' } = req.body;
    if (!caseId || !message) return res.status(400).json({ error: 'caseId and message required' });

    // Get case + customer email for notifications
    const { rows: caseRows } = await pool.query(
      `SELECT c.*, cu.email AS customer_email, cu.full_name AS customer_name
       FROM cases c LEFT JOIN users cu ON cu.id = c.customer_id WHERE c.id = $1`,
      [caseId]
    );
    if (!caseRows.length) return res.status(404).json({ error: 'Case not found' });
    const caseData = caseRows[0];

    // Auth check
    if (req.user.role === 'customer' && caseData.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get chat history
    const { rows: history } = await pool.query(
      `SELECT * FROM messages WHERE case_id = $1 AND is_copilot = $2 ORDER BY created_at ASC LIMIT 40`,
      [caseId, portal === 'agent']
    );

    // Save user message
    await pool.query(
      `INSERT INTO messages (case_id, sender_id, sender_role, content, is_copilot)
       VALUES ($1, $2, $3, $4, $5)`,
      [caseId, req.user.id, req.user.role, message, portal === 'agent']
    );

    // Route to AI agent
    const { reply, botName, booking } = await route({
      message,
      history,
      caseData,
      userRole: req.user.role,
      portal,
    });

    // Save AI response
    await pool.query(
      `INSERT INTO messages (case_id, sender_role, ai_bot, content, is_copilot)
       VALUES ($1, 'ai', $2, $3, $4)`,
      [caseId, botName, reply, portal === 'agent']
    );

    // If SchedulingBot returned booking data, create appointment
    let appointment = null;
    if (booking && booking.scheduledAt) {
      const { rows: apptRows } = await pool.query(
        `INSERT INTO appointments (case_id, customer_id, agent_id, scheduled_at, service_type, location, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
        [
          caseId,
          caseData.customer_id,
          caseData.assigned_agent,
          booking.scheduledAt,
          booking.serviceType || 'General Service',
          booking.location || 'Main Service Center',
          booking.notes || null,
        ]
      );
      appointment = apptRows[0];
      await pool.query(
        `UPDATE cases SET status = 'scheduled', updated_at = NOW() WHERE id = $1`,
        [caseId]
      );
      // Email customer about AI-booked appointment
      email.sendAppointmentScheduled({
        customerEmail: caseData.customer_email,
        customerName:  caseData.customer_name,
        caseData,
        appointment,
        agentName:     null,
      });
    }

    // If an agent sent a human message (not copilot), notify the customer by email
    if (req.user.role === 'agent' && portal !== 'agent' && caseData.customer_email) {
      email.sendAgentMessage({
        customerEmail: caseData.customer_email,
        customerName:  caseData.customer_name,
        caseData,
        agentName:     req.user.name,
        message,
      });
    }

    res.json({ reply, botName, appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chat/:caseId - Get chat history
router.get('/:caseId', verifyToken, async (req, res) => {
  try {
    const { portal = 'customer' } = req.query;
    const { rows } = await pool.query(
      `SELECT m.*, u.full_name AS sender_name FROM messages m
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE m.case_id = $1 AND m.is_copilot = $2
       ORDER BY m.created_at ASC`,
      [req.params.caseId, portal === 'agent']
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
