const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('./connection');
const User = require('../models/User');
const Client = require('../models/Client');
const Bill = require('../models/Bill');

async function seed() {
    try {
        await connectDB();

        console.log('Dropping existing collections...');
        const collections = ['users', 'clients', 'bills'];
        for (const name of collections) {
            try {
                await mongoose.connection.db.dropCollection(name);
                console.log(`   Dropped: ${name}`);
            } catch (err) {
            
                if (err.codeName !== 'NamespaceNotFound') {
                    console.warn(`   Warning dropping ${name}:`, err.message);
                }
            }
        }

        console.log('\nSeeding data...');
        const adminHash = bcrypt.hashSync('admin123', 10);
        const userHash = bcrypt.hashSync('user123', 10);

        const adminUser = await User.create({
            username: 'admin',
            display_name: 'Alka Enterprises',
            email: 'admin@alkaenterprises.com',
            password_hash: adminHash,
            role: 'admin',
            bill_title: 'TAX INVOICE',
            company_name: 'ALKA ENTERPRISES',
            company_subtitle: 'TEA MERCHANT AND COMMISSION AGENT',
            company_address: 'SHAHPANJA, SHAHGANJ, JAUNPUR - 223101',
            company_phones: '9838266150, 9918156168',
            company_gstin: '09AJZPG6215D1Z0',
            company_pan: 'AJZPG6215D',
            company_wef: '01-07-2017',
            bank_details: [
                { bank: 'PUNJAB NATIONAL BANK', branch: 'SHAHGANJ', account: '4504008700001124', ifsc: 'PUNB0450400' },
                { bank: 'UNION BANK OF INDIA', branch: 'SHAHGANJ MAIN', account: '347101010011090', ifsc: 'UBIN0534714' }
            ],
            default_cgst: 2.5,
            default_sgst: 2.5,
            bill_columns: [
                { col_name: 'Particulars', col_type: 'text', col_order: 1, is_rate: false, is_qty: false, is_amount: false },
                { col_name: 'Bags', col_type: 'number', col_order: 2, is_rate: false, is_qty: false, is_amount: false },
                { col_name: 'Kgs.', col_type: 'number', col_order: 3, is_rate: false, is_qty: false, is_amount: false },
                { col_name: 'Total Quantity', col_type: 'number', col_order: 4, is_rate: false, is_qty: true, is_amount: false },
                { col_name: 'Rate', col_type: 'number', col_order: 5, is_rate: true, is_qty: false, is_amount: false },
                { col_name: 'Amount', col_type: 'number', col_order: 6, is_rate: false, is_qty: false, is_amount: true }
            ],
            recipient_fields: [
                { field_name: 'Name', field_order: 1 },
                { field_name: 'Address', field_order: 2 },
                { field_name: 'GSTIN/UIN', field_order: 3 },
                { field_name: 'HSN/ACS', field_order: 4 }
            ],
            footer_fields: [
                { field_name: 'E-Way Bill No.', field_order: 1 },
                { field_name: 'Transporter', field_order: 2 },
                { field_name: 'Vehicle No.', field_order: 3 }
            ],
            created_by: null
        });
        const adminId = adminUser._id;

        const user1 = await User.create({
            username: 'user1',
            display_name: 'Rahul Sharma',
            email: 'rahul@techsolutions.in',
            password_hash: userHash,
            role: 'user',
            bill_title: 'INVOICE',
            company_name: 'TECH SOLUTIONS PVT. LTD.',
            company_subtitle: 'SOFTWARE DEVELOPMENT & CONSULTING',
            company_address: '302, Cyber Tower, Hitech City, Hyderabad - 500081',
            company_phones: '+91-40-2354-8900',
            company_gstin: '36AABCT1234D1ZE',
            company_pan: 'AABCT1234D',
            company_wef: '01-04-2020',
            bank_details: [
                { bank: 'HDFC BANK', branch: 'HITECH CITY', account: '50100123456789', ifsc: 'HDFC0001234' }
            ],
            default_cgst: 9,
            default_sgst: 9,
            bill_columns: [
                { col_name: 'Description', col_type: 'text', col_order: 1, is_rate: false, is_qty: false, is_amount: false },
                { col_name: 'Hours', col_type: 'number', col_order: 2, is_rate: false, is_qty: true, is_amount: false },
                { col_name: 'Rate', col_type: 'number', col_order: 3, is_rate: true, is_qty: false, is_amount: false },
                { col_name: 'Amount', col_type: 'number', col_order: 4, is_rate: false, is_qty: false, is_amount: true }
            ],
            recipient_fields: [
                { field_name: 'Company Name', field_order: 1 },
                { field_name: 'Contact Person', field_order: 2 },
                { field_name: 'Address', field_order: 3 },
                { field_name: 'GSTIN', field_order: 4 },
                { field_name: 'Email', field_order: 5 }
            ],
            footer_fields: [
                { field_name: 'PO Number', field_order: 1 },
                { field_name: 'Project Code', field_order: 2 }
            ],
            created_by: adminId
        });
        const userId = user1._id;

        console.log('✅ Users created:');
        console.log('   → admin / admin123 (ALKA ENTERPRISES — tea merchant)');
        console.log('   → user1 / user123 (TECH SOLUTIONS PVT. LTD. — IT services)');

        const client1 = await Client.create({
            user_id: adminId,
            recipient_data: {
                'Name': 'Ravi Tea Traders',
                'Address': 'Sultanpur Road, Jaunpur - 222001',
                'GSTIN/UIN': '09BBBRT1234A1ZK',
                'HSN/ACS': '0 902'
            }
        });

        const client2 = await Client.create({
            user_id: adminId,
            recipient_data: {
                'Name': 'Sharma & Sons Tea House',
                'Address': 'Civil Lines, Varanasi - 221001',
                'GSTIN/UIN': '09AABSS5678B1ZP',
                'HSN/ACS': '0 902'
            }
        });

        const client3 = await Client.create({
            user_id: userId,
            recipient_data: {
                'Company Name': 'Infosys Ltd',
                'Contact Person': 'Rajesh Kumar',
                'Address': 'Electronics City, Bengaluru - 560100',
                'GSTIN': '29AABCI1234F1ZN',
                'Email': 'rajesh@infosys.com'
            }
        });

        console.log('✅ Clients created: 3');

        const sub1 = 5000000;
        const cgst1 = Math.round(sub1 * 2.5 / 100);
        const sgst1 = Math.round(sub1 * 2.5 / 100);
        const beforeRound1 = sub1 + cgst1 + sgst1;
        const rounded1 = Math.round(beforeRound1 / 100) * 100;
        const roundOff1 = rounded1 - beforeRound1;

        await Bill.create({
            serial_number: '001',
            client_id: client1._id,
            user_id: adminId,
            bill_date: '2026-06-01',
            subtotal: sub1,
            cgst_rate: 2.5,
            sgst_rate: 2.5,
            cgst_amount: cgst1,
            sgst_amount: sgst1,
            other_charges: 0,
            round_off: roundOff1,
            grand_total: rounded1,
            amount_in_words: 'Fifty Two Thousand Five Hundred Rupees Only',
            footer_data: {
                'E-Way Bill No.': 'EWB-2026-001234',
                'Transporter': 'Sharma Transport',
                'Vehicle No.': 'UP 65 AB 1234'
            },
            notes: null,
            lineItems: [
                {
                    sl_no: 1,
                    col_values: { 'Particulars': 'Assam CTC Tea', 'Bags': 10, 'Kgs.': 250, 'Total Quantity': 250 },
                    rate: 20000,
                    amount: 5000000
                }
            ]
        });

        const sub2 = 3200000;
        const cgst2 = Math.round(sub2 * 2.5 / 100);
        const sgst2 = Math.round(sub2 * 2.5 / 100);
        const beforeRound2 = sub2 + cgst2 + sgst2;
        const rounded2 = Math.round(beforeRound2 / 100) * 100;
        const roundOff2 = rounded2 - beforeRound2;

        await Bill.create({
            serial_number: '002',
            client_id: client2._id,
            user_id: adminId,
            bill_date: '2026-06-05',
            subtotal: sub2,
            cgst_rate: 2.5,
            sgst_rate: 2.5,
            cgst_amount: cgst2,
            sgst_amount: sgst2,
            other_charges: 0,
            round_off: roundOff2,
            grand_total: rounded2,
            amount_in_words: 'Thirty Three Thousand Six Hundred Rupees Only',
            footer_data: {
                'E-Way Bill No.': '',
                'Transporter': '',
                'Vehicle No.': ''
            },
            notes: null,
            lineItems: [
                {
                    sl_no: 1,
                    col_values: { 'Particulars': 'Darjeeling Green Tea', 'Bags': 5, 'Kgs.': 125, 'Total Quantity': 125 },
                    rate: 16000,
                    amount: 2000000
                },
                {
                    sl_no: 2,
                    col_values: { 'Particulars': 'Masala Chai Blend', 'Bags': 4, 'Kgs.': 80, 'Total Quantity': 80 },
                    rate: 15000,
                    amount: 1200000
                }
            ]
        });

        const sub3 = 12000000;
        const cgst3 = Math.round(sub3 * 9 / 100);
        const sgst3 = Math.round(sub3 * 9 / 100);
        const beforeRound3 = sub3 + cgst3 + sgst3;
        const rounded3 = Math.round(beforeRound3 / 100) * 100;
        const roundOff3 = rounded3 - beforeRound3;

        await Bill.create({
            serial_number: '001',
            client_id: client3._id,
            user_id: userId,
            bill_date: '2026-06-03',
            subtotal: sub3,
            cgst_rate: 9,
            sgst_rate: 9,
            cgst_amount: cgst3,
            sgst_amount: sgst3,
            other_charges: 0,
            round_off: roundOff3,
            grand_total: rounded3,
            amount_in_words: 'One Lakh Forty One Thousand Six Hundred Rupees Only',
            footer_data: {
                'PO Number': 'PO-INF-2026-0456',
                'Project Code': 'PROJ-HYD-001'
            },
            notes: null,
            lineItems: [
                {
                    sl_no: 1,
                    col_values: { 'Description': 'Backend API Development', 'Hours': 80 },
                    rate: 100000,
                    amount: 8000000
                },
                {
                    sl_no: 2,
                    col_values: { 'Description': 'Frontend UI Implementation', 'Hours': 40 },
                    rate: 100000,
                    amount: 4000000
                }
            ]
        });

        console.log('✅ Bills created: 3');

        console.log('\n✅ Sample data seeded:');
        console.log('   → Admin: 2 clients, 2 bills (tea merchant columns)');
        console.log('   → User1: 1 client, 1 bill (IT services columns)');
        console.log('   → Custom bill columns, recipient fields, footer fields per user');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed Error:', err);
        process.exit(1);
    }
}

seed();
