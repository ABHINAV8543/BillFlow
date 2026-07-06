const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Client = require('../models/Client');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const validate = require('../middleware/validate');
const { billSchema } = require('../validations/schemas');

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
    let rem = rupees;

    if (rem >= 10000000) {
        result += convertChunk(Math.floor(rem / 10000000)) + ' Crore ';
        rem = rem % 10000000;
    }
    if (rem >= 100000) {
        result += convertChunk(Math.floor(rem / 100000)) + ' Lakh ';
        rem = rem % 100000;
    }
    if (rem >= 1000) {
        result += convertChunk(Math.floor(rem / 1000)) + ' Thousand ';
        rem = rem % 1000;
    }
    if (rem > 0) {
        result += convertChunk(rem);
    }

    result = result.trim() + ' Rupees';
    if (paise > 0) {
        result += ' and ' + convertChunk(paise) + ' Paise';
    }
    result += ' Only';
    return result;
}

/**
 * Generate the next sequential serial number for a user's bills.
 */
async function generateSerialNumber(userId) {
    const lastBill = await Bill.findOne({ user_id: userId }).sort({ _id: -1 });
    let seq = 1;
    if (lastBill) {
        const n = parseInt(lastBill.serial_number, 10);
        if (!isNaN(n)) seq = n + 1;
    }
    return String(seq).padStart(3, '0');
}

/**
 * Helper: extract a display-friendly client name from recipient_data.
 */
function parseClientName(client) {
    if (!client || !client.recipient_data) return 'Unknown';
    const rd = client.recipient_data;
    return rd['Name'] || rd['Company Name'] || Object.values(rd)[0] || 'Unknown';
}

// ---------------------------------------------------------------------------
// PAGE ROUTES (render EJS)
// ---------------------------------------------------------------------------

/**
 * GET /bills
 * List all bills. Admin sees all; users see own.
 */
router.get('/', catchAsync(async (req, res, next) => {
    const isAdmin = req.user.role === 'admin';
        const filter = isAdmin ? {} : { user_id: req.user._id };

        const bills = await Bill.find(filter)
            .sort({ createdAt: -1 })
            .populate('client_id');

        const parsed = bills.map(b => {
            const bill = b.toObject();
            bill.client_name = parseClientName(bill.client_id);
            return bill;
        });
    res.render('bills/index', {
        title: 'Bills',
        activePage: 'bills',
        user: req.user,
        bills: parsed
    });
}));

/**
 * GET /bills/new
 * Render the bill creation form.
 */
router.get('/new', catchAsync(async (req, res, next) => {
    const clients = await Client.find({ user_id: req.user._id }).sort({ createdAt: -1 });

    res.render('bills/form', {
        title: 'New Bill',
        activePage: 'new-bill',
        user: req.user,
        bill: null,
        profile: req.user,
        clients
    });
}));

/**
 * GET /bills/:id
 * View a single bill. Renders the bill view page.
 */
router.get('/:id', catchAsync(async (req, res, next) => {
    const isAdmin = req.user.role === 'admin';
        const filter = { _id: req.params.id };
        if (!isAdmin) {
            filter.user_id = req.user._id;
        }

    const bill = await Bill.findOne(filter).populate('client_id');
    if (!bill) {
        return next(new AppError('Bill not found', 404));
    }

        if (req.originalUrl.startsWith('/api')) {
            return res.json(bill);
        }

        // Get the owner user for company profile / bill columns
        const owner = await User.findById(bill.user_id);

        res.render('bills/view', {
            title: 'Bill',
            activePage: 'bills',
            user: req.user,
            bill: bill.toObject(),
            owner,
            billColumns: owner ? owner.bill_columns : []
        });
}));

/**
 * GET /bills/:id/edit
 * Render the bill edit form with existing data.
 */
router.get('/:id/edit', catchAsync(async (req, res, next) => {
        const isAdmin = req.user.role === 'admin';
        const filter = { _id: req.params.id };
        if (!isAdmin) {
            filter.user_id = req.user._id;
        }

        const bill = await Bill.findOne(filter).populate('client_id');
        if (!bill) {
            return next(new AppError('Bill not found', 404));
        }

        const owner = await User.findById(bill.user_id);
        const clients = await Client.find({ user_id: bill.user_id }).sort({ createdAt: -1 });

        res.render('bills/form', {
            title: 'Edit Bill',
            activePage: 'bills',
            user: req.user,
            bill: bill.toObject(),
            profile: owner,
            clients
        });
}));

// ---------------------------------------------------------------------------
// API ROUTES (return JSON for AJAX)
// ---------------------------------------------------------------------------

/**
 * POST /bills
 * Create a new bill.
 * Body: { client_id?, recipientData?, serial_number?, bill_date, lineItems,
 *         cgstRate, sgstRate, otherCharges, footerData, notes }
 */
