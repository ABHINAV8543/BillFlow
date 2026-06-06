const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * Convert number to words (Indian English).
 */
function numberToWords(num) {
    if (num === 0) return 'Zero Rupees Only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertChunk(n) {
        if (n === 0) return '';
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
    }

    // Indian numbering: Crore, Lakh, Thousand, Hundred
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let result = '';

    if (rupees >= 10000000) {
        result += convertChunk(Math.floor(rupees / 10000000)) + ' Crore ';
        num = rupees % 10000000;
    } else { num = rupees; }
    if (num >= 100000) {
        result += convertChunk(Math.floor(num / 100000)) + ' Lakh ';
        num = num % 100000;
    }
    if (num >= 1000) {
        result += convertChunk(Math.floor(num / 1000)) + ' Thousand ';
        num = num % 1000;
    }
    if (num > 0) {
        result += convertChunk(num);
    }

    result = result.trim() + ' Rupees';
    if (paise > 0) {
        result += ' and ' + convertChunk(paise) + ' Paise';
    }
    result += ' Only';
    return result;
}

/**
 * Generate serial number for a user's bills.
 */
async function generateSerialNumber(userId) {
    const res = await db.execute({
        sql: 'SELECT serial_number FROM bills WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        args: [userId]
    });

    let seq = 1;
    if (res.rows.length > 0) {
        const n = parseInt(res.rows[0].serial_number, 10);
        if (!isNaN(n)) seq = n + 1;
    }
    return String(seq).padStart(3, '0');
}

