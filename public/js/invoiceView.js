/**
 * invoiceView.js — Printable Invoice View (v2: INR, CGST/SGST)
 */
window.renderInvoiceView = async function (container, id) {
    try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) throw new Error('Invoice not found');
        const inv = await res.json();

        container.innerHTML = `
            <div class="invoice-actions">
                <button class="btn btn-secondary" onclick="history.back()">← Back</button>
                <button class="btn btn-primary" onclick="window.print()">🖨 Print Invoice</button>
                <span class="badge ${inv.status}" style="margin-left: auto; font-size: 0.85rem; padding: 6px 16px;">${inv.status}</span>
            </div>
            <div class="invoice-page">
                <div class="invoice-header">
                    <div class="invoice-brand">
                        <h2>BillFlow</h2>
                        <p>E-Billing Dashboard</p>
                        <p style="margin-top: 8px; font-size: 0.8rem;">123 Business Park, Andheri East<br>Mumbai, Maharashtra 400069</p>
                        <p style="font-size: 0.8rem;">GSTIN: 27AABCU9603R1ZM</p>
                    </div>
                    <div class="invoice-meta">
                        <div class="inv-number">${inv.invoice_number}</div>
                        <p>Date: ${formatDate(inv.invoice_date)}</p>
                        <p>Due: ${formatDate(inv.due_date)}</p>
                    </div>
                </div>

                <div class="invoice-parties">
                    <div>
                        <h3>Bill To</h3>
                        <p class="client-name">${inv.client_name}</p>
                        ${inv.client_email ? `<p>${inv.client_email}</p>` : ''}
                        ${inv.client_phone ? `<p>${inv.client_phone}</p>` : ''}
                        ${inv.client_address ? `<p>${inv.client_address}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <h3>Payment Status</h3>
                        <span class="badge ${inv.status}" style="font-size: 0.9rem; padding: 6px 20px;">${inv.status}</span>
                    </div>
                </div>

                <div class="invoice-items">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th style="text-align:center">Qty</th>
                                <th style="text-align:right">Unit Price</th>
                                <th style="text-align:right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inv.lineItems.map((item, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${item.description}</td>
                                    <td style="text-align:center">${item.quantity}</td>
                                    <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
                                    <td style="text-align:right; font-weight:600">${formatCurrency(item.line_total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="invoice-totals">
                    <div class="invoice-totals-box">
                        <div class="totals-section" style="margin-top:0; border-top: none;">
                            <div class="total-row">
                                <span class="total-label">Subtotal</span>
                                <span class="total-value">${formatCurrency(inv.subtotal)}</span>
                            </div>
                            <div class="total-row">
                                <span class="total-label">CGST (${inv.cgst_rate}%)</span>
                                <span class="total-value">${formatCurrency(inv.cgst_amount)}</span>
                            </div>
                            <div class="total-row">
                                <span class="total-label">SGST (${inv.sgst_rate}%)</span>
                                <span class="total-value">${formatCurrency(inv.sgst_amount)}</span>
                            </div>
                            <div class="total-row grand">
                                <span class="total-label">Grand Total</span>
                                <span class="total-value">${formatCurrency(inv.grand_total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${inv.notes ? `
                    <div class="invoice-notes">
                        <h3>Notes</h3>
                        <p>${inv.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="empty-state">
                <p>Invoice not found.</p>
                <a href="#/transactions" class="btn btn-secondary" style="margin-top:16px">← Back to Transactions</a>
            </div>
        `;
    }
};
