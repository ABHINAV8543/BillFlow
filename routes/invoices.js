const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * Generate a unique invoice number: INV-YYYYMMDD-XXXX
 */
function generateInvoiceNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');

    const lastInvoice = db.prepare(
        `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`
    ).get(`INV-${datePart}-%`);

    let seq = 1;
    if (lastInvoice) {
        const parts = lastInvoice.invoice_number.split('-');
        seq = parseInt(parts[2], 10) + 1;
    }

    return `INV-${datePart}-${String(seq).padStart(4, '0')}`;
}

/**
 * GET /api/invoices
 * List invoices. Admin sees all; users see their own.
 * Supports ?search= (client name) and ?status= (paid|unpaid).
 */
router.get('/', (req, res) => {
    try {
        const { search, status } = req.query;
        const isAdmin = req.user.role === 'admin';

        let sql = `
            SELECT i.*, c.name AS client_name, c.email AS client_email
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (!isAdmin) {
            sql += ` AND i.user_id = ?`;
            params.push(req.user.id);
        }

        if (search) {
            sql += ` AND c.name LIKE ?`;
            params.push(`%${search}%`);
        }

        if (status && ['paid', 'unpaid'].includes(status)) {
            sql += ` AND i.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY i.created_at DESC`;

        const invoices = db.prepare(sql).all(...params);
        res.json(invoices);
    } catch (err) {
        console.error('List invoices error:', err);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

/**
 * GET /api/invoices/:id
 * Get a single invoice with line items and client info.
 */
router.get('/:id', (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const sql = `
            SELECT i.*, c.name AS client_name, c.email AS client_email,
                   c.phone AS client_phone, c.address AS client_address
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE i.id = ?${isAdmin ? '' : ' AND i.user_id = ?'}
        `;
        const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];

        const invoice = db.prepare(sql).get(...params);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const lineItems = db.prepare(
            'SELECT * FROM line_items WHERE invoice_id = ? ORDER BY id ASC'
        ).all(req.params.id);

        res.json({ ...invoice, lineItems });
    } catch (err) {
        console.error('Get invoice error:', err);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

/**
 * POST /api/invoices
 * Create a new invoice with line items (transactional).
 * Body: { client, invoiceDate, dueDate, cgstRate, sgstRate, notes, lineItems }
 */
router.post('/', (req, res) => {
    try {
        const { client, invoiceDate, dueDate, cgstRate, sgstRate, notes, lineItems } = req.body;

        if (!client || !client.name) {
            return res.status(400).json({ error: 'Client name is required' });
        }
        if (!lineItems || lineItems.length === 0) {
            return res.status(400).json({ error: 'At least one line item is required' });
        }
        if (!invoiceDate || !dueDate) {
            return res.status(400).json({ error: 'Invoice date and due date are required' });
        }

        const userId = req.user.id;

        const createInvoice = db.transaction(() => {
            // 1. Find or create client (scoped to user)
            let existingClient = db.prepare(
                'SELECT * FROM clients WHERE name = ? AND email = ? AND user_id = ?'
            ).get(client.name, client.email || null, userId);

            if (!existingClient) {
                const result = db.prepare(
                    'INSERT INTO clients (name, email, phone, address, user_id) VALUES (?, ?, ?, ?, ?)'
                ).run(client.name, client.email || null, client.phone || null, client.address || null, userId);
                existingClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
            }

            // 2. Calculate totals (all in paise)
            let subtotal = 0;
            const processedItems = lineItems.map(item => {
                const qty = parseInt(item.quantity, 10) || 1;
                const price = Math.round(parseFloat(item.unitPrice) * 100); // convert rupees to paise
                const lineTotal = qty * price;
                subtotal += lineTotal;
                return { ...item, quantity: qty, unitPrice: price, lineTotal };
            });

            const cRate = parseFloat(cgstRate) || 0;
            const sRate = parseFloat(sgstRate) || 0;
            const cgstAmount = Math.round(subtotal * (cRate / 100));
            const sgstAmount = Math.round(subtotal * (sRate / 100));
            const grandTotal = subtotal + cgstAmount + sgstAmount;

            // 3. Insert invoice
            const invoiceNumber = generateInvoiceNumber();
            const invResult = db.prepare(`
                INSERT INTO invoices (invoice_number, client_id, user_id, invoice_date, due_date, status, subtotal, cgst_rate, sgst_rate, cgst_amount, sgst_amount, grand_total, notes)
                VALUES (?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, ?, ?)
            `).run(invoiceNumber, existingClient.id, userId, invoiceDate, dueDate, subtotal, cRate, sRate, cgstAmount, sgstAmount, grandTotal, notes || null);

            const invoiceId = invResult.lastInsertRowid;

            // 4. Insert line items
            const insertItem = db.prepare(
                'INSERT INTO line_items (invoice_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)'
            );
            for (const item of processedItems) {
                insertItem.run(invoiceId, item.description, item.quantity, item.unitPrice, item.lineTotal);
            }

            return invoiceId;
        });

        const invoiceId = createInvoice();

        // Return the full invoice
        const invoice = db.prepare(`
            SELECT i.*, c.name AS client_name, c.email AS client_email
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE i.id = ?
        `).get(invoiceId);

        const items = db.prepare('SELECT * FROM line_items WHERE invoice_id = ?').all(invoiceId);

        res.status(201).json({ ...invoice, lineItems: items });
    } catch (err) {
        console.error('Create invoice error:', err);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

/**
 * PATCH /api/invoices/:id/status
 * Toggle paid/unpaid.
 */
router.patch('/:id/status', (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const sql = isAdmin
            ? 'SELECT * FROM invoices WHERE id = ?'
            : 'SELECT * FROM invoices WHERE id = ? AND user_id = ?';
        const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];

        const invoice = db.prepare(sql).get(...params);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
        db.prepare(
            `UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(newStatus, req.params.id);

        const updated = db.prepare(`
            SELECT i.*, c.name AS client_name
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE i.id = ?
        `).get(req.params.id);

        res.json(updated);
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
});

module.exports = router;
