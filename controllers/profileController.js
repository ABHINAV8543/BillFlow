const User = require('../models/User');

exports.getProfile = async (req, res, next) => {
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
};

exports.updateProfile = async (req, res, next) => {
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
};

exports.updateColumns = async (req, res, next) => {
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
};

exports.updateRecipientFields = async (req, res, next) => {
    const { fields } = req.body;

    const processed = fields.map((f, i) => ({
        field_name: f.field_name,
        field_order: f.field_order || (i + 1)
    }));

    const user = await User.findById(req.user._id);
    user.recipient_fields = processed;
    await user.save();

    res.json(user.recipient_fields);
};

exports.updateFooterFields = async (req, res, next) => {
    const { fields } = req.body;

    const processed = fields.map((f, i) => ({
        field_name: f.field_name,
        field_order: f.field_order || (i + 1)
    }));

    const user = await User.findById(req.user._id);
    user.footer_fields = processed;
    await user.save();

    res.json(user.footer_fields);
};
