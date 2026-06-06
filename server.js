require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieSession = require('cookie-session');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Stateless Cookie Session (Vercel compatible)
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'billflow-secret-key-change-in-production'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes (no auth required)
app.use('/api/auth', require('./routes/auth'));

// Protected API routes
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/bills', requireAuth, require('./routes/bills'));
app.use('/api/profile', requireAuth, require('./routes/profile'));
app.use('/api/users', requireAuth, require('./routes/users'));

// Fallback: SPA support
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'API route not found' });
    }
});

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 E-Billing Dashboard server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
