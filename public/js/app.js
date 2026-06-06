/**
 * app.js — SPA Router & Global Utilities (v3)
 */
(function () {
    'use strict';

    // --- Utility: format paise to INR currency string ---
    window.formatCurrency = function (paise) {
        return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // --- Utility: format ISO date string ---
    window.formatDate = function (iso) {
        if (!iso) return '—';
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // --- Utility: show toast ---
    window.showToast = function (message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    // --- Header date ---
    function updateHeaderDate() {
        const el = document.getElementById('header-date');
        if (el) {
            el.textContent = new Date().toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    }

    // --- Auth check ---
    window.currentUser = null;
    window.userProfile = null;

    async function checkAuth() {
        try {
            const res = await fetch('/api/auth/me');
            if (!res.ok) { window.location.href = '/login.html'; return false; }
            window.currentUser = await res.json();
            // Also load profile
            const pRes = await fetch('/api/profile');
            if (pRes.ok) window.userProfile = await pRes.json();
            setupUserUI();
            return true;
        } catch {
            window.location.href = '/login.html';
            return false;
        }
    }

    function setupUserUI() {
        const user = window.currentUser;
        if (!user) return;
        const initial = (user.display_name || user.username).charAt(0).toUpperCase();
        const avatarCircle = document.getElementById('header-avatar-circle');
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        if (avatarCircle) avatarCircle.textContent = initial;
        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        const userName = document.getElementById('sidebar-user-name');
        const userRole = document.getElementById('sidebar-user-role');
        if (userName) userName.textContent = user.display_name;
        if (userRole) userRole.textContent = user.role;
        if (user.role === 'admin') {
            const usersNav = document.getElementById('nav-users');
            if (usersNav) usersNav.style.display = '';
        }
    }

    // --- Logout ---
    function setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
                window.location.href = '/login.html';
            });
        }
    }

    // --- Mobile sidebar ---
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', closeSidebar);

    // --- Router ---
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');

    const routes = {
        '/dashboard': { title: 'Dashboard', renderId: 'renderDashboard' },
        '/new-bill': { title: 'New Bill', renderId: 'renderBillForm' },
        '/bills': { title: 'Bills', renderId: 'renderBillHistory' },
        '/profile': { title: 'Company Profile', renderId: 'renderProfile' },
        '/users': { title: 'User Management', renderId: 'renderUserManagement', adminOnly: true },
    };

    function navigate() {
        let hash = window.location.hash.replace('#', '') || '/dashboard';

        // Bill view route: /bill/123
        if (hash.startsWith('/bill/')) {
            const id = hash.split('/')[2];
            pageTitle.textContent = 'Bill';
            updateActiveNav(null);
            contentArea.innerHTML = '<div class="page-loader"><div class="loader-spinner"></div></div>';
            if (window.renderBillView) window.renderBillView(contentArea, id);
            closeSidebar();
            return;
        }

        // Edit bill route: /edit-bill/123
        if (hash.startsWith('/edit-bill/')) {
            const id = hash.split('/')[2];
            pageTitle.textContent = 'Edit Bill';
            updateActiveNav(null);
            contentArea.innerHTML = '<div class="page-loader"><div class="loader-spinner"></div></div>';
            if (window.renderBillForm) window.renderBillForm(contentArea, id);
            closeSidebar();
            return;
        }

        const route = routes[hash];
        if (!route) { window.location.hash = '#/dashboard'; return; }

        if (route.adminOnly && window.currentUser && window.currentUser.role !== 'admin') {
            window.location.hash = '#/dashboard';
            return;
        }

        pageTitle.textContent = route.title;
        updateActiveNav(hash);
        contentArea.innerHTML = '<div class="page-loader"><div class="loader-spinner"></div></div>';
        contentArea.style.animation = 'none';
        contentArea.offsetHeight;
        contentArea.style.animation = '';

        const renderFn = window[route.renderId];
        if (renderFn) renderFn(contentArea);
        closeSidebar();
    }

    function updateActiveNav(hash) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + hash);
        });
    }

    window.addEventListener('hashchange', navigate);
    window.addEventListener('load', async () => {
        const ok = await checkAuth();
        if (!ok) return;
        updateHeaderDate();
        setupLogout();
        if (!window.location.hash) window.location.hash = '#/dashboard';
        else navigate();
    });

    window.navigateTo = function (hash) { window.location.hash = hash; };
})();
