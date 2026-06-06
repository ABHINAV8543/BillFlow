const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * GET /api/profile
 * Returns current user's company profile + bill columns + recipient/footer fields.
 */
router.get('/', async (req, res) => {
    try {
        const userRes = await db.execute({
            sql: `
            SELECT id, username, display_name, email, role,
                   bill_title, company_name, company_subtitle, company_address, company_phones,
                   company_gstin, company_pan, company_wef, bank_details,
                   default_cgst, default_sgst
            FROM users WHERE id = ?
            `,
            args: [req.user.id]
        });

        const billColumnsRes = await db.execute({
            sql: 'SELECT * FROM bill_columns WHERE user_id = ? ORDER BY col_order ASC',
            args: [req.user.id]
        });

        const recipientFieldsRes = await db.execute({
            sql: 'SELECT * FROM recipient_fields WHERE user_id = ? ORDER BY field_order ASC',
            args: [req.user.id]
        });

        const footerFieldsRes = await db.execute({
            sql: 'SELECT * FROM footer_fields WHERE user_id = ? ORDER BY field_order ASC',
            args: [req.user.id]
        });

        const user = userRes.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Parse bank_details JSON
        let bankDetails = [];
        try { bankDetails = JSON.parse(user.bank_details || '[]'); } catch {}

        res.json({
            ...user,
            bank_details: bankDetails,
            billColumns: billColumnsRes.rows,
            recipientFields: recipientFieldsRes.rows,
            footerFields: footerFieldsRes.rows
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * PATCH /api/profile
 * Update company details.
 */
router.patch('/', async (req, res) => {
    try {
        const body = req.body;
        const sets = [];
        const params = [];

        // For bill_title, allow setting to empty string (clear it)
        if (body.bill_title !== undefined) {
            sets.push('bill_title = ?');
            params.push(body.bill_title || null);
        }
        const fields = ['company_name', 'company_subtitle', 'company_address', 'company_phones',
                         'company_gstin', 'company_pan', 'company_wef', 'default_cgst', 'default_sgst'];
        for (const f of fields) {
            if (body[f] !== undefined) {
                sets.push(`${f} = ?`);
                params.push(body[f]);
            }
        }
        if (body.bank_details !== undefined) {
            sets.push('bank_details = ?');
            params.push(JSON.stringify(body.bank_details));
        }

        if (sets.length === 0) {
            return res.json({ message: 'Nothing to update' });
        }

        params.push(req.user.id);
        await db.execute({
            sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
            args: params
        });

        res.json({ message: 'Profile updated' });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * PUT /api/profile/columns
 * Replace bill column definitions.
 * Body: { columns: [{col_name, col_type, col_order, is_rate, is_amount}] }
 */
router.put('/columns', async (req, res) => {
    try {
        const { columns } = req.body;
        if (!columns || !Array.isArray(columns)) {
            return res.status(400).json({ error: 'columns array required' });
        }

        const queries = [
            { sql: 'DELETE FROM bill_columns WHERE user_id = ?', args: [req.user.id] }
        ];

        columns.forEach((col, i) => {
            queries.push({
                sql: 'INSERT INTO bill_columns (user_id, col_name, col_type, col_order, is_rate, is_qty, is_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [req.user.id, col.col_name, col.col_type || 'text', col.col_order || (i + 1), col.is_rate ? 1 : 0, col.is_qty ? 1 : 0, col.is_amount ? 1 : 0]
            });
        });

        await db.batch(queries);

        const updated = await db.execute({
            sql: 'SELECT * FROM bill_columns WHERE user_id = ? ORDER BY col_order ASC',
            args: [req.user.id]
        });
        res.json(updated.rows);
    } catch (err) {
        console.error('Update columns error:', err);
        res.status(500).json({ error: 'Failed to update columns' });
    }
});

/**
 * PUT /api/profile/recipient-fields
 * Replace recipient field definitions.
 */
router.put('/recipient-fields', async (req, res) => {
    try {
        const { fields } = req.body;
        if (!fields || !Array.isArray(fields)) {
            return res.status(400).json({ error: 'fields array required' });
        }

        const queries = [
            { sql: 'DELETE FROM recipient_fields WHERE user_id = ?', args: [req.user.id] }
        ];

        fields.forEach((f, i) => {
            queries.push({
                sql: 'INSERT INTO recipient_fields (user_id, field_name, field_order) VALUES (?, ?, ?)',
                args: [req.user.id, f.field_name, f.field_order || (i + 1)]
            });
        });

        await db.batch(queries);

        const updated = await db.execute({
            sql: 'SELECT * FROM recipient_fields WHERE user_id = ? ORDER BY field_order ASC',
            args: [req.user.id]
        });
        res.json(updated.rows);
    } catch (err) {
        console.error('Update recipient fields error:', err);
        res.status(500).json({ error: 'Failed to update recipient fields' });
    }
});

/**
 * PUT /api/profile/footer-fields
 * Replace footer field definitions.
 */
router.put('/footer-fields', async (req, res) => {
    try {
        const { fields } = req.body;
        if (!fields || !Array.isArray(fields)) {
            return res.status(400).json({ error: 'fields array required' });
        }

        const queries = [
            { sql: 'DELETE FROM footer_fields WHERE user_id = ?', args: [req.user.id] }
        ];

        fields.forEach((f, i) => {
            queries.push({
                sql: 'INSERT INTO footer_fields (user_id, field_name, field_order) VALUES (?, ?, ?)',
                args: [req.user.id, f.field_name, f.field_order || (i + 1)]
            });
        });

        await db.batch(queries);

        const updated = await db.execute({
            sql: 'SELECT * FROM footer_fields WHERE user_id = ? ORDER BY field_order ASC',
            args: [req.user.id]
        });
        res.json(updated.rows);
    } catch (err) {
        console.error('Update footer fields error:', err);
        res.status(500).json({ error: 'Failed to update footer fields' });
    }
});

module.exports = router;
