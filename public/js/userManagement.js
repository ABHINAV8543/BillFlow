/**
 * userManagement.js — Admin User Management Page (v3)
 */
window.renderUserManagement = async function (container) {
    if (!window.currentUser || window.currentUser.role !== 'admin') {
        container.innerHTML = '<div class="empty-state"><p>Access denied. Admin only.</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="section-header" style="margin-bottom: 20px;">
            <h2 class="section-title">Manage Users</h2>
            <button class="btn btn-primary btn-sm" id="add-user-btn">+ Add User</button>
        </div>

        <div class="modal-overlay" id="user-modal" style="display:none;">
            <div class="modal-card">
                <div class="modal-header">
                    <h3 id="modal-title">Add New User</h3>
                    <button class="btn btn-icon" id="modal-close">&times;</button>
                </div>
                <form id="user-form" autocomplete="off">
                    <input type="hidden" id="edit-user-id" value="">
                    <div class="form-group"><label class="form-label" for="user-username">Username *</label><input class="form-input" type="text" id="user-username" required></div>
                    <div class="form-group"><label class="form-label" for="user-display-name">Display Name *</label><input class="form-input" type="text" id="user-display-name" required></div>
                    <div class="form-group"><label class="form-label" for="user-email">Email</label><input class="form-input" type="email" id="user-email"></div>
                    <div class="form-group"><label class="form-label" for="user-password">Password <span id="password-hint">*</span></label><input class="form-input" type="password" id="user-password"></div>
                    <div class="form-group"><label class="form-label" for="user-role">Role *</label><select class="form-select form-input" id="user-role"><option value="user">User</option><option value="admin">Admin</option></select></div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;">
                        <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="modal-submit">Create User</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-wrapper">
                <table class="data-table" id="users-table">
                    <thead>
                        <tr><th>Username</th><th>Display Name</th><th>Company</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="users-body">
                        <tr><td colspan="5"><div class="page-loader"><div class="loader-spinner"></div></div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalSubmit = document.getElementById('modal-submit');
    const form = document.getElementById('user-form');
    const editIdField = document.getElementById('edit-user-id');
    const usernameField = document.getElementById('user-username');

    function openModal(mode, user) {
        if (mode === 'add') {
            modalTitle.textContent = 'Add New User';
            modalSubmit.textContent = 'Create User';
            editIdField.value = '';
            usernameField.disabled = false;
            form.reset();
        } else {
            modalTitle.textContent = 'Edit User';
            modalSubmit.textContent = 'Save Changes';
            editIdField.value = user._id || user.id;
            usernameField.value = user.username;
            usernameField.disabled = true;
            document.getElementById('user-display-name').value = user.display_name;
            document.getElementById('user-email').value = user.email || '';
            document.getElementById('user-password').value = '';
            document.getElementById('user-role').value = user.role;
        }
        modal.style.display = 'flex';
    }

    function closeModal() { modal.style.display = 'none'; }

    document.getElementById('add-user-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    async function loadUsers() {
        try {
            const res = await fetch('/api/users');
            const users = await res.json();
            renderUsers(users);
        } catch {
            document.getElementById('users-body').innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Failed to load users.</td></tr>';
        }
    }

    function renderUsers(users) {
        const tbody = document.getElementById('users-body');
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">No users found.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(u => `
            <tr>
                <td style="font-weight:600; color:var(--text-primary)">${u.username}</td>
                <td>${u.display_name}</td>
                <td>${u.company_name || '—'}</td>
                <td><span class="badge ${u.role === 'admin' ? 'paid' : 'unpaid'}">${u.role}</span></td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary btn-sm" onclick="editUser('${u._id || u.id}')">Edit</button>
                        ${(u._id || u.id) !== window.currentUser.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u._id || u.id}', '${u.username}')">Delete</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.editUser = async function (id) {
        const res = await fetch('/api/users');
        const users = await res.json();
        const user = users.find(u => (u._id || u.id).toString() === id.toString());
        if (user) openModal('edit', user);
    };

    window.deleteUser = async function (id, username) {
        if (!confirm(`Delete user "${username}"? All their data will be deleted.`)) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message || d.error || 'Something went wrong'); }
            showToast(`User "${username}" deleted.`);
            loadUsers();
        } catch (err) { showToast(err.message, 'error'); }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = editIdField.value;
        const isEdit = !!editId;
        const body = {
            displayName: document.getElementById('user-display-name').value.trim(),
            email: document.getElementById('user-email').value.trim() || null,
            role: document.getElementById('user-role').value,
        };
        if (!isEdit) body.username = document.getElementById('user-username').value.trim();
        const pwd = document.getElementById('user-password').value;
        if (pwd) body.password = pwd;
        else if (!isEdit) { showToast('Password required for new users.', 'error'); return; }

        try {
            const url = isEdit ? `/api/users/${editId}` : '/api/users';
            const method = isEdit ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message || d.error || 'Something went wrong'); }
            showToast(isEdit ? 'User updated.' : 'User created.');
            closeModal();
            loadUsers();
        } catch (err) { showToast(err.message, 'error'); }
    });

    loadUsers();
};
