/**
 * profile.js — Company Profile & Bill Template Configuration
 */
window.renderProfile = async function (container, preloadedProfile) {
    let profile;
    if (preloadedProfile) {
        profile = preloadedProfile;
    } else {
        try {
            const res = await fetch('/api/profile');
            if (!res.ok) throw new Error('Failed to load profile');
            profile = await res.json();
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
            return;
        }
    }
    window.userProfile = profile;

    const banks = profile.bank_details || [];

    container.innerHTML = `
        <div class="profile-grid">
            <!-- Company Details Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Company Details</h2>
                <form id="company-form" autocomplete="off">
                    <div class="form-grid">
                        <div class="form-group"><label class="form-label">Bill Title <span style="font-weight:400;color:var(--text-muted);">(e.g. TAX INVOICE, BILL — leave blank to hide)</span></label><input class="form-input" id="p-bill-title" value="${profile.bill_title || ''}" placeholder="TAX INVOICE"></div>
                        <div class="form-group"><label class="form-label">Company Name</label><input class="form-input" id="p-company-name" value="${profile.company_name || ''}"></div>
                        <div class="form-group"><label class="form-label">Business Type / Subtitle</label><input class="form-input" id="p-company-subtitle" value="${profile.company_subtitle || ''}"></div>
                        <div class="form-group full-width"><label class="form-label">Address</label><input class="form-input" id="p-company-address" value="${profile.company_address || ''}"></div>
                        <div class="form-group"><label class="form-label">Phone Numbers (comma-separated)</label><input class="form-input" id="p-company-phones" value="${profile.company_phones || ''}"></div>
                        <div class="form-group"><label class="form-label">GSTIN</label><input class="form-input" id="p-company-gstin" value="${profile.company_gstin || ''}"></div>
                        <div class="form-group"><label class="form-label">PAN No.</label><input class="form-input" id="p-company-pan" value="${profile.company_pan || ''}"></div>
                        <div class="form-group"><label class="form-label">W.E.F. Date</label><input class="form-input" id="p-company-wef" value="${profile.company_wef || ''}"></div>
                        <div class="form-group"><label class="form-label">Default CGST (%)</label><input class="form-input" type="number" id="p-default-cgst" value="${profile.default_cgst || 0}" min="0" step="0.1"></div>
                        <div class="form-group"><label class="form-label">Default SGST (%)</label><input class="form-input" type="number" id="p-default-sgst" value="${profile.default_sgst || 0}" min="0" step="0.1"></div>
                    </div>
                    <div style="margin-top:16px;text-align:right;"><button type="submit" class="btn btn-primary">Save Company Details</button></div>
                </form>
            </div>

            <!-- Bank Details Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Bank Details</h2>
                <div id="bank-list">${banks.map((b, i) => bankRowHTML(b, i)).join('')}</div>
                <button type="button" class="btn btn-secondary btn-sm" id="add-bank-btn" style="margin-top:12px;">+ Add Bank</button>
                <div style="margin-top:16px;text-align:right;"><button type="button" class="btn btn-primary" id="save-banks-btn">Save Bank Details</button></div>
            </div>

            <!-- Bill Columns Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Bill Item Columns</h2>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px;">Define the columns for your bill's line items table. Mark one column as Rate and one as Amount.</p>
                <div id="columns-list">${(profile.bill_columns || []).map((c, i) => columnRowHTML(c, i)).join('')}</div>
                <button type="button" class="btn btn-secondary btn-sm" id="add-col-btn" style="margin-top:12px;">+ Add Column</button>
                <div style="margin-top:16px;text-align:right;"><button type="button" class="btn btn-primary" id="save-cols-btn">Save Columns</button></div>
            </div>

            <!-- Recipient Fields Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Recipient Fields</h2>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px;">Define what details you collect from the bill recipient (purchaser).</p>
                <div id="recipient-list">${(profile.recipient_fields || []).map((f, i) => fieldRowHTML(f, i, 'recipient')).join('')}</div>
                <button type="button" class="btn btn-secondary btn-sm" id="add-recipient-btn" style="margin-top:12px;">+ Add Field</button>
                <div style="margin-top:16px;text-align:right;"><button type="button" class="btn btn-primary" id="save-recipient-btn">Save Recipient Fields</button></div>
            </div>

            <!-- Footer Fields Card -->
            <div class="card" style="padding:28px;">
                <h2 class="section-title" style="margin-bottom:20px;">Footer Fields</h2>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px;">Additional fields shown at the bottom of the bill (e.g. E-Way Bill No., Transporter).</p>
                <div id="footer-list">${(profile.footer_fields || []).map((f, i) => fieldRowHTML(f, i, 'footer')).join('')}</div>
                <button type="button" class="btn btn-secondary btn-sm" id="add-footer-btn" style="margin-top:12px;">+ Add Field</button>
                <div style="margin-top:16px;text-align:right;"><button type="button" class="btn btn-primary" id="save-footer-btn">Save Footer Fields</button></div>
            </div>
        </div>
    `;

    function bankRowHTML(b, i) {
        return `<div class="config-row" data-idx="${i}">
            <input class="form-input" placeholder="Bank Name" value="${b.bank || ''}" data-key="bank">
            <input class="form-input" placeholder="Branch" value="${b.branch || ''}" data-key="branch">
            <input class="form-input" placeholder="Account No." value="${b.account || ''}" data-key="account">
            <input class="form-input" placeholder="IFSC Code" value="${b.ifsc || ''}" data-key="ifsc">
            <button type="button" class="btn btn-icon btn-danger remove-row" title="Remove">&times;</button>
        </div>`;
    }

    function columnRowHTML(c, i) {
        return `<div class="config-row" data-idx="${i}">
            <input class="form-input" placeholder="Column Name" value="${c.col_name || ''}" data-key="col_name">
            <select class="form-select form-input" data-key="col_type"><option value="text" ${c.col_type === 'text' ? 'selected' : ''}>Text</option><option value="number" ${c.col_type === 'number' ? 'selected' : ''}>Number</option></select>
            <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;color:var(--text-secondary);"><input type="checkbox" data-key="is_qty" ${c.is_qty ? 'checked' : ''}> Qty</label>
            <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;color:var(--text-secondary);"><input type="checkbox" data-key="is_rate" ${c.is_rate ? 'checked' : ''}> Rate</label>
            <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;color:var(--text-secondary);"><input type="checkbox" data-key="is_amount" ${c.is_amount ? 'checked' : ''}> Amount</label>
            <button type="button" class="btn btn-icon btn-danger remove-row" title="Remove">&times;</button>
        </div>`;
    }

    function fieldRowHTML(f, i, type) {
        return `<div class="config-row" data-idx="${i}" data-type="${type}">
            <input class="form-input" placeholder="Field Name" value="${f.field_name || ''}" data-key="field_name" style="flex:1;">
            <button type="button" class="btn btn-icon btn-danger remove-row" title="Remove">&times;</button>
        </div>`;
    }

    // Add remove handlers
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-row')) {
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
        list.insertAdjacentHTML('beforeend', columnRowHTML({ col_type: 'text' }, list.children.length));
    });

    // Add recipient field
    document.getElementById('add-recipient-btn').addEventListener('click', () => {
        const list = document.getElementById('recipient-list');
        list.insertAdjacentHTML('beforeend', fieldRowHTML({}, list.children.length, 'recipient'));
    });

    // Add footer field
    document.getElementById('add-footer-btn').addEventListener('click', () => {
        const list = document.getElementById('footer-list');
        list.insertAdjacentHTML('beforeend', fieldRowHTML({}, list.children.length, 'footer'));
    });

    // Save company details
    document.getElementById('company-form').addEventListener('submit', async (e) => {
        e.preventDefault();
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
    document.getElementById('save-banks-btn').addEventListener('click', async () => {
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
    document.getElementById('save-cols-btn').addEventListener('click', async () => {
        const columns = [];
        document.querySelectorAll('#columns-list .config-row').forEach((row, i) => {
            columns.push({
                col_name: row.querySelector('[data-key="col_name"]').value.trim(),
                col_type: row.querySelector('[data-key="col_type"]').value,
                col_order: i + 1,
                is_qty: row.querySelector('[data-key="is_qty"]').checked ? 1 : 0,
                is_rate: row.querySelector('[data-key="is_rate"]').checked ? 1 : 0,
                is_amount: row.querySelector('[data-key="is_amount"]').checked ? 1 : 0,
            });
        });
        try {
            const res = await fetch('/api/profile/columns', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columns })
            });
            if (!res.ok) throw new Error();
            showToast('Bill columns saved.');
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) { console.error(err); showToast('Failed to save.', 'error'); }
    });

    // Save recipient fields
    document.getElementById('save-recipient-btn').addEventListener('click', async () => {
        const fields = [];
        document.querySelectorAll('#recipient-list .config-row').forEach((row, i) => {
            const name = row.querySelector('[data-key="field_name"]').value.trim();
            if (name) fields.push({ field_name: name, field_order: i + 1 });
        });
        try {
            await fetch('/api/profile/recipient-fields', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            showToast('Recipient fields saved.');
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) { console.error(err); showToast('Failed to save.', 'error'); }
    });

    // Save footer fields
    document.getElementById('save-footer-btn').addEventListener('click', async () => {
        const fields = [];
        document.querySelectorAll('#footer-list .config-row').forEach((row, i) => {
            const name = row.querySelector('[data-key="field_name"]').value.trim();
            if (name) fields.push({ field_name: name, field_order: i + 1 });
        });
        try {
            await fetch('/api/profile/footer-fields', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            showToast('Footer fields saved.');
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
        } catch (err) { console.error(err); showToast('Failed to save.', 'error'); }
    });
};
