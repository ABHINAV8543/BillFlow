const User = require('../models/User');

async function requireAuth(req, res, next) {
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
