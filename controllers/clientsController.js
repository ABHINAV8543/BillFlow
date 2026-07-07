const Client = require('../models/Client');
const AppError = require('../utils/AppError');

exports.searchClients = async (req, res, next) => {
    const { search } = req.query;
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? {} : { user_id: req.user._id };

    if (search) {
        filter.$or = [
            { 'recipient_data.Name': { $regex: search, $options: 'i' } },
            { 'recipient_data.Company Name': { $regex: search, $options: 'i' } }
        ];
    }

    const clients = await Client.find(filter).sort({ createdAt: -1 });

    const parsed = clients.map(c => {
        const client = c.toObject();
        const rd = client.recipient_data || {};
        const displayName = rd['Name'] || rd['Company Name'] || Object.values(rd)[0] || 'Unknown';
        return { ...client, display_name: displayName };
    });

    res.json(parsed);
};

exports.getClient = async (req, res, next) => {
    const isAdmin = req.user.role === 'admin';
    const filter = { _id: req.params.id };
    if (!isAdmin) {
        filter.user_id = req.user._id;
    }

    const client = await Client.findOne(filter);
    if (!client) {
        return next(new AppError('Client not found', 404));
    }

    res.json(client.toObject());
};
