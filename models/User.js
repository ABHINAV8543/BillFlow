const mongoose = require('mongoose');

const bankDetailSchema = new mongoose.Schema({
    bank: { type: String },
    branch: { type: String },
    account: { type: String },
    ifsc: { type: String }
}, { _id: false });

const billColumnSchema = new mongoose.Schema({
    col_name: { type: String },
    col_type: { type: String, default: 'text' },
    col_order: { type: Number },
    is_rate: { type: Boolean, default: false },
    is_qty: { type: Boolean, default: false },
    is_amount: { type: Boolean, default: false }
}, { _id: false });

const recipientFieldSchema = new mongoose.Schema({
    field_name: { type: String },
    field_order: { type: Number }
}, { _id: false });

const footerFieldSchema = new mongoose.Schema({
    field_name: { type: String },
    field_order: { type: Number }
}, { _id: false });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    display_name: { type: String },
    email: { type: String },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },

    // Company profile
    bill_title: { type: String },
    company_name: { type: String },
    company_subtitle: { type: String },
    company_address: { type: String },
    company_phones: { type: String },
    company_gstin: { type: String },
    company_pan: { type: String },
    company_wef: { type: String },

    // Bank accounts
    bank_details: [bankDetailSchema],

    // Default tax rates (percentages, not paise)
    default_cgst: { type: Number, default: 0 },
    default_sgst: { type: Number, default: 0 },

    // Bill template configuration
    bill_columns: [billColumnSchema],
    recipient_fields: [recipientFieldSchema],
    footer_fields: [footerFieldSchema],

    // Who created this user (null for self-created admins)
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
