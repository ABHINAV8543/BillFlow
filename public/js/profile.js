// profile.js reconstructed

window.renderProfile = function (container, profile) {
    container.innerHTML = `
        <div class="profile-grid">
            <!-- Company Details Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Company Details</h2>
                <form id="company-form" autocomplete="off" novalidate>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Default Bill Title</label>
                            <input type="text" class="form-input" id="p-bill-title" value="${profile.bill_title || ''}" placeholder="TAX INVOICE">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Company Name *</label>
                            <input type="text" class="form-input" id="p-company-name" value="${profile.company_name || ''}" required>
                            <div class="invalid-feedback">Company Name is required.</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Business Type / Subtitle</label>
                            <input type="text" class="form-input" id="p-company-subtitle" value="${profile.company_subtitle || ''}">
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label">Address</label>
                            <input type="text" class="form-input" id="p-company-address" value="${profile.company_address || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Phone Numbers (comma-separated)</label>
                            <input type="text" class="form-input" id="p-company-phones" value="${profile.company_phones || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" class="form-input" id="p-company-email" value="${profile.company_email || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">GSTIN</label>
                            <input type="text" class="form-input" id="p-company-gstin" value="${profile.company_gstin || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">PAN No.</label>
                            <input type="text" class="form-input" id="p-company-pan" value="${profile.company_pan || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">W.E.F. Date</label>
                            <input type="text" class="form-input" id="p-company-wef" value="${profile.company_wef || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Default CGST (%)</label>
                            <input type="number" step="0.1" min="0" class="form-input" id="p-default-cgst" value="${profile.default_cgst || 0}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Default SGST (%)</label>
                            <input type="number" step="0.1" min="0" class="form-input" id="p-default-sgst" value="${profile.default_sgst || 0}">
                        </div>
                    </div>
                    <div style="margin-top:20px;text-align:right;"><button type="submit" class="btn btn-primary" id="save-company-btn">Save Company Details</button></div>
                </form>
            </div>

            <!-- Bank Details Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Bank Accounts</h2>
                <form id="bank-form" novalidate>
                    <div id="bank-list">${(profile.bank_details || []).map((b, i) => bankRowHTML(b, i)).join('')}</div>
                    <button type="button" class="btn btn-secondary btn-sm" id="add-bank-btn" style="margin-top:12px;">+ Add Bank</button>
                    <div style="margin-top:16px;text-align:right;"><button type="submit" class="btn btn-primary" id="save-banks-btn">Save Bank Details</button></div>
                </form>
            </div>

            <!-- Bill Columns Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Bill Item Columns</h2>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px;">Define the data columns for your bill's line items table. Rate and Quantity are mandatory and appear at the end.</p>
                <form id="cols-form" novalidate>
                    <div style="display:flex; gap:8px; margin-bottom:4px; padding-right: 40px;">
                        <div style="flex:1;"><label class="form-label" style="font-size:0.75rem; margin-bottom:0;">Column Name *</label></div>
                        <div style="width:120px;"><label class="form-label" style="font-size:0.75rem; margin-bottom:0;">Data Type *</label></div>
                    </div>
                    <div id="fixed-top-columns-list" style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border-color);">
                        ${columnRowHTML((profile.bill_columns || []).find(c => c.col_type === 'sl') || { col_name: 'Sl.', col_type: 'sl' }, -1, 'sl')}
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" id="add-col-btn" style="margin-bottom:12px;">+ Add Data Column</button>
                    <div id="cols-error" style="color:var(--danger); font-size:0.875rem; margin-bottom:12px; display:none;">You must add at least one Data Column (e.g., Item Name / Description).</div>
                    <div id="columns-list">${(profile.bill_columns || []).filter(c => !c.is_qty && !c.is_rate && !c.is_amount && c.col_type !== 'sl').map((c, i) => columnRowHTML(c, i, 'data')).join('')}</div>
                    <div id="fixed-columns-list" style="margin-top:12px; border-top:1px solid var(--border-color); padding-top:12px;">
                        ${columnRowHTML((profile.bill_columns || []).find(c => c.is_qty) || { col_name: 'Quantity' }, -1, 'qty')}
                        ${columnRowHTML((profile.bill_columns || []).find(c => c.is_rate) || { col_name: 'Rate' }, -1, 'rate')}
                        ${columnRowHTML((profile.bill_columns || []).find(c => c.is_amount) || { col_name: 'Amount' }, -1, 'amount')}
                    </div>
                    <div style="margin-top:16px;text-align:right;"><button type="submit" class="btn btn-primary" id="save-cols-btn">Save Columns</button></div>
                </form>
            </div>

            <!-- Recipient Fields Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Recipient Fields</h2>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px;">Define what details you collect from the bill recipient (purchaser).</p>
                <form id="recipient-form" novalidate>
                    <div id="recipient-list">${(profile.recipient_fields || []).map((f, i) => fieldRowHTML(f, i, 'recipient')).join('')}</div>
                    <div id="recipient-error" style="color:var(--danger); font-size:0.875rem; margin-top:12px; display:none;">You must add at least one Recipient Field.</div>
                    <button type="button" class="btn btn-secondary btn-sm" id="add-recipient-btn" style="margin-top:12px;">+ Add Field</button>
                    <div style="margin-top:16px;text-align:right;"><button type="submit" class="btn btn-primary" id="save-recipient-btn">Save Recipient Fields</button></div>
                </form>
            </div>

            <!-- Footer Fields Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Footer Fields</h2>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px;">Additional fields shown at the bottom of the bill (e.g. E-Way Bill No., Transporter).</p>
                <form id="footer-form" novalidate>
                    <div id="footer-list">${(profile.footer_fields || []).map((f, i) => fieldRowHTML(f, i, 'footer')).join('')}</div>
                    <div id="footer-error" style="color:var(--danger); font-size:0.875rem; margin-top:12px; display:none;">You must add at least one Footer Field.</div>
                    <button type="button" class="btn btn-secondary btn-sm" id="add-footer-btn" style="margin-top:12px;">+ Add Field</button>
                    <div style="margin-top:16px;text-align:right;"><button type="submit" class="btn btn-primary" id="save-footer-btn">Save Footer Fields</button></div>
                </form>
            </div>
        </div>
    `;

    function bankRowHTML(b, i) {
        return `<div class="config-row" data-idx="${i}" style="align-items:flex-start;">
            <div style="flex:1;">
                <input class="form-input" style="width:100%" placeholder="Bank Name" value="${b.bank || ''}" data-key="bank" required>
                <div class="invalid-feedback" style="margin-top:4px;">Required.</div>
            </div>
            <div style="flex:1;">
                <input class="form-input" style="width:100%" placeholder="Branch" value="${b.branch || ''}" data-key="branch" required>
                <div class="invalid-feedback" style="margin-top:4px;">Required.</div>
            </div>
            <div style="flex:1;">
                <input class="form-input" style="width:100%" placeholder="Account No." value="${b.account || ''}" data-key="account" required>
                <div class="invalid-feedback" style="margin-top:4px;">Required.</div>
            </div>
            <div style="flex:1;">
                <input class="form-input" style="width:100%" placeholder="IFSC Code" value="${b.ifsc || ''}" data-key="ifsc" required>
                <div class="invalid-feedback" style="margin-top:4px;">Required.</div>
            </div>
            <button type="button" class="btn btn-icon btn-danger remove-row" title="Remove">&times;</button>
        </div>`;
    }

    function columnRowHTML(c, i, role = 'data') {
        if (role !== 'data') {
            const roleName = { 'qty': 'Quantity', 'rate': 'Rate', 'amount': 'Amount', 'sl': 'Serial No.' }[role];
            const typeDisplay = (role === 'sl') ? 'Serial' : 'Number';
            return `<div class="config-row fixed-col-row" style="align-items:flex-start;">
                <div style="flex:1;">
                    <input class="form-input" style="width:100%" placeholder="${roleName} Name" value="${c.col_name || ''}" data-key="col_name" data-role="${role}" required>
                    <div class="invalid-feedback" style="margin-top:4px;">Required.</div>
                </div>
                <div style="width:120px;">
                    <input class="form-input" style="width:100%" value="${typeDisplay}" disabled>
                </div>
                <div style="width:32px;"></div>
            </div>`;
        }

        return `<div class="config-row data-col-row" data-idx="${i}" style="align-items:flex-start;">
            <div style="flex:1;">
                <input class="form-input" style="width:100%" placeholder="Column Name (e.g. Description)" value="${c.col_name || ''}" data-key="col_name" required>
                <div class="invalid-feedback" style="margin-top:4px;">Column Name is required.</div>
            </div>
            <div style="width:120px;">
                <select class="form-select form-input" data-key="col_type" required>
                    <option value="" ${!c.col_type ? 'selected' : ''} disabled>Select...</option>
                    <option value="text" ${c.col_type === 'text' ? 'selected' : ''}>Text</option>
                    <option value="number" ${c.col_type === 'number' ? 'selected' : ''}>Number</option>
                </select>
                <div class="invalid-feedback" style="margin-top:4px;">Required.</div>
            </div>
            <button type="button" class="btn btn-icon btn-danger remove-row" title="Remove">&times;</button>
        </div>`;
    }

    function fieldRowHTML(f, i, type) {
        return `<div class="config-row" data-idx="${i}" style="align-items:flex-start;">
            <div style="flex:1;">
                <input class="form-input" style="width:100%" placeholder="Field Name" value="${f.field_name || ''}" data-key="field_name" required>
                <div class="invalid-feedback" style="margin-top:4px;">Field Name is required.</div>
            </div>
            <button type="button" class="btn btn-icon btn-danger remove-row" title="Remove">&times;</button>
        </div>`;
    }

    // Add remove handlers
    container.addEventListener('click', (e) => {
        if (e.target.closest('.remove-row')) {
            e.target.closest('.config-row').remove();
        }
    });

    // Add bank
    document.getElementById('add-bank-btn').addEventListener('click', () => {
        const list = document.getElementById('bank-list');
        list.insertAdjacentHTML('beforeend', bankRowHTML({}, list.children.length));
    });

    // Add column
    document.getElementById('add-col-btn').addEventListener('click', () => {
        const list = document.getElementById('columns-list');
        const idx = list.children.length;
        list.insertAdjacentHTML('beforeend', columnRowHTML({}, idx, 'data'));
        
        // Reset error state if any
        document.getElementById('cols-error').style.display = 'none';
        document.getElementById('add-col-btn').classList.remove('btn-danger');
        document.getElementById('add-col-btn').classList.add('btn-secondary');
    });

    // Add recipient field
    document.getElementById('add-recipient-btn').addEventListener('click', () => {
        const list = document.getElementById('recipient-list');
        list.insertAdjacentHTML('beforeend', fieldRowHTML({}, list.children.length, 'recipient'));
        
        document.getElementById('recipient-error').style.display = 'none';
        document.getElementById('add-recipient-btn').classList.remove('btn-danger');
        document.getElementById('add-recipient-btn').classList.add('btn-secondary');
    });

    // Add footer field
    document.getElementById('add-footer-btn').addEventListener('click', () => {
        const list = document.getElementById('footer-list');
        list.insertAdjacentHTML('beforeend', fieldRowHTML({}, list.children.length, 'footer'));
        
        document.getElementById('footer-error').style.display = 'none';
        document.getElementById('add-footer-btn').classList.remove('btn-danger');
        document.getElementById('add-footer-btn').classList.add('btn-secondary');
    });

    // Save company details
    document.getElementById('company-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            e.stopPropagation();
            return;
        }

        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bill_title: document.getElementById('p-bill-title').value.trim(),
                    company_name: document.getElementById('p-company-name').value.trim(),
                    company_subtitle: document.getElementById('p-company-subtitle').value.trim(),
                    company_address: document.getElementById('p-company-address').value.trim(),
                    company_phones: document.getElementById('p-company-phones').value.trim(),
                    company_email: document.getElementById('p-company-email').value.trim(),
                    company_gstin: document.getElementById('p-company-gstin').value.trim(),
                    company_pan: document.getElementById('p-company-pan').value.trim(),
                    company_wef: document.getElementById('p-company-wef').value.trim(),
                    default_cgst: parseFloat(document.getElementById('p-default-cgst').value) || 0,
                    default_sgst: parseFloat(document.getElementById('p-default-sgst').value) || 0,
                })
            });
            if (!res.ok) throw new Error('Failed');
            showToast('Company details saved.');
            // Refresh cached profile
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) { console.error(err); showToast('Failed to save.', 'error'); }
    });

    // Save banks
    document.getElementById('bank-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            e.stopPropagation();
            return;
        }

        const bankDetails = [];
        document.querySelectorAll('#bank-list .config-row').forEach(row => {
            bankDetails.push({
                bank: row.querySelector('[data-key="bank"]').value.trim(),
                branch: row.querySelector('[data-key="branch"]').value.trim(),
                account: row.querySelector('[data-key="account"]').value.trim(),
                ifsc: row.querySelector('[data-key="ifsc"]').value.trim(),
            });
        });
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bank_details: bankDetails })
            });
            if (!res.ok) throw new Error('Failed');
            showToast('Bank details saved.');
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) { console.error(err); showToast('Failed to save.', 'error'); }
    });

    // Save columns
    document.getElementById('cols-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            e.stopPropagation();
            return;
        }

        const columns = [];
        let order = 1;

        const colsError = document.getElementById('cols-error');
        const addBtn = document.getElementById('add-col-btn');
        colsError.style.display = 'none';
        addBtn.classList.remove('btn-danger');
        addBtn.classList.add('btn-secondary');

        const dataRows = document.querySelectorAll('#columns-list .data-col-row');
        if (dataRows.length === 0) {
            colsError.style.display = 'block';
            addBtn.classList.remove('btn-secondary');
            addBtn.classList.add('btn-danger');
            return;
        }

        // Add Sl
        const slRow = document.querySelector('.fixed-col-row [data-role="sl"]').closest('.fixed-col-row');
        columns.push({
            col_name: slRow.querySelector('[data-key="col_name"]').value.trim(),
            col_type: 'sl',
            col_order: order++,
            is_qty: 0,
            is_rate: 0,
            is_amount: 0
        });

        dataRows.forEach((row) => {
            columns.push({
                col_name: row.querySelector('[data-key="col_name"]').value.trim(),
                col_type: row.querySelector('[data-key="col_type"]').value,
                col_order: order++,
                is_qty: 0,
                is_rate: 0,
                is_amount: 0
            });
        });

        // Add Qty
        const qtyRow = document.querySelector('.fixed-col-row [data-role="qty"]').closest('.fixed-col-row');
        columns.push({
            col_name: qtyRow.querySelector('[data-key="col_name"]').value.trim(),
            col_type: 'number',
            col_order: order++,
            is_qty: 1,
            is_rate: 0,
            is_amount: 0
        });

        // Add Rate
        const rateRow = document.querySelector('.fixed-col-row [data-role="rate"]').closest('.fixed-col-row');
        columns.push({
            col_name: rateRow.querySelector('[data-key="col_name"]').value.trim(),
            col_type: 'number',
            col_order: order++,
            is_qty: 0,
            is_rate: 1,
            is_amount: 0
        });

        // Add Amount
        const amountRow = document.querySelector('.fixed-col-row [data-role="amount"]').closest('.fixed-col-row');
        columns.push({
            col_name: amountRow.querySelector('[data-key="col_name"]').value.trim(),
            col_type: 'number',
            col_order: order++,
            is_qty: 0,
            is_rate: 0,
            is_amount: 1
        });

        try {
            const res = await fetch('/api/profile/columns', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columns })
            });
            if (!res.ok) throw new Error('Failed to save');
            showToast('Bill columns saved successfully');
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Save recipient fields
    document.getElementById('recipient-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            e.stopPropagation();
            return;
        }

        const recipientError = document.getElementById('recipient-error');
        const addRecipientBtn = document.getElementById('add-recipient-btn');
        recipientError.style.display = 'none';
        addRecipientBtn.classList.remove('btn-danger');
        addRecipientBtn.classList.add('btn-secondary');

        const rows = document.querySelectorAll('#recipient-list .config-row');
        if (rows.length === 0) {
            recipientError.style.display = 'block';
            addRecipientBtn.classList.remove('btn-secondary');
            addRecipientBtn.classList.add('btn-danger');
            return;
        }

        const fields = [];
        rows.forEach((row, i) => {
            const val = row.querySelector('[data-key="field_name"]').value.trim();
            if (val) fields.push({ field_name: val, field_order: i + 1 });
        });
        try {
            const res = await fetch('/api/profile/recipient-fields', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            if (!res.ok) throw new Error('Failed to save');
            showToast('Recipient fields saved successfully');
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Save footer fields
    document.getElementById('footer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            e.stopPropagation();
            return;
        }

        const footerError = document.getElementById('footer-error');
        const addFooterBtn = document.getElementById('add-footer-btn');
        footerError.style.display = 'none';
        addFooterBtn.classList.remove('btn-danger');
        addFooterBtn.classList.add('btn-secondary');

        const rows = document.querySelectorAll('#footer-list .config-row');
        if (rows.length === 0) {
            footerError.style.display = 'block';
            addFooterBtn.classList.remove('btn-secondary');
            addFooterBtn.classList.add('btn-danger');
            return;
        }

        const fields = [];
        rows.forEach((row, i) => {
            const val = row.querySelector('[data-key="field_name"]').value.trim();
            if (val) fields.push({ field_name: val, field_order: i + 1 });
        });
        try {
            const res = await fetch('/api/profile/footer-fields', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            if (!res.ok) throw new Error('Failed to save');
            showToast('Footer fields saved successfully');
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
};
