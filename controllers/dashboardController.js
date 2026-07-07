const Bill = require('../models/Bill');
const Client = require('../models/Client');

exports.getDashboard = async (req, res, next) => {
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? {} : { user_id: req.user._id };

    // Run all queries in parallel
    const [revenueResult, totalBills, recentBills] = await Promise.all([
        Bill.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$grand_total' } } }
        ]),
        Bill.countDocuments(filter),
        Bill.find(filter)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('client_id')
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Parse client_name from populated client_id.recipient_data
    const parsedRecentBills = recentBills.map(b => {
        const bill = b.toObject();
        let clientName = 'Unknown';
        if (bill.client_id && bill.client_id.recipient_data) {
            const rd = bill.client_id.recipient_data;
            clientName = rd['Name'] || rd['Company Name'] || Object.values(rd)[0] || 'Unknown';
        }
        return { ...bill, client_name: clientName };
    });

    res.render('dashboard', {
        title: 'Dashboard',
        activePage: 'dashboard',
        user: req.user,
        totalRevenue,
        totalBills,
        recentBills: parsedRecentBills
    });
};
