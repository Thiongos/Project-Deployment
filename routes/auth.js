const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const mysql = require('mysql2');
const path = require('path');

// Create a connection to the database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// User registration
router.post('/register', [
  body('username').isString().notEmpty(),
  body('email').isEmail().notEmpty(),
  body('password').isString().notEmpty()
], async (req, res) => {
  console.log('Received registration request:', req.body);
  const { username, email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Processing registration...');
    const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (rows.length > 0) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.promise().query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User login
router.post('/login', [
  body('email').isEmail().notEmpty(),
  body('password').isString().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const [results] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve HTML files
router.get('/edit-expense', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/edit_expense.html'));
});

router.get('/add-expense', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/add_expense.html'));
});

router.get('/view-expense', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/view_expense.html'));
});

module.exports = router;
