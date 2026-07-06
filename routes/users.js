const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bill = require('../models/Bill');
const Client = require('../models/Client');
const { requireAdmin } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validations/schemas');

// All routes in this file require admin
router.use(requireAdmin);

router.get('/', catchAsync(async (req, res, next) => {
    const users = await User.find({}).sort({ createdAt: 1 }).select('-hash -salt');
        
        // If it's an API request, return JSON
        if (req.originalUrl.startsWith('/api')) {
            return res.json(users);
        }

        // Render page
        res.render('users', {
            title: 'User Management',
            activePage: 'users',
            user: req.user,
            users
        });
}));

router.post('/', validate(createUserSchema), catchAsync(async (req, res, next) => {
    const { username, displayName, email, password, role } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
        return next(new AppError('Username already exists', 409));
    }

        const newUser = new User({
            username,
            display_name: displayName,
            email: email || null,
            role: role || 'user',
            created_by: req.user._id,
            bill_columns: [],
            recipient_fields: [],
            footer_fields: [],
            default_cgst: 0,
            default_sgst: 0
        });
        
        await User.register(newUser, password);

    res.status(201).json({ id: newUser._id, message: 'User created' });
}));

router.patch('/:id', validate(updateUserSchema), catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

        const { displayName, email, role, password } = req.body;

        if (displayName) user.display_name = displayName;
        if (email !== undefined) user.email = email || null;
        if (role && ['admin', 'user'].includes(role)) user.role = role;
        if (password) await user.setPassword(password);

    await user.save();
    res.json({ id: user._id, message: 'User updated' });
}));

router.delete('/:id', catchAsync(async (req, res, next) => {
    if (req.params.id === req.user._id.toString()) {
        return next(new AppError('Cannot delete your own account', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

        await Bill.deleteMany({ user_id: user._id });
        await Client.deleteMany({ user_id: user._id });
        await User.findByIdAndDelete(user._id);

    res.json({ message: 'User deleted successfully' });
}));

module.exports = router;
