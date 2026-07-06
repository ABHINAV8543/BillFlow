const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validations/schemas');

router.post('/login', validate(loginSchema), (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return next(new AppError('Invalid username or password', 401));
        }
        req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            return res.json({ success: true, redirect: '/dashboard' });
        });
    })(req, res, next);
});

/**
 * POST /auth/logout
 * Destroys session and redirects to landing page.
 */
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = router;
