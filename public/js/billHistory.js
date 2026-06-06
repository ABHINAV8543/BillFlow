/**
 * billHistory.js — Bill History List (v3: no status)
 */
window.renderBillHistory = async function (container) {
    container.innerHTML = `
        <div class="toolbar">
            <div class="search-box">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="form-input" type="text" id="search-input" placeholder="Search by client name...">
            </div>
        </div>
        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-wrapper">
                <table class="data-table" id="bills-table">
                    <thead>
                        <tr>
                            <th>Serial #</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="bills-body">
                        <tr><td colspan="5"><div class="page-loader"><div class="loader-spinner"></div></div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('search-input');
    const tbody = document.getElementById('bills-body');
    let debounceTimer;

    async function loadBills() {
        const params = new URLSearchParams();
        const search = searchInput.value.trim();
        if (search) params.set('search', search);

        try {
            const res = await fetch('/api/bills?' + params.toString());
            const bills = await res.json();
            renderRows(bills);
        } catch {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted);">Failed to load bills.</td></tr>';
        }
    }

    function renderRows(bills) {
        if (bills.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted);">No bills found.</td></tr>';
            return;
        }

        tbody.innerHTML = bills.map(b => `
            <tr>
                <td style="font-weight:600; color:var(--text-primary)">${b.serial_number}</td>
                <td>${b.client_name || 'Unknown'}</td>
                <td>${formatDate(b.bill_date)}</td>
                <td style="font-weight:600">${formatCurrency(b.grand_total)}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" onclick="navigateTo('#/bill/${b.id}')">View</button>
                        <button class="btn btn-secondary btn-sm" onclick="navigateTo('#/edit-bill/${b.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteBillFromList(${b.id}, '${b.serial_number}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.deleteBillFromList = async function (id, serial) {
        if (!confirm(`Delete bill #${serial}? This cannot be undone.`)) return;
        try {
            const r = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
            if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
            showToast(`Bill #${serial} deleted.`);
            loadBills();
        } catch (err) { showToast(err.message, 'error'); }
    };

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadBills, 300);
    });

    loadBills();
};
