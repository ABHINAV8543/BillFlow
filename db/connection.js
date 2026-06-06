const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

let dbPath = process.env.DB_PATH || './db/billing.db';

// Support both Turso URLs and local files
let dbUrl;
if (dbPath.startsWith('libsql://') || dbPath.startsWith('https://')) {
    dbUrl = dbPath;
} else {
    // It's a local file path
    const absolutePath = path.resolve(__dirname, '..', dbPath);
    const dbDir = path.dirname(absolutePath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    dbUrl = `file:${absolutePath}`;
}

const db = createClient({
    url: dbUrl,
    authToken: process.env.DB_AUTH_TOKEN
});

module.exports = db;