router.post('/', validate(billSchema), catchAsync(async (req, res, next) => {
        const {
            client_id, recipientData, billDate, cgstRate, sgstRate,
            otherCharges, footerData, notes, lineItems, serial_number
        } = req.body;

        if (!client_id && (!recipientData || !Object.values(recipientData).some(v => v))) {
            return next(new AppError('Recipient details are required', 400));
        }

        const userId = req.user._id;

        // 1. Resolve or create client
        let resolvedClientId = client_id;
        if (!resolvedClientId && recipientData) {
            // Look for an existing client with the same recipient_data
            let existingClient = await Client.findOne({
                user_id: userId,
                recipient_data: recipientData
            });

            if (!existingClient) {
                existingClient = await Client.create({
                    user_id: userId,
                    recipient_data: recipientData
                });
            }
            resolvedClientId = existingClient._id;
        }

        // 2. Calculate totals (all monetary values in paise)
        let subtotal = 0;
        const processedItems = lineItems.map((item, i) => {
            const amount = parseInt(item.amount) || 0;
            subtotal += amount;
            return {
                sl_no: i + 1,
                col_values: item.colValues || {},
                rate: parseInt(item.rate) || 0,
                amount
            };
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

        // 3. Generate serial number
        let serialNumber = serial_number;
        if (!serialNumber) {
            serialNumber = await generateSerialNumber(userId);
        }

        // 4. Create bill document
        const bill = await Bill.create({
            serial_number: serialNumber,
            client_id: resolvedClientId,
            user_id: userId,
            bill_date: billDate,
            subtotal,
            cgst_rate: cRate,
            sgst_rate: sRate,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            other_charges: other,
            round_off: roundOff,
            grand_total: grandTotal,
            amount_in_words: amountInWords,
            footer_data: footerData || {},
            notes: notes || null,
            lineItems: processedItems
        });

        res.status(201).json({ id: bill._id, message: 'Bill created' });
}));

/**
 * PUT /bills/:id
 * Update an existing bill.
 */
router.put('/:id', validate(billSchema), catchAsync(async (req, res, next) => {
        const isAdmin = req.user.role === 'admin';
        const filter = { _id: req.params.id };
        if (!isAdmin) {
            filter.user_id = req.user._id;
        }

    const bill = await Bill.findOne(filter);
    if (!bill) {
        return next(new AppError('Bill not found', 404));
    }

        const {
            recipientData, billDate, cgstRate, sgstRate,
            otherCharges, footerData, notes, lineItems, serial_number
        } = req.body;

        const userId = bill.user_id;

        // Resolve client
        let resolvedClientId = bill.client_id;
        if (recipientData) {
            let existingClient = await Client.findOne({
                user_id: userId,
                recipient_data: recipientData
            });
            if (!existingClient) {
                existingClient = await Client.create({
                    user_id: userId,
                    recipient_data: recipientData
                });
            }
            resolvedClientId = existingClient._id;
        }

        // Calculate totals
        let subtotal = 0;
        const processedItems = lineItems.map((item, i) => {
            const amount = parseInt(item.amount) || 0;
            subtotal += amount;
            return {
                sl_no: i + 1,
                col_values: item.colValues || {},
                rate: parseInt(item.rate) || 0,
                amount
            };
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

        // Update bill
        if (serial_number) {
            bill.serial_number = serial_number;
        }
        bill.client_id = resolvedClientId;
        bill.bill_date = billDate || bill.bill_date;
        bill.subtotal = subtotal;
        bill.cgst_rate = cRate;
        bill.sgst_rate = sRate;
        bill.cgst_amount = cgstAmount;
        bill.sgst_amount = sgstAmount;
        bill.other_charges = other;
        bill.round_off = roundOff;
        bill.grand_total = grandTotal;
        bill.amount_in_words = amountInWords;
        bill.footer_data = footerData || {};
        bill.notes = notes || null;
        bill.lineItems = processedItems;

        await bill.save();

    res.json({ id: bill._id, message: 'Bill updated' });
}));

/**
 * DELETE /bills/:id
 * Delete a bill. Admin can delete any; users can delete only their own.
 * Also cleans up orphaned clients (clients with no remaining bills).
 */
router.delete('/:id', catchAsync(async (req, res, next) => {
        const isAdmin = req.user.role === 'admin';
        const filter = { _id: req.params.id };
        if (!isAdmin) {
            filter.user_id = req.user._id;
        }

    const bill = await Bill.findOne(filter);
    if (!bill) {
        return next(new AppError('Bill not found', 404));
    }

        const clientId = bill.client_id;
        await Bill.findByIdAndDelete(bill._id);

        // Clean up orphaned client if no other bills reference it
        if (clientId) {
            const remaining = await Bill.countDocuments({ client_id: clientId });
            if (remaining === 0) {
                await Client.findByIdAndDelete(clientId);
            }
        }

    res.json({ message: 'Bill deleted' });
}));

module.exports = router;
