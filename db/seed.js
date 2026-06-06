/**
 * Seed script v3 — Custom bill templates, company profiles.
 * Run with: npm run seed
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Delete existing databases to start fresh (only if local file)
const dbPath = process.env.DB_PATH || './db/billing.db';
if (!dbPath.startsWith('libsql://') && !dbPath.startsWith('https://')) {
    const localPath = path.resolve(__dirname, '..', dbPath);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    // Remove WAL/SHM files too
    [localPath + '-wal', localPath + '-shm'].forEach(f => { try { fs.unlinkSync(f); } catch {} });
}

const db = require('./connection');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        console.log('Running schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await db.executeMultiple(schema);

        console.log('Seeding data...');
        const adminHash = bcrypt.hashSync('admin123', 10);
        const userHash = bcrypt.hashSync('user123', 10);

        // ========== USERS ==========
        const insertUserSql = `
            INSERT INTO users (username, display_name, email, password_hash, role,
                bill_title, company_name, company_subtitle, company_address, company_phones,
                company_gstin, company_pan, company_wef, bank_details,
                default_cgst, default_sgst, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const resAdmin = await db.execute({
            sql: insertUserSql,
            args: [
                'admin', 'Alka Enterprises', 'admin@alkaenterprises.com', adminHash, 'admin',
                'TAX INVOICE', 'ALKA ENTERPRISES', 'TEA MERCHANT AND COMMISSION AGENT',
                'SHAHPANJA, SHAHGANJ, JAUNPUR - 223101', '9838266150, 9918156168',
                '09AJZPG6215D1Z0', 'AJZPG6215D', '01-07-2017',
                JSON.stringify([
                    { bank: 'PUNJAB NATIONAL BANK', branch: 'SHAHGANJ', account: '4504008700001124', ifsc: 'PUNB0450400' },
                    { bank: 'UNION BANK OF INDIA', branch: 'SHAHGANJ MAIN', account: '347101010011090', ifsc: 'UBIN0534714' }
                ]),
                2.5, 2.5, null
            ]
        });
        const adminId = resAdmin.lastInsertRowid.toString();

        const resUser = await db.execute({
            sql: insertUserSql,
            args: [
                'user1', 'Rahul Sharma', 'rahul@techsolutions.in', userHash, 'user',
                'INVOICE', 'TECH SOLUTIONS PVT. LTD.', 'SOFTWARE DEVELOPMENT & CONSULTING',
                '302, Cyber Tower, Hitech City, Hyderabad - 500081', '+91-40-2354-8900',
                '36AABCT1234D1ZE', 'AABCT1234D', '01-04-2020',
                JSON.stringify([
                    { bank: 'HDFC BANK', branch: 'HITECH CITY', account: '50100123456789', ifsc: 'HDFC0001234' }
                ]),
                9, 9, adminId
            ]
        });
        const userId = resUser.lastInsertRowid.toString();

        console.log(`✅ Users created:`);
        console.log(`   → admin / admin123 (ALKA ENTERPRISES — tea merchant)`);
        console.log(`   → user1 / user123 (TECH SOLUTIONS PVT. LTD. — IT services)`);

        // ========== BILL COLUMNS ==========
        const insertColSql = 'INSERT INTO bill_columns (user_id, col_name, col_type, col_order, is_rate, is_qty, is_amount) VALUES (?, ?, ?, ?, ?, ?, ?)';

        await db.batch([
            { sql: insertColSql, args: [adminId, 'Particulars', 'text', 1, 0, 0, 0] },
            { sql: insertColSql, args: [adminId, 'Bags', 'number', 2, 0, 0, 0] },
            { sql: insertColSql, args: [adminId, 'Kgs.', 'number', 3, 0, 0, 0] },
            { sql: insertColSql, args: [adminId, 'Total Quantity', 'number', 4, 0, 1, 0] },
            { sql: insertColSql, args: [adminId, 'Rate', 'number', 5, 1, 0, 0] },
            { sql: insertColSql, args: [adminId, 'Amount', 'number', 6, 0, 0, 1] },

            { sql: insertColSql, args: [userId, 'Description', 'text', 1, 0, 0, 0] },
            { sql: insertColSql, args: [userId, 'Hours', 'number', 2, 0, 1, 0] },
            { sql: insertColSql, args: [userId, 'Rate', 'number', 3, 1, 0, 0] },
            { sql: insertColSql, args: [userId, 'Amount', 'number', 4, 0, 0, 1] }
        ]);

        // ========== RECIPIENT FIELDS ==========
        const insertRecipientSql = 'INSERT INTO recipient_fields (user_id, field_name, field_order) VALUES (?, ?, ?)';
        await db.batch([
            { sql: insertRecipientSql, args: [adminId, 'Name', 1] },
            { sql: insertRecipientSql, args: [adminId, 'Address', 2] },
            { sql: insertRecipientSql, args: [adminId, 'GSTIN/UIN', 3] },
            { sql: insertRecipientSql, args: [adminId, 'HSN/ACS', 4] },

            { sql: insertRecipientSql, args: [userId, 'Company Name', 1] },
            { sql: insertRecipientSql, args: [userId, 'Contact Person', 2] },
            { sql: insertRecipientSql, args: [userId, 'Address', 3] },
            { sql: insertRecipientSql, args: [userId, 'GSTIN', 4] },
            { sql: insertRecipientSql, args: [userId, 'Email', 5] }
        ]);

        // ========== FOOTER FIELDS ==========
        const insertFooterSql = 'INSERT INTO footer_fields (user_id, field_name, field_order) VALUES (?, ?, ?)';
        await db.batch([
            { sql: insertFooterSql, args: [adminId, 'E-Way Bill No.', 1] },
            { sql: insertFooterSql, args: [adminId, 'Transporter', 2] },
            { sql: insertFooterSql, args: [adminId, 'Vehicle No.', 3] },

            { sql: insertFooterSql, args: [userId, 'PO Number', 1] },
            { sql: insertFooterSql, args: [userId, 'Project Code', 2] }
        ]);

        // ========== SAMPLE CLIENTS ==========
        const insertClientSql = 'INSERT INTO clients (user_id, recipient_data) VALUES (?, ?)';
        const c1 = await db.execute({ sql: insertClientSql, args: [adminId, JSON.stringify({
            'Name': 'Ravi Tea Traders',
            'Address': 'Sultanpur Road, Jaunpur - 222001',
            'GSTIN/UIN': '09BBBRT1234A1ZK',
            'HSN/ACS': '0 902'
        })]});
        const adminClient1 = c1.lastInsertRowid.toString();

        const c2 = await db.execute({ sql: insertClientSql, args: [adminId, JSON.stringify({
            'Name': 'Sharma & Sons Tea House',
            'Address': 'Civil Lines, Varanasi - 221001',
            'GSTIN/UIN': '09AABSS5678B1ZP',
            'HSN/ACS': '0 902'
        })]});
        const adminClient2 = c2.lastInsertRowid.toString();

        const c3 = await db.execute({ sql: insertClientSql, args: [userId, JSON.stringify({
            'Company Name': 'Infosys Ltd',
            'Contact Person': 'Rajesh Kumar',
            'Address': 'Electronics City, Bengaluru - 560100',
            'GSTIN': '29AABCI1234F1ZN',
            'Email': 'rajesh@infosys.com'
        })]});
        const userClient1 = c3.lastInsertRowid.toString();

        // ========== SAMPLE BILLS ==========
        const insertBillSql = `
            INSERT INTO bills (serial_number, client_id, user_id, bill_date,
                subtotal, cgst_rate, sgst_rate, cgst_amount, sgst_amount,
                other_charges, round_off, grand_total, amount_in_words, footer_data, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertLineItemSql = `
            INSERT INTO line_items (bill_id, sl_no, col_values, rate, amount)
            VALUES (?, ?, ?, ?, ?)
        `;

        // Bill 1
        const sub1 = 5000000;
        const cgst1 = Math.round(sub1 * 2.5 / 100);
        const sgst1 = Math.round(sub1 * 2.5 / 100);
        const beforeRound1 = sub1 + cgst1 + sgst1;
        const rounded1 = Math.round(beforeRound1 / 100) * 100;
        const roundOff1 = rounded1 - beforeRound1;

        const b1 = await db.execute({ sql: insertBillSql, args: [
            '001', adminClient1, adminId, '2026-06-01',
            sub1, 2.5, 2.5, cgst1, sgst1, 0, roundOff1, rounded1,
            'Fifty Two Thousand Five Hundred Rupees Only',
            JSON.stringify({ 'E-Way Bill No.': 'EWB-2026-001234', 'Transporter': 'Sharma Transport', 'Vehicle No.': 'UP 65 AB 1234' }),
            null
        ]});
        const bill1 = b1.lastInsertRowid.toString();

        await db.execute({ sql: insertLineItemSql, args: [bill1, 1, JSON.stringify({ 'Particulars': 'Assam CTC Tea', 'Bags': 10, 'Kgs.': 250, 'Total Quantity': 250 }), 20000, 5000000] });

        // Bill 2
        const sub2 = 3200000;
        const cgst2 = Math.round(sub2 * 2.5 / 100);
        const sgst2 = Math.round(sub2 * 2.5 / 100);
        const beforeRound2 = sub2 + cgst2 + sgst2;
        const rounded2 = Math.round(beforeRound2 / 100) * 100;
        const roundOff2 = rounded2 - beforeRound2;

        const b2 = await db.execute({ sql: insertBillSql, args: [
            '002', adminClient2, adminId, '2026-06-05',
            sub2, 2.5, 2.5, cgst2, sgst2, 0, roundOff2, rounded2,
            'Thirty Three Thousand Six Hundred Rupees Only',
            JSON.stringify({ 'E-Way Bill No.': '', 'Transporter': '', 'Vehicle No.': '' }),
            null
        ]});
        const bill2 = b2.lastInsertRowid.toString();

        await db.batch([
            { sql: insertLineItemSql, args: [bill2, 1, JSON.stringify({ 'Particulars': 'Darjeeling Green Tea', 'Bags': 5, 'Kgs.': 125, 'Total Quantity': 125 }), 16000, 2000000] },
            { sql: insertLineItemSql, args: [bill2, 2, JSON.stringify({ 'Particulars': 'Masala Chai Blend', 'Bags': 4, 'Kgs.': 80, 'Total Quantity': 80 }), 15000, 1200000] }
        ]);

        // Bill 3
        const sub3 = 12000000;
        const cgst3 = Math.round(sub3 * 9 / 100);
        const sgst3 = Math.round(sub3 * 9 / 100);
        const beforeRound3 = sub3 + cgst3 + sgst3;
        const rounded3 = Math.round(beforeRound3 / 100) * 100;
        const roundOff3 = rounded3 - beforeRound3;

        const b3 = await db.execute({ sql: insertBillSql, args: [
            '001', userClient1, userId, '2026-06-03',
            sub3, 9, 9, cgst3, sgst3, 0, roundOff3, rounded3,
            'One Lakh Forty One Thousand Six Hundred Rupees Only',
            JSON.stringify({ 'PO Number': 'PO-INF-2026-0456', 'Project Code': 'PROJ-HYD-001' }),
            null
        ]});
        const bill3 = b3.lastInsertRowid.toString();

        await db.batch([
            { sql: insertLineItemSql, args: [bill3, 1, JSON.stringify({ 'Description': 'Backend API Development', 'Hours': 80 }), 100000, 8000000] },
            { sql: insertLineItemSql, args: [bill3, 2, JSON.stringify({ 'Description': 'Frontend UI Implementation', 'Hours': 40 }), 100000, 4000000] }
        ]);

        console.log(`\n✅ Sample data seeded:`);
        console.log(`   → Admin: 2 clients, 2 bills (tea merchant columns)`);
        console.log(`   → User1: 1 client, 1 bill (IT services columns)`);
        console.log(`   → Custom bill columns, recipient fields, footer fields per user`);
    } catch (err) {
        console.error('Seed Error:', err);
    }
}

seed();
