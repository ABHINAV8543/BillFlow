/**
 * billView.js — Tax Invoice View
 * Uses a SINGLE unified column list to build header, data rows, and total row
 * so column alignment is guaranteed.
 */
window.renderBillView = async function (container, id) {
    try {
        const res = await fetch(`/api/bills/${id}`);
        if (!res.ok) throw new Error('Bill not found');
        const bill = await res.json();
        const o = bill.owner; // company profile
        const cols = bill.billColumns || [];
        const rd = bill.recipient_data || {};
        const fd = bill.footer_data || {};
        const banks = o.bank_details || [];

        // ── Build a SINGLE ordered column list ──
        // Each entry: { name, type, role, width }
        // role = 'sl' | 'data' | 'qty' | 'rate' | 'amount'
        const allCols = [{ name: 'Sl.', type: 'serial', role: 'sl', width: 8 }];

        cols.forEach(c => {
            if (c.is_rate) {
                allCols.push({ name: c.col_name, type: 'number', role: 'rate', width: 12 });
            } else if (c.is_amount) {
                allCols.push({ name: c.col_name, type: 'number', role: 'amount', width: 15 });
            } else if (c.is_qty) {
                allCols.push({ name: c.col_name, type: 'number', role: 'qty', width: 12 });
            } else {
                allCols.push({ name: c.col_name, type: c.col_type, role: 'data', width: 0 });
            }
        });

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
                const val = cv[c.name] !== undefined ? cv[c.name] : '';
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
                return `<td class="text-right font-bold">${sum}</td>`;
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

        // Phone numbers
        const phones = (o.company_phones || '').split(',').map(p => p.trim()).filter(Boolean);

        container.innerHTML = `
            <div class="invoice-actions">
                <button class="btn btn-secondary" onclick="history.back()">← Back</button>
                <button class="btn btn-primary" onclick="window.print()">🖨 Print</button>
                <button class="btn btn-secondary" onclick="navigateTo('#/edit-bill/${id}')">✏ Edit</button>
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
                    </div>
                </div>

                <!-- GSTIN / PAN / WEF -->
                <div class="bill-section bill-info-bar">
                    ${o.company_gstin ? `<span>GSTIN: ${o.company_gstin}</span>` : ''}
                    ${o.company_pan ? `<span>PAN No.: ${o.company_pan}</span>` : ''}
                    ${o.company_wef ? `<span>W E F: ${o.company_wef}</span>` : ''}
                </div>

                <!-- Recipient + Serial/Date -->
                <div class="bill-section bill-recipient-section">
                    <div class="bill-recipient">
                        <div class="bill-field-label" style="font-weight:700; margin-bottom:6px;">Detail Of Recipient (Purchaser):</div>
                        ${recipientHTML}
                    </div>
                    <div class="bill-serial-box">
                        <div class="bill-field"><span class="bill-field-label">Serial No.:</span> <span class="font-bold">${bill.serial_number}</span></div>
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
                        <div class="calc-row"><span>Add CGST@${bill.cgst_rate}%:</span><span>${formatCurrency(bill.cgst_amount)}</span></div>
                        <div class="calc-row"><span>Add SGST@${bill.sgst_rate}%:</span><span>${formatCurrency(bill.sgst_amount)}</span></div>
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
                    <div class="sig-company">For- ${o.company_name || ''}</div>
                </div>
            </div>
        `;

        // Delete handler
        document.getElementById('delete-bill-btn').addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this bill? This cannot be undone.')) return;
            try {
                const r = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
                if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
                showToast('Bill deleted.');
                navigateTo('#/bills');
            } catch (err) { showToast(err.message, 'error'); }
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state"><p>Bill not found.</p><a href="#/bills" class="btn btn-secondary" style="margin-top:16px">← Back to Bills</a></div>';
    }
};
