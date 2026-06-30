const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient_data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

clientSchema.virtual('client_name').get(function () {
    const data = this.recipient_data || {};

    if (data['Name']) return data['Name'];
    if (data['Company Name']) return data['Company Name'];

    // Fall back to the first non-empty value
    const values = Object.values(data);
    return values.length > 0 ? values[0] : 'Unnamed Client';
});

module.exports = mongoose.model('Client', clientSchema);
