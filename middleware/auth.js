const db = require('../db/connection');

/**
 * Middleware: require authenticated session.
 * Attaches req.user with full user row.
 */
async function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await db.execute({
            sql: 'SELECT id, username, display_name, email, role FROM users WHERE id = ?',
            args: [req.session.userId]
        });

        const user = result.rows[0];

        if (!user) {
            req.session.destroy();
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Database error' });
    }
}

/**
 * Middleware: require admin role.
 * Must be chained after requireAuth.
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
