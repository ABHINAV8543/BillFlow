const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * GET /api/clients
 * List clients. Returns parsed recipient data.
 */
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const isAdmin = req.user.role === 'admin';
        let sql = 'SELECT * FROM clients WHERE 1=1';
        const params = [];

        if (!isAdmin) {
            sql += ' AND user_id = ?';
            params.push(req.user.id);
        }

        if (search) {
            sql += ' AND recipient_data LIKE ?';
            params.push(`%${search}%`);
        }

        sql += ' ORDER BY created_at DESC';

        const result = await db.execute({ sql, args: params });
        const parsed = result.rows.map(c => {
            let rd = {};
            try { rd = JSON.parse(c.recipient_data); } catch {}
            return { ...c, recipient_data: rd, display_name: rd['Name'] || rd['Company Name'] || Object.values(rd)[0] || 'Unknown' };
        });
        res.json(parsed);
    } catch (err) {
        console.error('List clients error:', err);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

/**
 * GET /api/clients/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const sql = isAdmin ? 'SELECT * FROM clients WHERE id = ?' : 'SELECT * FROM clients WHERE id = ? AND user_id = ?';
        const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];
        const result = await db.execute({ sql, args: params });
        const client = result.rows[0];
        if (!client) return res.status(404).json({ error: 'Client not found' });

        let rd = {};
        try { rd = JSON.parse(client.recipient_data); } catch {}
        res.json({ ...client, recipient_data: rd });
    } catch (err) {
        console.error('Get client error:', err);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

module.exports = router;
