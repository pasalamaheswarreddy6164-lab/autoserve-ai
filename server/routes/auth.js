const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, phone, role } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (!['customer', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Role must be customer or agent' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, full_name, role',
      [email, hash, fullName, phone || null, role]
    );
    const user = rows[0];

    // If agent, create profile
    if (role === 'agent') {
      await pool.query(
        'INSERT INTO agent_profiles (user_id, is_available, specialty) VALUES ($1, TRUE, $2)',
        [user.id, 'general']
      );
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.full_name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.full_name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    let profile = null;
    if (rows[0].role === 'agent') {
      const ap = await pool.query('SELECT * FROM agent_profiles WHERE user_id = $1', [req.user.id]);
      profile = ap.rows[0] || null;
    }

    res.json({ ...rows[0], agentProfile: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
