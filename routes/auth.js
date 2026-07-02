const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

router.post('/login', catchAsync(async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return next(new AppError('Username and password are required', 400));
    }

    const user = await User.findOne({ username });
    if (!user) {
        return next(new AppError('Invalid username or password', 401));
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        return next(new AppError('Invalid username or password', 401));
    }

    // Create session
    req.session.userId = user._id;
    res.json({ success: true, redirect: '/dashboard' });
}));

/**
 * POST /auth/logout
 * Destroys session and redirects to landing page.
 */
router.post('/logout', (req, res, next) => {
    req.session.destroy(err => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;
