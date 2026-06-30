const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    sl_no: { type: Number },
    col_values: { type: mongoose.Schema.Types.Mixed },  // flexible column data
    rate: { type: Number },     // paise
    amount: { type: Number }    // paise
}, { _id: false });

const billSchema = new mongoose.Schema({
    serial_number: { type: String, required: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bill_date: { type: String },

    subtotal: { type: Number, default: 0 },
    cgst_rate: { type: Number, default: 0 },       // percentage rate
    sgst_rate: { type: Number, default: 0 },       // percentage rate
    cgst_amount: { type: Number, default: 0 },     // paise
    sgst_amount: { type: Number, default: 0 },     // paise
    other_charges: { type: Number, default: 0 },   // paise
    round_off: { type: Number, default: 0 },       // paise (can be negative)
    grand_total: { type: Number, default: 0 },     // paise

    amount_in_words: { type: String },
    footer_data: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String },

    // Embedded line items
    lineItems: [lineItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
