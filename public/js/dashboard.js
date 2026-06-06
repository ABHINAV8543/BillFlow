/**
 * dashboard.js — Dashboard Home (v3: revenue-only)
 */
window.renderDashboard = async function (container) {
    try {
        const res = await fetch('/api/dashboard/metrics');
        const data = await res.json();

        container.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card revenue">
                    <div class="metric-label">Total Revenue</div>
                    <div class="metric-value">${formatCurrency(data.totalRevenue)}</div>
                    <div class="metric-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    </div>
                </div>
                <div class="metric-card paid">
                    <div class="metric-label">Total Bills</div>
                    <div class="metric-value">${data.totalBills}</div>
                    <div class="metric-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    </div>
                </div>
                <div class="metric-card clients">
                    <div class="metric-label">Total Clients</div>
                    <div class="metric-value">${data.totalClients}</div>
                    <div class="metric-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    </div>
                </div>
            </div>

            <div class="card" style="padding: 24px;">
                <div class="section-header">
                    <h2 class="section-title">Recent Bills</h2>
                    <a href="#/bills" class="btn btn-secondary btn-sm">View All</a>
                </div>
                <div class="table-wrapper">
                    <table class="data-table" id="recent-bills-table">
                        <thead>
                            <tr>
                                <th>Serial #</th>
                                <th>Client</th>
                                <th>Date</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.recentBills.length === 0
                                ? '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-muted);">No bills yet. <a href="#/new-bill" style="color: var(--accent); font-weight: 600;">Create your first bill →</a></td></tr>'
                                : data.recentBills.map(b => `
                                    <tr style="cursor:pointer" onclick="navigateTo('#/bill/${b.id}')">
                                        <td style="font-weight:600; color: var(--text-primary)">${b.serial_number}</td>
                                        <td>${b.client_name}</td>
                                        <td>${formatDate(b.bill_date)}</td>
                                        <td style="font-weight:600">${formatCurrency(b.grand_total)}</td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state"><p>Failed to load dashboard data.</p></div>';
    }
};
