/**
 * transactions.js — Transaction List with Search & Filter
 */
window.renderTransactions = async function (container) {
    container.innerHTML = `
        <div class="toolbar">
            <div class="search-box">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="form-input" type="text" id="search-input" placeholder="Search by client name...">
            </div>
            <select class="form-select filter-select" id="status-filter">
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
            </select>
        </div>
        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-wrapper">
                <table class="data-table" id="transactions-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Due Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="transactions-body">
                        <tr><td colspan="7"><div class="page-loader"><div class="loader-spinner"></div></div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const tbody = document.getElementById('transactions-body');
    let debounceTimer;

    async function loadInvoices() {
        const params = new URLSearchParams();
        const search = searchInput.value.trim();
        const status = statusFilter.value;
        if (search) params.set('search', search);
        if (status) params.set('status', status);

        try {
            const res = await fetch('/api/invoices?' + params.toString());
            const invoices = await res.json();
            renderRows(invoices);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">Failed to load transactions.</td></tr>';
        }
    }

    function renderRows(invoices) {
        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">No invoices found.</td></tr>';
            return;
        }

        tbody.innerHTML = invoices.map(inv => `
            <tr>
                <td style="font-weight:600; color:var(--text-primary)">${inv.invoice_number}</td>
                <td>${inv.client_name}</td>
                <td>${formatDate(inv.invoice_date)}</td>
                <td>${formatDate(inv.due_date)}</td>
                <td style="font-weight:600">${formatCurrency(inv.grand_total)}</td>
                <td>
                    <span class="badge ${inv.status}" style="cursor:pointer" onclick="toggleStatus(${inv.id}, this)" title="Click to toggle">${inv.status}</span>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="navigateTo('#/invoice/${inv.id}')">View</button>
                </td>
            </tr>
        `).join('');
    }

    // Toggle paid/unpaid
    window.toggleStatus = async function (id, el) {
        try {
            const res = await fetch(`/api/invoices/${id}/status`, { method: 'PATCH' });
            const updated = await res.json();
            el.className = `badge ${updated.status}`;
            el.textContent = updated.status;
            showToast(`Invoice marked as ${updated.status}`);
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadInvoices, 300);
    });

    statusFilter.addEventListener('change', loadInvoices);

    loadInvoices();
};
