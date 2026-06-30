const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const isAdmin = req.user.role === 'admin';
        const filter = isAdmin ? {} : { user_id: req.user._id };

        if (search) {
            // Search within the recipient_data Mixed field using a regex on its
            // JSON-serialised form. This works because Mongoose stores Mixed fields
            // as plain objects; the $where or $regex on a stringified representation
            // is the most portable approach for schema-less data.
            filter.$or = [
                { 'recipient_data.Name': { $regex: search, $options: 'i' } },
                { 'recipient_data.Company Name': { $regex: search, $options: 'i' } }
            ];
        }

        const clients = await Client.find(filter).sort({ createdAt: -1 });

        const parsed = clients.map(c => {
            const client = c.toObject();
            const rd = client.recipient_data || {};
            const displayName = rd['Name'] || rd['Company Name'] || Object.values(rd)[0] || 'Unknown';
            return { ...client, display_name: displayName };
        });

        res.json(parsed);
    } catch (err) {
        console.error('List clients error:', err);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

/**
 * GET /clients/:id
 * Get a single client by ID. Returns JSON.
 */
router.get('/:id', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const filter = { _id: req.params.id };
        if (!isAdmin) {
            filter.user_id = req.user._id;
        }

        const client = await Client.findOne(filter);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client.toObject());
    } catch (err) {
        console.error('Get client error:', err);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

module.exports = router;
