const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * GET /api/dashboard/metrics
 * Revenue-only metrics. Admin sees global; users see their own.
 */
router.get('/metrics', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const filter = isAdmin ? '' : 'WHERE user_id = ?';
        const params = isAdmin ? [] : [req.user.id];
        const clientFilter = isAdmin ? '' : 'WHERE user_id = ?';

        const [revRes, billsRes, clientsRes, recentRes] = await Promise.all([
            db.execute({
                sql: `SELECT COALESCE(SUM(grand_total), 0) AS total FROM bills ${filter}`,
                args: params
            }),
            db.execute({
                sql: `SELECT COUNT(*) AS count FROM bills ${filter}`,
                args: params
            }),
            db.execute({
                sql: `SELECT COUNT(*) AS count FROM clients ${clientFilter}`,
                args: params
            }),
            db.execute({
                sql: `
                    SELECT b.id, b.serial_number, b.bill_date, b.grand_total, c.recipient_data
                    FROM bills b
                    JOIN clients c ON b.client_id = c.id
                    ${isAdmin ? '' : 'WHERE b.user_id = ?'}
                    ORDER BY b.created_at DESC
                    LIMIT 5
                `,
                args: params
            })
        ]);

        const totalRevenue = revRes.rows[0].total;
        const totalBills = billsRes.rows[0].count;
        const totalClients = clientsRes.rows[0].count;
        const recentBills = recentRes.rows;

        // Parse client names
        const parsedBills = recentBills.map(b => {
            let rd = {};
            try { rd = JSON.parse(b.recipient_data); } catch {}
            return {
                ...b,
                client_name: rd['Name'] || rd['Company Name'] || Object.values(rd)[0] || 'Unknown'
            };
        });

        res.json({
            totalRevenue,
            totalBills,
            totalClients,
            recentBills: parsedBills
        });
    } catch (err) {
        console.error('Dashboard metrics error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
});

module.exports = router;
