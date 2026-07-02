const User = require('../models/User');

async function requireAuth(req, res, next) {
    // Prevent the browser from caching authenticated pages (fixes the back-button issue)
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.redirect('/login');
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).render('error', { message: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
