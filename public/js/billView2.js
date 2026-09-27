/**
 * billView.js — Tax Invoice View
 * Uses a SINGLE unified column list to build header, data rows, and total row
 * so column alignment is guaranteed.
 */
window.renderBillView = async function (container, idOrData) {
    function formatCurrency(paise) { 
        return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
    }
    function formatDate(iso) { 
        if (!iso) return '—'; 
        const d = new Date(iso + 'T00:00:00'); 
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); 
    }

    try {
        let bill;
        if (typeof idOrData === 'object') {
            bill = idOrData; // preloaded data
        } else {
            const res = await fetch(`/api/bills/${idOrData}`);
            if (!res.ok) throw new Error('Bill not found');
            bill = await res.json();
        }
        
        const o = bill.owner; // company profile
        const cols = bill.billColumns || [];
        const rd = bill.client_id ? (bill.client_id.recipient_data || {}) : {};
        const fd = bill.footer_data || {};
        const banks = o.bank_details || [];

        // ── Build a SINGLE ordered column list ──
        // Each entry: { name, type, role, width }
        // role = 'sl' | 'data' | 'qty' | 'rate' | 'amount'
        const slCol = cols.find(c => c.col_type === 'sl') || { col_name: 'Sl.' };
        const amountCol = cols.find(c => c.is_amount) || { col_name: 'Amount' };

        const allCols = [{ name: slCol.col_name, type: 'serial', role: 'sl', width: 12 }];

        cols.forEach(c => {
            if (c.col_type === 'sl' || c.is_amount) return;
            if (c.is_rate) {
                allCols.push({ name: c.col_name, type: 'number', role: 'rate', width: 12 });
            } else if (c.is_qty) {
                allCols.push({ name: c.col_name, type: 'number', role: 'qty', width: 12 });
            } else {
                allCols.push({ name: c.col_name, type: c.col_type, role: 'data', width: 0 });
            }
        });

        allCols.push({ name: amountCol.col_name + ' (₹)', type: 'number', role: 'amount', width: 15 });

        // Calculate text column widths (share remaining space)
        const fixedW = allCols.reduce((s, c) => s + c.width, 0);
        const textCols = allCols.filter(c => c.width === 0);
        const textW = textCols.length > 0 ? Math.floor((100 - fixedW) / textCols.length) : 0;
        textCols.forEach(c => { c.width = textW; });

        // ── Header row ──
        const headerRow = allCols.map(c => {
            const align = (c.role === 'rate' || c.role === 'amount') ? ' class="text-right"' : '';
            return `<th style="width:${c.width}%"${align}>${c.name}</th>`;
        }).join('');

        // ── Data rows ──
        const itemRows = bill.lineItems.map(li => {
            const cv = li.col_values || {};
            return '<tr>' + allCols.map(c => {
                if (c.role === 'sl') return `<td class="text-center">${li.sl_no}</td>`;
                if (c.role === 'rate') return `<td class="text-right">${formatCurrency(li.rate)}</td>`;
                if (c.role === 'amount') return `<td class="text-right font-bold">${formatCurrency(li.amount)}</td>`;
                let val = cv[c.name] !== undefined ? cv[c.name] : '';
                if (c.type === 'number' && val !== '') {
                    val = parseFloat(parseFloat(val).toFixed(2));
                }
                const align = c.type === 'number' ? ' class="text-right"' : '';
                return `<td${align}>${val}</td>`;
            }).join('') + '</tr>';
        }).join('');

        // ── Total row — same allCols iteration → guaranteed same cell count ──
        const totalRow = '<tr class="total-row">' + allCols.map(c => {
            if (c.role === 'sl') return '<td class="font-bold">TOTAL</td>';
            if (c.role === 'rate') return '<td>&nbsp;</td>';
            if (c.role === 'amount') return `<td class="text-right font-bold">${formatCurrency(bill.subtotal)}</td>`;
            if (c.type === 'number' || c.role === 'qty') {
                const sum = bill.lineItems.reduce((s, li) => s + (parseFloat(li.col_values[c.name]) || 0), 0);
                return `<td class="text-right font-bold">${parseFloat(sum.toFixed(2))}</td>`;
            }
            return '<td>&nbsp;</td>';
        }).join('') + '</tr>';

        // Recipient fields
        const recipientHTML = Object.entries(rd).map(([k, v]) =>
            `<div class="bill-field"><span class="bill-field-label">${k}:</span> <span>${v || ''}</span></div>`
        ).join('');

        // Bank details
        const bankHTML = banks.map((b, i) =>
            `<div class="bank-row">${i + 1}. ${b.bank}, ${b.branch}<br>&nbsp;&nbsp;&nbsp;A/c No.: ${b.account}&nbsp;&nbsp;IFSC CODE- ${b.ifsc}</div>`
        ).join('');

        // Footer fields
        const footerFieldsHTML = Object.entries(fd).map(([k, v]) =>
            `<div class="bill-field"><span class="bill-field-label">${k}:</span> <span>${v || ''}</span></div>`
        ).join('');

        // Phone numbers and Email
        const phones = (o.company_phones || '').split(',').map(p => p.trim()).filter(Boolean);
        const email = (o.company_email || '').trim();

        container.innerHTML = `
            <style>
                /* Template 2 Custom Styling - Radical Difference */
                .bill-page {
                    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                    border: none !important;
                    padding: 40px !important;
                    background-color: #f9fbfd !important;
                    color: #333 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                .bill-top-header {
                    text-align: left !important;
                    border-bottom: 3px solid #0056b3 !important;
                    padding-bottom: 20px !important;
                    margin-bottom: 30px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                }
                .bill-center {
                    text-align: left !important;
                }
                .bill-company-name {
                    font-size: 32px !important;
                    color: #0056b3 !important;
                    text-transform: none !important;
                    font-weight: 800 !important;
                    letter-spacing: 0 !important;
                }
                .bill-type {
                    color: #666 !important;
                    font-size: 14px !important;
                    text-transform: uppercase;
                    letter-spacing: 1px !important;
                }
                .bill-info-bar {
                    background-color: #eef2f5 !important;
                    padding: 12px 20px !important;
                    border-radius: 6px !important;
                    border: none !important;
                    margin-bottom: 20px !important;
                }
                .bill-recipient-section {
                    display: flex !important;
                    flex-direction: row !important;
                    justify-content: space-between !important;
                    align-items: flex-start !important;
                    background: #fff !important;
                    padding: 20px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    page-break-inside: avoid;
                }
                .bill-table th {
                    background-color: #0056b3 !important;
                    color: #fff !important;
                    border: none !important;
                    padding: 14px 10px !important;
                    text-transform: none !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                }
                .bill-table td {
                    border: 1px solid #e1e5eb !important;
                    padding: 12px 10px !important;
                }
                .total-row td {
                    background-color: #eef2f5 !important;
                    border-top: 2px solid #0056b3 !important;
                }
                .bill-calculations {
                    border: none !important;
                    background-color: #fff !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    border-radius: 8px;
                    padding: 15px !important;
                    page-break-inside: avoid;
                }
                .calc-row.grand {
                    border-top: 2px dashed #ccc !important;
                    background-color: #0056b3 !important;
                    color: #fff !important;
                    border-radius: 4px;
                    padding: 10px !important;
                    margin-top: 10px;
                }
                .bill-serial-box {
                    border: none !important;
                    background: transparent !important;
                    text-align: right !important;
                    min-width: 200px !important;
                }
                @media print {
                    .bill-page {
                        padding: 0 !important;
                        background-color: #fff !important;
                    }
                    .bill-recipient-section, .bill-top-header {
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        flex-wrap: nowrap !important;
                    }
                    .bill-serial-box {
                        width: auto !important;
                        flex-shrink: 0 !important;
                    }
                }
            </style>
            <div class="invoice-actions">
                <button class="btn btn-secondary" onclick="history.back()">← Back</button>
                <button class="btn btn-primary" onclick="window.print()">🖨 Print</button>
                <button class="btn btn-secondary" onclick="window.location.href='/bills/${bill._id || bill.id}/edit'">✏ Edit</button>
                <button class="btn btn-danger" id="delete-bill-btn">🗑 Delete</button>
            </div>
            <div class="bill-page">
                <!-- Header -->
                <div class="bill-section bill-top-header">
                    <div class="bill-center">
                        ${o.bill_title ? `<div class="bill-type">${o.bill_title}</div>` : ''}
                        <div class="bill-company-name">${o.company_name || 'Company Name'}</div>
                        ${o.company_subtitle ? `<div class="bill-subtitle">${o.company_subtitle}</div>` : ''}
                        ${o.company_address ? `<div class="bill-address">${o.company_address}</div>` : ''}
                        ${phones.length > 0 ? `<div class="bill-phones-center">Mob.: ${phones.join(', ')}</div>` : ''}
                        ${email ? `<div class="bill-phones-center">Email: ${email}</div>` : ''}
                    </div>
                </div>

                <!-- GSTIN / PAN / WEF -->
                ${(o.company_gstin || o.company_pan || o.company_wef) ? `
                <div class="bill-section bill-info-bar">
                    ${o.company_gstin ? `<span>GSTIN: ${o.company_gstin}</span>` : ''}
                    ${o.company_pan ? `<span>PAN No.: ${o.company_pan}</span>` : ''}
                    ${o.company_wef ? `<span>W E F: ${o.company_wef}</span>` : ''}
                </div>
                ` : ''}

                <!-- Recipient + Serial/Date -->
                <div class="bill-section bill-recipient-section">
                    <div class="bill-recipient">
                        <div class="bill-field-label" style="font-weight:700; margin-bottom:6px;">Detail Of Recipient (Purchaser):</div>
                        ${recipientHTML}
                    </div>
                    <div class="bill-serial-box">
                        <div class="bill-field"><span class="bill-field-label">Invoice No.:</span> <span class="font-bold">${bill.serial_number}</span></div>
                        <div class="bill-field"><span class="bill-field-label">Date:</span> <span>${formatDate(bill.bill_date)}</span></div>
                    </div>
                </div>

                <!-- Line Items Table -->
                <div class="bill-section">
                    <table class="bill-table">
                        <thead><tr>${headerRow}</tr></thead>
                        <tbody>
                            ${itemRows}
                            ${totalRow}
                        </tbody>
                    </table>
                </div>

                <!-- Bottom Section: Bank (optional) + Calculations -->
                <div class="bill-section bill-bottom">
                    ${banks.length > 0 ? `
                    <div class="bill-bank">
                        <div class="bill-field-label" style="font-weight:700; margin-bottom:6px;">BANK DETAILS:</div>
                        ${bankHTML}
                    </div>` : ''}
                    <div class="bill-calculations"${banks.length === 0 ? ' style="width:100%; border:1px solid #000;"' : ''}>
                        <div class="calc-row"><span>Net Amount:</span><span>${formatCurrency(bill.subtotal)}</span></div>
                        <div class="calc-row"><span>Other Charges (If any):</span><span>${formatCurrency(bill.other_charges)}</span></div>
                        ${bill.cgst_amount > 0 ? `<div class="calc-row"><span>Add CGST@${bill.cgst_rate}%:</span><span>${formatCurrency(bill.cgst_amount)}</span></div>` : ''}
                        ${bill.sgst_amount > 0 ? `<div class="calc-row"><span>Add SGST@${bill.sgst_rate}%:</span><span>${formatCurrency(bill.sgst_amount)}</span></div>` : ''}
                        <div class="calc-row"><span>Round Off:</span><span>${bill.round_off >= 0 ? '' : '-'}${formatCurrency(Math.abs(bill.round_off))}</span></div>
                        <div class="calc-row grand"><span>Total Amount:</span><span>${formatCurrency(bill.grand_total)}</span></div>
                    </div>
                </div>

                <!-- Amount in words + footer fields -->
                <div class="bill-section bill-words">
                    <div class="bill-field"><span class="bill-field-label">Total Amount in Words:</span> <span>${bill.amount_in_words || ''}</span></div>
                    ${footerFieldsHTML}
                </div>

                ${bill.notes ? `<div class="bill-section bill-notes-line"><span class="bill-field-label">Note:</span> ${bill.notes}</div>` : ''}

                <!-- Signature -->
                <div class="bill-section bill-signature">
                    <div class="sig-line">Prop./Authorised Signatory</div>
                </div>
            </div>
        `;

        // Delete handler
        document.getElementById('delete-bill-btn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this bill?')) {
                fetch(`/api/bills/${bill._id || bill.id}`, { method: 'DELETE' })
                    .then(r => r.json())
                    .then(() => window.location.href = '/bills')
                    .catch(err => alert('Failed to delete bill'));
            }
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="empty-state"><p>${err.message}</p><a href="/bills" class="btn btn-secondary" style="margin-top:16px">&larr; Back to Bills</a></div>`;
    }
};
