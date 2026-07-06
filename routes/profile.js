const express = require('express');
const router = express.Router();
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const validate = require('../middleware/validate');
const { updateProfileSchema, updateColumnsSchema, updateRecipientFieldsSchema, updateFooterFieldsSchema } = require('../validations/schemas');

router.get('/', catchAsync(async (req, res, next) => {
        const fullUser = await User.findById(req.user._id);
        if (!fullUser) {
            return res.status(404).render('error', { message: 'User not found' });
        }
        if (req.originalUrl.startsWith('/api')) {
            return res.json(fullUser);
        }

        res.render('profile', {
            title: 'Company Profile',
            activePage: 'profile',
            user: req.user,
            profile: fullUser
        });
}));

/**
 * PATCH /profile
 * Update company detail fields on the user document.
 * Returns JSON (consumed by AJAX).
 */
router.patch('/', validate(updateProfileSchema), catchAsync(async (req, res, next) => {
        const body = req.body;
        const updates = {};

        // Handle bill_title (allow setting to empty string / null)
        if (body.bill_title !== undefined) {
            updates.bill_title = body.bill_title || null;
        }

        const fields = [
            'company_name', 'company_subtitle', 'company_address', 'company_phones',
            'company_email', 'company_gstin', 'company_pan', 'company_wef', 'default_cgst', 'default_sgst'
        ];
        for (const f of fields) {
            if (body[f] !== undefined) {
                updates[f] = body[f];
            }
        }

        if (body.bank_details !== undefined) {
            updates.bank_details = body.bank_details;
        }

        if (Object.keys(updates).length === 0) {
            return res.json({ message: 'Nothing to update' });
        }

        await User.findByIdAndUpdate(req.user._id, { $set: updates });
        res.json({ message: 'Profile updated' });
}));

/**
 * PUT /profile/columns
 * Replace bill_columns array entirely.
 * Body: { columns: [{ col_name, col_type, col_order, is_rate, is_qty, is_amount }] }
 * Returns JSON with updated columns.
 */
router.put('/columns', validate(updateColumnsSchema), catchAsync(async (req, res, next) => {
    const { columns } = req.body;

        const processed = columns.map((col, i) => ({
            col_name: col.col_name,
            col_type: col.col_type || 'text',
            col_order: col.col_order || (i + 1),
            is_rate: !!col.is_rate,
            is_qty: !!col.is_qty,
            is_amount: !!col.is_amount
        }));

        const user = await User.findById(req.user._id);
        user.bill_columns = processed;
        await user.save();

        res.json(user.bill_columns);
}));

/**
 * PUT /profile/recipient-fields
 * Replace recipient_fields array entirely.
 * Body: { fields: [{ field_name, field_order }] }
 * Returns JSON with updated fields.
 */
router.put('/recipient-fields', validate(updateRecipientFieldsSchema), catchAsync(async (req, res, next) => {
    const { fields } = req.body;

        const processed = fields.map((f, i) => ({
            field_name: f.field_name,
            field_order: f.field_order || (i + 1)
        }));

        const user = await User.findById(req.user._id);
        user.recipient_fields = processed;
        await user.save();

        res.json(user.recipient_fields);
}));

/**
 * PUT /profile/footer-fields
 * Replace footer_fields array entirely.
 * Body: { fields: [{ field_name, field_order }] }
 * Returns JSON with updated fields.
 */
router.put('/footer-fields', validate(updateFooterFieldsSchema), catchAsync(async (req, res, next) => {
    const { fields } = req.body;

        const processed = fields.map((f, i) => ({
            field_name: f.field_name,
            field_order: f.field_order || (i + 1)
        }));

        const user = await User.findById(req.user._id);
        user.footer_fields = processed;
        await user.save();

        res.json(user.footer_fields);
}));

module.exports = router;
