const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function connectDB() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI is undefined! Cannot connect to database.');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}

module.exports = { connectDB, mongoose };
