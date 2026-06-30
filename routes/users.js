const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Bill = require('../models/Bill');
const Client = require('../models/Client');
const { requireAdmin } = require('../middleware/auth');

// All routes in this file require admin
router.use(requireAdmin);

router.get('/', async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: 1 }).select('-password_hash');
        
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
    } catch (err) {
        console.error('List users error:', err);
        if (req.originalUrl.startsWith('/api')) {
            res.status(500).json({ error: 'Failed to fetch users' });
        } else {
            res.status(500).render('error', { message: 'Failed to fetch users' });
        }
    }
});

router.post('/', async (req, res) => {
    try {
        const { username, displayName, email, password, role } = req.body;

        if (!username || !password || !displayName) {
            return res.status(400).json({ error: 'Username, display name, and password are required' });
        }

        if (role && !['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Role must be "admin" or "user"' });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hash = bcrypt.hashSync(password, 10);
        
        const newUser = await User.create({
            username,
            display_name: displayName,
            email: email || null,
            password_hash: hash,
            role: role || 'user',
            created_by: req.user._id,
            bill_columns: [],
            recipient_fields: [],
            footer_fields: [],
            default_cgst: 0,
            default_sgst: 0
        });

        res.status(201).json({ id: newUser._id, message: 'User created' });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { displayName, email, role, password } = req.body;

        if (displayName) user.display_name = displayName;
        if (email !== undefined) user.email = email || null;
        if (role && ['admin', 'user'].includes(role)) user.role = role;
        if (password) user.password_hash = bcrypt.hashSync(password, 10);

        await user.save();
        res.json({ id: user._id, message: 'User updated' });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await Bill.deleteMany({ user_id: user._id });
        await Client.deleteMany({ user_id: user._id });
        await User.findByIdAndDelete(user._id);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
