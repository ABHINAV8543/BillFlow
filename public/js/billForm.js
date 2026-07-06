/**
 * billForm.js — Dynamic Bill Generation Form (v3)
 * Columns, recipient fields, and footer fields are loaded from user profile.
 * Accepts optional editId to pre-fill form for editing an existing bill.
 */
window.renderBillForm = async function (container, editId) {
    // Load user profile for bill template
    let profile = window.userProfile;
    if (!profile) {
        try {
            const r = await fetch('/api/profile');
            profile = await r.json();
            window.userProfile = profile;
        } catch { container.innerHTML = '<div class="empty-state"><p>Failed to load bill template. Please set up your profile first.</p></div>'; return; }
    }

    if (!profile.bill_columns || profile.bill_columns.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No bill columns configured. <a href="/profile" style="color:var(--accent);font-weight:600;">Set up your bill template →</a></p></div>';
        return;
    }

    // If editing, load existing bill data
    let existingBill = null;
    if (editId) {
        try {
            const r = await fetch(`/api/bills/${editId}`);
            if (!r.ok) throw new Error('Bill not found');
            existingBill = await r.json();
        } catch (err) {
            container.innerHTML = '<div class="empty-state"><p>Bill not found for editing.</p><a href="/bills" class="btn btn-secondary" style="margin-top:16px">← Back to Bills</a></div>';
            return;
        }
    }

    const isEdit = !!existingBill;
    const columns = profile.bill_columns;
    const recipientFields = profile.recipient_fields || [];
    const footerFields = profile.footer_fields || [];
    const slCol = columns.find(c => c.col_type === 'sl') || { col_name: 'Sl.' };
    const amountCol = columns.find(c => c.is_amount) || { col_name: 'Amount' };
    const rateCol = columns.find(c => c.is_rate);
    const qtyCol = columns.find(c => c.is_qty);
    const dataCols = columns.filter(c => !c.is_rate && !c.is_qty && !c.is_amount && c.col_type !== 'sl');

    const today = new Date().toISOString().slice(0, 10);
    let lineItemCount = 0;

    // Pre-fill data from existing bill
    const existingRecipient = isEdit && existingBill.client_id ? (existingBill.client_id.recipient_data || {}) : {};
    const existingFooter = isEdit ? (existingBill.footer_data || {}) : {};

    // Build recipient fields HTML
    const recipientHTML = recipientFields.map((f, i) => `
        <div class="form-group">
            <label class="form-label">${f.field_name}${i === 0 ? ' *' : ''}</label>
            <input class="form-input recipient-field" type="text" data-field="${f.field_name}" placeholder="${f.field_name}" value="${(existingRecipient[f.field_name] || '').replace(/"/g, '&quot;')}" ${i === 0 ? 'required' : ''}>
            ${i === 0 ? `<div class="invalid-feedback">${f.field_name} is required.</div>` : ''}
        </div>
    `).join('');

    // Build footer fields HTML
    const footerHTML = footerFields.map(f => `
        <div class="form-group">
            <label class="form-label">${f.field_name}</label>
            <input class="form-input footer-field" type="text" data-field="${f.field_name}" placeholder="${f.field_name}" value="${(existingFooter[f.field_name] || '').replace(/"/g, '&quot;')}">
        </div>
    `).join('');

    // Build table headers for line items
    const colHeaders = `<th style="width:40px">${slCol.col_name}</th>` +
        dataCols.map(c => `<th>${c.col_name}</th>`).join('') +
        (qtyCol ? `<th style="width:100px">${qtyCol.col_name}</th>` : '') +
        (rateCol ? `<th style="width:120px">${rateCol.col_name} (₹)</th>` : '') +
        `<th style="width:130px">${amountCol.col_name} (₹)</th>` +
        '<th style="width:50px"></th>';

    const formTitle = isEdit ? `Edit Invoice #${existingBill.serial_number}` : 'Create New Invoice';
    const submitLabel = isEdit ? 'Update Invoice' : 'Generate Invoice';

    container.innerHTML = `
        <div class="card" style="padding: 32px;">
            <h2 class="section-title" style="margin-bottom: 24px;">${formTitle}</h2>
            <form id="bill-form" autocomplete="off" novalidate>
                <h3 class="form-section-label">Recipient Details</h3>
                <div class="form-grid">${recipientHTML}</div>

                <h3 class="form-section-label" style="margin-top:24px;">Bill Details</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Invoice Number (Leave blank for auto)</label>
                        <input class="form-input" type="text" id="bill-serial" value="${isEdit ? existingBill.serial_number : ''}" placeholder="Auto-generated">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bill Date *</label>
                        <input class="form-input" type="date" id="bill-date" value="${isEdit ? existingBill.bill_date : today}" required>
                        <div class="invalid-feedback">Bill Date is required.</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CGST (%)</label>
                        <input class="form-input" type="number" id="cgst-rate" value="${isEdit ? existingBill.cgst_rate : (profile.default_cgst || 0)}" min="0" max="100" step="0.1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">SGST (%)</label>
                        <input class="form-input" type="number" id="sgst-rate" value="${isEdit ? existingBill.sgst_rate : (profile.default_sgst || 0)}" min="0" max="100" step="0.1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Other Charges (₹)</label>
                        <input class="form-input" type="number" id="other-charges" value="${isEdit ? (existingBill.other_charges / 100) : 0}" min="0" step="0.01">
                    </div>
                </div>

                <div class="line-items-section">
                    <div class="section-header" style="margin-top:24px;">
                        <h3 class="form-section-label">Line Items</h3>
                        <button type="button" class="btn btn-secondary btn-sm" id="add-line-item-btn">+ Add Item</button>
                    </div>
                    <div class="table-wrapper">
                        <table class="line-items-table">
                            <thead><tr>${colHeaders}</tr></thead>
                            <tbody id="line-items-body"></tbody>
                        </table>
                    </div>
                </div>

                <div class="totals-section">
                    <div class="total-row"><span class="total-label">Net Amount</span><span class="total-value" id="subtotal-display">₹0.00</span></div>
                    <div class="total-row"><span class="total-label">CGST (<span id="cgst-rate-display">${isEdit ? existingBill.cgst_rate : (profile.default_cgst || 0)}</span>%)</span><span class="total-value" id="cgst-display">₹0.00</span></div>
                    <div class="total-row"><span class="total-label">SGST (<span id="sgst-rate-display">${isEdit ? existingBill.sgst_rate : (profile.default_sgst || 0)}</span>%)</span><span class="total-value" id="sgst-display">₹0.00</span></div>
                    <div class="total-row"><span class="total-label">Other Charges</span><span class="total-value" id="other-display">₹0.00</span></div>
                    <div class="total-row"><span class="total-label">Round Off</span><span class="total-value" id="roundoff-display">₹0.00</span></div>
                    <div class="total-row grand"><span class="total-label">Total Amount</span><span class="total-value" id="grand-total-display">₹0.00</span></div>
                </div>

                ${footerFields.length > 0 ? `
                    <h3 class="form-section-label" style="margin-top:24px;">Additional Details</h3>
                    <div class="form-grid">${footerHTML}</div>
                ` : ''}

                <div class="form-group full-width" style="margin-top:16px;">
                    <label class="form-label">Notes</label>
                    <input class="form-input" type="text" id="bill-notes" placeholder="Optional notes..." value="${isEdit ? (existingBill.notes || '') : ''}">
                </div>

                <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                    ${isEdit ? '<a href="/bills" class="btn btn-secondary">Cancel</a>' : '<button type="reset" class="btn btn-secondary">Reset</button>'}
                    <button type="submit" class="btn btn-primary" id="submit-bill-btn">${submitLabel}</button>
                </div>
            </form>
        </div>
    `;

    const lineItemsBody = document.getElementById('line-items-body');
    const cgstInput = document.getElementById('cgst-rate');
    const sgstInput = document.getElementById('sgst-rate');
    const otherInput = document.getElementById('other-charges');

    function fmtINR(val) {
        return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function addLineItem(prefill) {
        lineItemCount++;
        const tr = document.createElement('tr');
        tr.dataset.idx = lineItemCount;
        let cells = `<td style="text-align:center; color:var(--text-muted); font-weight:600;">${lineItemCount}</td>`;

        dataCols.forEach(c => {
            const inputType = c.col_type === 'number' ? 'number' : 'text';
            const val = prefill ? (prefill.col_values[c.col_name] !== undefined ? prefill.col_values[c.col_name] : '') : '';
            cells += `<td><input class="form-input" type="${inputType}" data-col="${c.col_name}" ${c.col_type === 'number' ? 'min="0" step="any"' : ''} placeholder="${c.col_name}" value="${String(val).replace(/"/g, '&quot;')}"></td>`;
        });

        if (qtyCol) {
            const qtyVal = prefill ? (prefill.col_values[qtyCol.col_name] !== undefined ? prefill.col_values[qtyCol.col_name] : '') : '';
            cells += `<td><input class="form-input qty-input" type="number" min="0" step="any" data-col="${qtyCol.col_name}" placeholder="${qtyCol.col_name}" value="${qtyVal}" required><div class="invalid-feedback">Required.</div></td>`;
        }
        if (rateCol) {
            const rateVal = prefill ? (prefill.rate / 100).toFixed(2) : '';
            cells += `<td><input class="form-input price-input rate-input" type="number" min="0" step="0.01" data-col="${rateCol.col_name}" placeholder="${rateCol.col_name}" value="${rateVal}" required><div class="invalid-feedback">Required.</div></td>`;
        }
        const amtVal = prefill ? fmtINR(prefill.amount / 100) : '₹0.00';
        cells += `<td><span class="line-item-total amount-display" data-col="Amount">${amtVal}</span></td>`;
        cells += `<td><button type="button" class="btn btn-icon btn-danger remove-item-btn" title="Remove">&times;</button></td>`;

        tr.innerHTML = cells;
        lineItemsBody.appendChild(tr);

        // If there's a rate column, listen for changes to recalculate
        const rateInput = tr.querySelector('.rate-input');
        if (rateInput) rateInput.addEventListener('input', recalculate);

        // For number columns that might affect amount, also listen
        tr.querySelectorAll('input[type="number"]').forEach(inp => {
            inp.addEventListener('input', recalculate);
        });

        tr.querySelector('.remove-item-btn').addEventListener('click', () => {
            tr.remove();
            renumberRows();
            recalculate();
        });
    }

    function renumberRows() {
        lineItemsBody.querySelectorAll('tr').forEach((tr, i) => {
            tr.querySelector('td').textContent = i + 1;
        });
    }

    function recalculate() {
        let subtotal = 0;
        lineItemsBody.querySelectorAll('tr').forEach(row => {
            const rateInput = row.querySelector('.rate-input');
            const amountDisplay = row.querySelector('.amount-display');

            if (rateInput && amountDisplay) {
                const rate = parseFloat(rateInput.value) || 0;
                // Use explicit qty column if available, else default to 1
                let qty = 1;
                const qtyInput = row.querySelector('.qty-input');
                if (qtyInput) {
                    qty = parseFloat(qtyInput.value) || 0;
                }
                const amount = rate * qty;
                subtotal += amount;
                amountDisplay.textContent = fmtINR(amount);
            }
        });

        const cgstRate = parseFloat(cgstInput.value) || 0;
        const sgstRate = parseFloat(sgstInput.value) || 0;
        const otherCharges = parseFloat(otherInput.value) || 0;
        const cgst = subtotal * cgstRate / 100;
        const sgst = subtotal * sgstRate / 100;
        const beforeRound = subtotal + cgst + sgst + otherCharges;
        const rounded = Math.round(beforeRound);
        const roundOff = rounded - beforeRound;

        document.getElementById('subtotal-display').textContent = fmtINR(subtotal);
        document.getElementById('cgst-rate-display').textContent = cgstRate;
        document.getElementById('cgst-display').textContent = fmtINR(cgst);
        document.getElementById('sgst-rate-display').textContent = sgstRate;
        document.getElementById('sgst-display').textContent = fmtINR(sgst);
        document.getElementById('other-display').textContent = fmtINR(otherCharges);
        document.getElementById('roundoff-display').textContent = (roundOff >= 0 ? '' : '-') + fmtINR(Math.abs(roundOff));
        document.getElementById('grand-total-display').textContent = fmtINR(rounded);
    }

    cgstInput.addEventListener('input', recalculate);
    sgstInput.addEventListener('input', recalculate);
    otherInput.addEventListener('input', recalculate);
    document.getElementById('add-line-item-btn').addEventListener('click', () => addLineItem());

    // Populate line items
    if (isEdit && existingBill.lineItems && existingBill.lineItems.length > 0) {
        existingBill.lineItems.forEach(li => addLineItem(li));
        recalculate();
    } else {
        addLineItem(); // start with one empty row
    }

    // Submit
    document.getElementById('bill-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            e.stopPropagation();
            return;
        }

        const rows = lineItemsBody.querySelectorAll('tr');
        if (rows.length === 0) { showToast('Add at least one line item.', 'error'); return; }

        // Collect recipient data
        const recipientData = {};
        document.querySelectorAll('.recipient-field').forEach(inp => {
            recipientData[inp.dataset.field] = inp.value.trim();
        });

        // Collect footer data
        const footerData = {};
        document.querySelectorAll('.footer-field').forEach(inp => {
            footerData[inp.dataset.field] = inp.value.trim();
        });

        // Collect line items
        const lineItems = [];
        for (const row of rows) {
            const colValues = {};
            row.querySelectorAll('input[data-col]').forEach(inp => {
                colValues[inp.dataset.col] = inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value.trim();
            });

            // Calculate amount in paise
            const rateInput = row.querySelector('.rate-input');
            const rate = rateInput ? parseFloat(rateInput.value) || 0 : 0;
            const numInputs = row.querySelectorAll('input[type="number"]:not(.rate-input)');
            let qty = 1;
            if (numInputs.length > 0) qty = parseFloat(numInputs[numInputs.length - 1].value) || 0;

            const amount = Math.round(rate * qty * 100); // to paise
            const ratePaise = Math.round(rate * 100);

            lineItems.push({ colValues, rate: ratePaise, amount });
        }

        const payload = {
            serial_number: document.getElementById('bill-serial').value.trim() || null,
            recipientData,
            billDate: document.getElementById('bill-date').value,
            cgstRate: document.getElementById('cgst-rate').value,
            sgstRate: document.getElementById('sgst-rate').value,
            otherCharges: Math.round((parseFloat(document.getElementById('other-charges').value) || 0) * 100),
            footerData,
            notes: document.getElementById('bill-notes').value.trim() || null,
            lineItems,
        };

        const submitBtn = document.getElementById('submit-bill-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = isEdit ? 'Updating...' : 'Creating...';

        try {
            const url = isEdit ? `/api/bills/${editId}` : '/api/bills';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.message || err.error || 'Something went wrong'); }
            const result = await res.json();
            showToast(isEdit ? 'Bill updated!' : 'Bill generated!');
            window.location.href = '/bills/' + result.id;
        } catch (err) {
            showToast(err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
        }
    });
};