/**
 * GET /api/bills
 * List bills. Admin sees all; users see their own.
 */
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const isAdmin = req.user.role === 'admin';
        let sql = `
            SELECT b.*, c.recipient_data
            FROM bills b
            JOIN clients c ON b.client_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (!isAdmin) {
            sql += ' AND b.user_id = ?';
            params.push(req.user.id);
        }

        if (search) {
            sql += ' AND c.recipient_data LIKE ?';
            params.push(`%${search}%`);
        }

        sql += ' ORDER BY b.created_at DESC';

        const result = await db.execute({ sql, args: params });
        // Parse recipient_data for display
        const parsed = result.rows.map(b => {
            let rd = {};
            try { rd = JSON.parse(b.recipient_data); } catch {}
            const clientName = rd['Name'] || rd['Company Name'] || Object.values(rd)[0] || 'Unknown';
            return { ...b, client_name: clientName };
        });
        res.json(parsed);
    } catch (err) {
        console.error('List bills error:', err);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});

/**
 * GET /api/bills/:id
 * Get a single bill with line items and user profile for rendering.
 */
router.get('/:id', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const sql = `SELECT b.*, c.recipient_data FROM bills b JOIN clients c ON b.client_id = c.id WHERE b.id = ?${isAdmin ? '' : ' AND b.user_id = ?'}`;
        const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];

        const billRes = await db.execute({ sql, args: params });
        const bill = billRes.rows[0];
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        const [itemsRes, ownerRes, colsRes] = await Promise.all([
            db.execute({ sql: 'SELECT * FROM line_items WHERE bill_id = ? ORDER BY sl_no ASC', args: [req.params.id] }),
            db.execute({
                sql: `
                    SELECT bill_title, company_name, company_subtitle, company_address, company_phones,
                           company_gstin, company_pan, company_wef, bank_details, default_cgst, default_sgst
                    FROM users WHERE id = ?
                `,
                args: [bill.user_id]
            }),
            db.execute({ sql: 'SELECT * FROM bill_columns WHERE user_id = ? ORDER BY col_order ASC', args: [bill.user_id] })
        ]);

        const owner = ownerRes.rows[0];

        let bankDetails = [];
        try { bankDetails = JSON.parse(owner.bank_details || '[]'); } catch {}

        let recipientData = {};
        try { recipientData = JSON.parse(bill.recipient_data); } catch {}

        let footerData = {};
        try { footerData = JSON.parse(bill.footer_data || '{}'); } catch {}

        const parsedItems = itemsRes.rows.map(li => {
            let cv = {};
            try { cv = JSON.parse(li.col_values); } catch {}
            return { ...li, col_values: cv };
        });

        res.json({
            ...bill,
            recipient_data: recipientData,
            footer_data: footerData,
            lineItems: parsedItems,
            owner: { ...owner, bank_details: bankDetails },
            billColumns: colsRes.rows
        });
    } catch (err) {
        console.error('Get bill error:', err);
        res.status(500).json({ error: 'Failed to fetch bill' });
    }
});

/**
 * POST /api/bills
 * Create a new bill.
 */
router.post('/', async (req, res) => {
    try {
        const { recipientData, billDate, cgstRate, sgstRate, otherCharges, footerData, notes, lineItems } = req.body;

        if (!recipientData || !Object.values(recipientData).some(v => v)) {
            return res.status(400).json({ error: 'Recipient details are required' });
        }
        if (!lineItems || lineItems.length === 0) {
            return res.status(400).json({ error: 'At least one line item is required' });
        }
        if (!billDate) {
            return res.status(400).json({ error: 'Bill date is required' });
        }

        const userId = req.user.id;
        let billId;

        const tx = await db.transaction('write');
        try {
            // 1. Find or create client
            const recipientStr = JSON.stringify(recipientData);
            let clientRes = await tx.execute({
                sql: 'SELECT * FROM clients WHERE user_id = ? AND recipient_data = ?',
                args: [userId, recipientStr]
            });

            let client = clientRes.rows[0];
            if (!client) {
                const insClient = await tx.execute({
                    sql: 'INSERT INTO clients (user_id, recipient_data) VALUES (?, ?)',
                    args: [userId, recipientStr]
                });
                const newClientRes = await tx.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [insClient.lastInsertRowid.toString()] });
                client = newClientRes.rows[0];
            }

            // 2. Calculate totals
            let subtotal = 0;
            const processedItems = lineItems.map((item, i) => {
                const amount = parseInt(item.amount) || 0;
                subtotal += amount;
                return { sl_no: i + 1, col_values: JSON.stringify(item.colValues || {}), rate: parseInt(item.rate) || 0, amount };
            });

            const cRate = parseFloat(cgstRate) || 0;
            const sRate = parseFloat(sgstRate) || 0;
            const cgstAmount = Math.round(subtotal * cRate / 100);
            const sgstAmount = Math.round(subtotal * sRate / 100);
            const other = parseInt(otherCharges) || 0;
            const beforeRound = subtotal + cgstAmount + sgstAmount + other;
            const rounded = Math.round(beforeRound / 100) * 100;
            const roundOff = rounded - beforeRound;
            const grandTotal = rounded;

            const amountInWords = numberToWords(grandTotal / 100);

            // 3. Insert bill
            const serialNumber = await generateSerialNumber(userId);
            const footerStr = JSON.stringify(footerData || {});

            const billResult = await tx.execute({
                sql: `
                    INSERT INTO bills (serial_number, client_id, user_id, bill_date,
                        subtotal, cgst_rate, sgst_rate, cgst_amount, sgst_amount,
                        other_charges, round_off, grand_total, amount_in_words, footer_data, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [serialNumber, client.id, userId, billDate, subtotal, cRate, sRate, cgstAmount, sgstAmount, other, roundOff, grandTotal, amountInWords, footerStr, notes || null]
            });

            billId = billResult.lastInsertRowid.toString();

            // 4. Insert line items
            for (const item of processedItems) {
                await tx.execute({
                    sql: 'INSERT INTO line_items (bill_id, sl_no, col_values, rate, amount) VALUES (?, ?, ?, ?, ?)',
                    args: [billId, item.sl_no, item.col_values, item.rate, item.amount]
                });
            }

            await tx.commit();
        } catch (e) {
            await tx.rollback();
            throw e;
        }

        res.status(201).json({ id: billId, message: 'Bill created' });
    } catch (err) {
        console.error('Create bill error:', err);
        res.status(500).json({ error: 'Failed to create bill' });
    }
});

/**
 * PUT /api/bills/:id
 * Update an existing bill.
 */
