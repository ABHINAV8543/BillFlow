const passport = require('passport');
const AppError = require('../utils/AppError');

exports.login = (req, res, next) => {
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
};

exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
};