router.put('/:id', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const checkRes = await db.execute({
            sql: isAdmin ? 'SELECT * FROM bills WHERE id = ?' : 'SELECT * FROM bills WHERE id = ? AND user_id = ?',
            args: isAdmin ? [req.params.id] : [req.params.id, req.user.id]
        });

        const billCheck = checkRes.rows[0];
        if (!billCheck) return res.status(404).json({ error: 'Bill not found' });

        const { recipientData, billDate, cgstRate, sgstRate, otherCharges, footerData, notes, lineItems } = req.body;

        if (!lineItems || lineItems.length === 0) {
            return res.status(400).json({ error: 'At least one line item is required' });
        }

        const tx = await db.transaction('write');
        try {
            const userId = billCheck.user_id;
            const recipientStr = JSON.stringify(recipientData);
            let clientRes = await tx.execute({
                sql: 'SELECT * FROM clients WHERE user_id = ? AND recipient_data = ?',
                args: [userId, recipientStr]
            });

            let client = clientRes.rows[0];
            if (!client) {
                const insClient = await tx.execute({
                    sql: 'INSERT INTO clients (user_id, recipient_data) VALUES (?, ?)',
                    args: [userId, recipientStr]
                });
                const newClientRes = await tx.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [insClient.lastInsertRowid.toString()] });
                client = newClientRes.rows[0];
            }

            let subtotal = 0;
            const processedItems = lineItems.map((item, i) => {
                const amount = parseInt(item.amount) || 0;
                subtotal += amount;
                return { sl_no: i + 1, col_values: JSON.stringify(item.colValues || {}), rate: parseInt(item.rate) || 0, amount };
            });

            const cRate = parseFloat(cgstRate) || 0;
            const sRate = parseFloat(sgstRate) || 0;
            const cgstAmount = Math.round(subtotal * cRate / 100);
            const sgstAmount = Math.round(subtotal * sRate / 100);
            const other = parseInt(otherCharges) || 0;
            const beforeRound = subtotal + cgstAmount + sgstAmount + other;
            const rounded = Math.round(beforeRound / 100) * 100;
            const roundOff = rounded - beforeRound;
            const grandTotal = rounded;
            const amountInWords = numberToWords(grandTotal / 100);
            const footerStr = JSON.stringify(footerData || {});

            await tx.execute({
                sql: `
                    UPDATE bills SET client_id = ?, bill_date = ?,
                        subtotal = ?, cgst_rate = ?, sgst_rate = ?, cgst_amount = ?, sgst_amount = ?,
                        other_charges = ?, round_off = ?, grand_total = ?, amount_in_words = ?,
                        footer_data = ?, notes = ?
                    WHERE id = ?
                `,
                args: [client.id, billDate || billCheck.bill_date, subtotal, cRate, sRate, cgstAmount, sgstAmount, other, roundOff, grandTotal, amountInWords, footerStr, notes || null, req.params.id]
            });

            await tx.execute({ sql: 'DELETE FROM line_items WHERE bill_id = ?', args: [req.params.id] });
            for (const item of processedItems) {
                await tx.execute({
                    sql: 'INSERT INTO line_items (bill_id, sl_no, col_values, rate, amount) VALUES (?, ?, ?, ?, ?)',
                    args: [req.params.id, item.sl_no, item.col_values, item.rate, item.amount]
                });
            }

            await tx.commit();
        } catch (e) {
            await tx.rollback();
            throw e;
        }

        res.json({ id: parseInt(req.params.id), message: 'Bill updated' });
    } catch (err) {
        console.error('Update bill error:', err);
        res.status(500).json({ error: 'Failed to update bill' });
    }
});

/**
 * DELETE /api/bills/:id
 * Delete a bill and its line items.
 */
router.delete('/:id', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const checkRes = await db.execute({
            sql: isAdmin ? 'SELECT * FROM bills WHERE id = ?' : 'SELECT * FROM bills WHERE id = ? AND user_id = ?',
            args: isAdmin ? [req.params.id] : [req.params.id, req.user.id]
        });

        const bill = checkRes.rows[0];
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        await db.batch([
            { sql: 'DELETE FROM line_items WHERE bill_id = ?', args: [req.params.id] },
            { sql: 'DELETE FROM bills WHERE id = ?', args: [req.params.id] }
        ]);

        res.json({ message: 'Bill deleted' });
    } catch (err) {
        console.error('Delete bill error:', err);
        res.status(500).json({ error: 'Failed to delete bill' });
    }
});

module.exports = router;
