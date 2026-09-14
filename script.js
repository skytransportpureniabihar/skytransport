// ==================== DATA STORE ====================
const STORAGE_KEY = 'sky_transport_premium_v2';
const THEME_KEY = 'sky_theme_v2';
const READ_NOTIF_KEY = 'sky_read_notifications';

function getDefaultData() {
    return {
        vehicles: [],
        drivers: [],
        bills: { cocaCola: [], amul: [], britania: [] },
        nextIds: { vehicle: 1, driver: 1, bill: 1, document: 1 }
    };
}

function getData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try { return JSON.parse(raw); }
        catch (e) { return getDefaultData(); }
    }
    return getDefaultData();
}

function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
let appData = getData();
function persistData() { saveData(appData); }

// ==================== THEME MANAGEMENT ====================
const themes = {
    gold:    { gold:'#f0b90b', goldLight:'#fdd835', goldDark:'#c7940a', accent:'#ffd54f', accentGlow:'rgba(240,185,11,0.7)' },
    ocean:   { gold:'#0ea5e9', goldLight:'#38bdf8', goldDark:'#0284c7', accent:'#7dd3fc', accentGlow:'rgba(14,165,233,0.7)' },
    emerald: { gold:'#10b981', goldLight:'#34d399', goldDark:'#047857', accent:'#6ee7b7', accentGlow:'rgba(16,185,129,0.7)' },
    ruby:    { gold:'#ef4444', goldLight:'#f87171', goldDark:'#b91c1c', accent:'#fca5a5', accentGlow:'rgba(239,68,68,0.7)' }
};

function applyTheme(themeName) {
    const t = themes[themeName] || themes.gold;
    const root = document.documentElement;
    root.style.setProperty('--gold', t.gold);
    root.style.setProperty('--gold-light', t.goldLight);
    root.style.setProperty('--gold-dark', t.goldDark);
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--accent-glow', t.accentGlow);
    localStorage.setItem(THEME_KEY, themeName);
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
    const dot = document.querySelector(`.theme-dot[data-theme="${themeName}"]`);
    if (dot) dot.classList.add('active');
}

applyTheme(localStorage.getItem(THEME_KEY) || 'gold');

document.getElementById('themeSwitcher').addEventListener('click', (e) => {
    const dot = e.target.closest('.theme-dot');
    if (!dot) return;
    applyTheme(dot.dataset.theme);
});

// ==================== UTILITY FUNCTIONS ====================
function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
}
function getToday() { return new Date().toISOString().split('T')[0]; }
function daysUntil(d) {
    if (!d) return null;
    const t = new Date(d), n = new Date();
    n.setHours(0,0,0,0); t.setHours(0,0,0,0);
    return Math.ceil((t - n) / 86400000);
}
function formatCurrency(a) { return '₹' + Number(a || 0).toLocaleString('en-IN'); }
function getCompanyName(c) { return { cocaCola:'Coca Cola', amul:'Amul', britania:'Britania' }[c] || c; }

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ==================== NOTIFICATIONS ====================
function getReadNotifications() {
    try { return JSON.parse(localStorage.getItem(READ_NOTIF_KEY)) || []; }
    catch { return []; }
}
function markNotificationRead(key) {
    const read = getReadNotifications();
    if (!read.includes(key)) {
        read.push(key);
        localStorage.setItem(READ_NOTIF_KEY, JSON.stringify(read));
    }
}
function isNotificationRead(key) {
    return getReadNotifications().includes(key);
}

function getExpiringDocs(daysThreshold = 30) {
    const exp = [];
    appData.vehicles.forEach(v => (v.documents || []).forEach(doc => {
        const days = daysUntil(doc.expiryDate);
        if (days !== null && days <= daysThreshold && days >= 0) {
            exp.push({
                key: `doc-${v.id}-${doc.id}`,
                vehicleNumber: v.vehicleNumber,
                docName: doc.name,
                expiryDate: doc.expiryDate,
                daysLeft: days,
                type: 'expiring'
            });
        } else if (days !== null && days < 0) {
            exp.push({
                key: `doc-${v.id}-${doc.id}`,
                vehicleNumber: v.vehicleNumber,
                docName: doc.name,
                expiryDate: doc.expiryDate,
                daysLeft: days,
                type: 'expired'
            });
        }
    }));
    appData.drivers.forEach(d => {
        if (d.licenseExpiry) {
            const days = daysUntil(d.licenseExpiry);
            if (days !== null && days <= daysThreshold && days >= 0) {
                exp.push({
                    key: `drv-${d.id}`,
                    driverName: d.name,
                    docName: 'License',
                    expiryDate: d.licenseExpiry,
                    daysLeft: days,
                    isDriver: true,
                    type: 'expiring'
                });
            } else if (days !== null && days < 0) {
                exp.push({
                    key: `drv-${d.id}`,
                    driverName: d.name,
                    docName: 'License',
                    expiryDate: d.licenseExpiry,
                    daysLeft: days,
                    isDriver: true,
                    type: 'expired'
                });
            }
        }
    });
    return exp.sort((a, b) => a.daysLeft - b.daysLeft);
}

function getUnreadCount() {
    return getExpiringDocs().filter(e => !isNotificationRead(e.key)).length;
}

function updateBadges() {
    const cnt = getUnreadCount();
    const sidebarBadge = document.getElementById('sidebarBadge');
    const notifBadge = document.getElementById('notifCountBadge');
    sidebarBadge.style.display = cnt ? 'inline-block' : 'none';
    sidebarBadge.textContent = cnt;
    notifBadge.style.display = cnt ? 'flex' : 'none';
    notifBadge.textContent = cnt;
}

function renderNotifDropdown() {
    const exp = getExpiringDocs();
    const unread = exp.filter(e => !isNotificationRead(e.key));
    let html = `<div class="notif-header">
        <span>🔔 Notifications (${unread.length})</span>
        ${exp.length ? '<button class="notif-clear" onclick="markAllRead()">Mark all read</button>' : ''}
    </div>`;

    if (!exp.length) {
        html += '<div class="empty-state">✅ All good! No alerts.</div>';
    } else {
        exp.slice(0, 10).forEach(e => {
            const isRead = isNotificationRead(e.key);
            const iconClass = e.type === 'expired' ? 'expired' : 'expiring';
            const icon = e.type === 'expired' ? 'fa-times-circle' : 'fa-exclamation-triangle';
            const label = e.isDriver ? e.driverName : e.vehicleNumber;
            const daysText = e.daysLeft < 0 ? `Expired ${Math.abs(e.daysLeft)} days ago` : `${e.daysLeft} days left`;
            html += `<div class="notif-item ${iconClass}" style="${isRead ? 'opacity:0.5;' : ''}">
                <div class="notif-icon"><i class="fas ${icon}"></i></div>
                <div class="notif-body">
                    <div class="notif-title">${label} - ${e.docName}</div>
                    <div class="notif-desc">Expiry: ${formatDate(e.expiryDate)}</div>
                    <div class="notif-time">${daysText}</div>
                </div>
            </div>`;
        });
    }
    document.getElementById('notifDropdown').innerHTML = html;
}

function markAllRead() {
    getExpiringDocs().forEach(e => markNotificationRead(e.key));
    updateBadges();
    renderNotifDropdown();
    renderAllNotifications();
    showToast('All notifications marked as read', 'success');
}

function clearAllNotifications() {
    markAllRead();
}

// ==================== RENDER: DASHBOARD ====================
function renderDashboard() {
    let tp = 0, tb = 0, tpd = 0;
    ['cocaCola', 'amul', 'britania'].forEach(c => (appData.bills[c] || []).forEach(b => {
        const a = parseFloat(b.amount) || 0;
        if (b.status === 'pending') tp += a;
        if (b.status === 'booked') tb += a;
        if (b.status === 'paid') tpd += a;
    }));

    document.getElementById('dashboardStats').innerHTML = `
        <div class="stat-card" onclick="navigateTo('vehicles')">
            <div class="stat-icon"><i class="fas fa-truck"></i></div>
            <div class="stat-info"><h3>${appData.vehicles.length}</h3><p>Vehicles</p></div>
        </div>
        <div class="stat-card" onclick="navigateTo('drivers')">
            <div class="stat-icon"><i class="fas fa-users"></i></div>
            <div class="stat-info"><h3>${appData.drivers.length}</h3><p>Drivers</p></div>
        </div>
        <div class="stat-card" onclick="navigateTo('bills')">
            <div class="stat-icon"><i class="fas fa-rupee-sign"></i></div>
            <div class="stat-info"><h3>${formatCurrency(tp + tb + tpd)}</h3><p>Total Bills</p></div>
        </div>
        <div class="stat-card" onclick="navigateTo('bills')">
            <div class="stat-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-info"><h3>${formatCurrency(tp)}</h3><p>Pending</p></div>
        </div>
        <div class="stat-card" onclick="navigateTo('notifications')">
            <div class="stat-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="stat-info"><h3>${getExpiringDocs().length}</h3><p>Alerts</p></div>
        </div>`;

    renderExpiryTable();
}

function renderExpiryTable() {
    const tbody = document.getElementById('expiryTableBody');
    const exp = getExpiringDocs();
    if (!exp.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No alerts</td></tr>';
        return;
    }
    tbody.innerHTML = exp.map(e => {
        const label = e.isDriver ? e.driverName : e.vehicleNumber;
        const badgeClass = e.daysLeft < 0 ? 'expired' : 'expiring';
        const daysText = e.daysLeft < 0 ? 'Expired' : `${e.daysLeft} days`;
        return `<tr>
            <td>${label}</td>
            <td>${e.docName}</td>
            <td>${formatDate(e.expiryDate)}</td>
            <td><span class="status-badge ${badgeClass}">${daysText}</span></td>
        </tr>`;
    }).join('');
    filterExpiryTable();
}

function filterExpiryTable() {
    const query = document.getElementById('dashboardExpirySearch').value.trim().toLowerCase();
    const rows = document.querySelectorAll('#expiryTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = (query === '' || text.includes(query)) ? '' : 'none';
    });
}

// ==================== RENDER: VEHICLES ====================
function renderVehicles() {
    const tbody = document.getElementById('vehicleTableBody');
    if (!appData.vehicles.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No vehicles added yet</td></tr>';
    } else {
        tbody.innerHTML = appData.vehicles.map(v => `
            <tr>
                <td><strong>${v.vehicleNumber}</strong></td>
                <td>${v.model || '—'}</td>
                <td>${v.type || '—'}</td>
                <td>${(v.documents || []).length}</td>
                <td>
                    <button class="btn-icon" title="Upload Document" onclick="openDocumentUploadModal(${v.id})"><i class="fas fa-upload"></i></button>
                    <button class="btn-icon" title="Edit" onclick="editVehicle(${v.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" style="color:#e74c3c;" title="Delete" onclick="deleteVehicle(${v.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');
    }
    filterVehicleTable();
}

function filterVehicleTable() {
    const query = document.getElementById('vehicleSearchInput').value.trim().toLowerCase();
    const rows = document.querySelectorAll('#vehicleTableBody tr');
    let visible = 0;
    rows.forEach(row => {
        if (!row.cells[0]) return;
        const text = row.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
            row.style.display = '';
            visible++;
        } else {
            row.style.display = 'none';
        }
    });
    document.getElementById('noVehicleResult').style.display = (visible === 0 && rows.length > 0 && rows[0].cells.length > 1) ? 'block' : 'none';
}

// ==================== RENDER: DRIVERS ====================
function renderDrivers() {
    const tbody = document.getElementById('driverTableBody');
    if (!appData.drivers.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No drivers added yet</td></tr>';
    } else {
        tbody.innerHTML = appData.drivers.map(d => {
            const licDays = daysUntil(d.licenseExpiry);
            let badge = '<span class="status-badge active">Valid</span>';
            if (licDays !== null) {
                if (licDays < 0) badge = '<span class="status-badge expired">Expired</span>';
                else if (licDays <= 30) badge = `<span class="status-badge expiring">${licDays} days</span>`;
            }
            const vh = appData.vehicles.find(v => v.id === d.assignedVehicleId);
            return `<tr>
                <td>${d.name}</td>
                <td>${d.phone || '—'}</td>
                <td>${d.licenseNumber || '—'}</td>
                <td>${formatDate(d.licenseExpiry)} ${badge}</td>
                <td>${vh ? vh.vehicleNumber : '—'}</td>
                <td>
                    <button class="btn-icon" title="Edit" onclick="editDriver(${d.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" style="color:#e74c3c;" title="Delete" onclick="deleteDriver(${d.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }
    filterDriverTable();
}

function filterDriverTable() {
    const query = document.getElementById('driverSearchInput').value.trim().toLowerCase();
    const rows = document.querySelectorAll('#driverTableBody tr');
    let visible = 0;
    rows.forEach(row => {
        if (!row.cells[0]) return;
        const text = row.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
            row.style.display = '';
            visible++;
        } else {
            row.style.display = 'none';
        }
    });
    document.getElementById('noDriverResult').style.display = (visible === 0 && rows.length > 0 && rows[0].cells.length > 1) ? 'block' : 'none';
}

// ==================== RENDER: BILLS ====================
let currentBillTab = 'cocaCola';

function renderBills(company) {
    currentBillTab = company;
    const bills = appData.bills[company] || [];
    document.getElementById('billTableTitle').innerHTML = `<i class="fas fa-receipt"></i> ${getCompanyName(company)} Bills`;
    const tbody = document.getElementById('billTableBody');

    if (!bills.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No bills added yet</td></tr>';
    } else {
        tbody.innerHTML = bills.map(b => {
            const vh = appData.vehicles.find(v => v.id === b.vehicleId);
            return `<tr>
                <td>${b.billNumber}</td>
                <td>${formatCurrency(b.amount)}</td>
                <td>${formatDate(b.date)}</td>
                <td>${vh ? vh.vehicleNumber : '—'}</td>
                <td><span class="status-badge ${b.status}">${b.status}</span></td>
                <td>
                    <select onchange="updateBillStatus('${company}',${b.id},this.value)" style="background:#1a1e2b;color:#fff;border:1px solid #2a2f3d;border-radius:6px;padding:4px;">
                        <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="booked" ${b.status === 'booked' ? 'selected' : ''}>Booked</option>
                        <option value="paid" ${b.status === 'paid' ? 'selected' : ''}>Paid</option>
                    </select>
                    <button class="btn-icon" style="color:#e74c3c;margin-left:6px;" onclick="deleteBill('${company}',${b.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }
    renderBillSummary(company);
    filterBillTable();
}

function renderBillSummary(company) {
    const bills = appData.bills[company] || [];
    let p = 0, bk = 0, pd = 0;
    bills.forEach(b => {
        const a = parseFloat(b.amount) || 0;
        if (b.status === 'pending') p += a;
        if (b.status === 'booked') bk += a;
        if (b.status === 'paid') pd += a;
    });
    document.getElementById('billSummaryContainer').innerHTML = `
        <div class="bill-summary">
            <div class="bill-summary-card"><div style="color:#3498db;">${formatCurrency(bk)}</div><div>Booked</div></div>
            <div class="bill-summary-card"><div style="color:#f39c12;">${formatCurrency(p)}</div><div>Pending</div></div>
            <div class="bill-summary-card"><div style="color:#2ecc71;">${formatCurrency(pd)}</div><div>Paid</div></div>
            <div class="bill-summary-card"><div style="color:var(--gold);">${formatCurrency(p + bk + pd)}</div><div>Total</div></div>
        </div>`;
}

function filterBillTable() {
    const query = document.getElementById('billSearchInput').value.trim().toLowerCase();
    const statusFilter = document.getElementById('billStatusFilter').value;
    const rows = document.querySelectorAll('#billTableBody tr');
    let visible = 0;

    rows.forEach(row => {
        if (!row.cells[0]) return;
        const text = row.textContent.toLowerCase();
        const statusCell = row.cells[4] ? row.cells[4].textContent.toLowerCase() : '';
        const matchesQuery = query === '' || text.includes(query);
        const matchesStatus = statusFilter === '' || statusCell.includes(statusFilter);
        if (matchesQuery && matchesStatus) {
            row.style.display = '';
            visible++;
        } else {
            row.style.display = 'none';
        }
    });
    document.getElementById('noBillResult').style.display = (visible === 0 && rows.length > 0 && rows[0].cells.length > 1) ? 'block' : 'none';
}

// ==================== RENDER: DOCUMENTS ====================
function renderDocuments() {
    const tbody = document.getElementById('documentTableBody');
    let all = [];
    appData.vehicles.forEach(v => (v.documents || []).forEach(d => {
        all.push({ ...d, vehicleNumber: v.vehicleNumber, vehicleId: v.id });
    }));

    if (!all.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No documents uploaded yet</td></tr>';
    } else {
        tbody.innerHTML = all.map(d => {
            const days = daysUntil(d.expiryDate);
            let status = '<span class="status-badge active">Valid</span>';
            if (days !== null) {
                if (days < 0) status = '<span class="status-badge expired">Expired</span>';
                else if (days <= 30) status = `<span class="status-badge expiring">${days} days</span>`;
            }
            const fileType = d.fileType ? d.fileType.split('/')[1].toUpperCase() : '—';
            return `<tr>
                <td>${d.vehicleNumber}</td>
                <td>${d.name}</td>
                <td>${fileType}</td>
                <td>${formatDate(d.expiryDate)}</td>
                <td>${status}</td>
                <td>
                    ${d.fileData ? `<a class="document-link" href="${d.fileData}" download="${d.name}"><i class="fas fa-download"></i> Download</a>` : '—'}
                    <button class="btn-icon" style="color:#e74c3c;margin-left:6px;" onclick="deleteDocument(${d.vehicleId},${d.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }
    filterDocumentTable();
}

function filterDocumentTable() {
    const query = document.getElementById('documentSearchInput').value.trim().toLowerCase();
    const statusFilter = document.getElementById('documentStatusFilter').value;
    const rows = document.querySelectorAll('#documentTableBody tr');
    let visible = 0;

    rows.forEach(row => {
        if (!row.cells[0]) return;
        const text = row.textContent.toLowerCase();
        const statusText = row.cells[4] ? row.cells[4].textContent.toLowerCase() : '';
        const matchesQuery = query === '' || text.includes(query);

        let matchesStatus = true;
        if (statusFilter === 'valid') matchesStatus = statusText.includes('valid');
        else if (statusFilter === 'expiring') matchesStatus = statusText.includes('days');
        else if (statusFilter === 'expired') matchesStatus = statusText.includes('expired');

        if (matchesQuery && matchesStatus) {
            row.style.display = '';
            visible++;
        } else {
            row.style.display = 'none';
        }
    });
    document.getElementById('noDocumentResult').style.display = (visible === 0 && rows.length > 0 && rows[0].cells.length > 1) ? 'block' : 'none';
}

// ==================== RENDER: ALL NOTIFICATIONS ====================
function renderAllNotifications() {
    const exp = getExpiringDocs();
    const container = document.getElementById('allNotificationsList');
    if (!exp.length) {
        container.innerHTML = '<div class="empty-state">✅ All good! No notifications.</div>';
        return;
    }
    container.innerHTML = exp.map(e => {
        const isRead = isNotificationRead(e.key);
        const iconClass = e.type === 'expired' ? 'expired' : 'expiring';
        const icon = e.type === 'expired' ? 'fa-times-circle' : 'fa-exclamation-triangle';
        const label = e.isDriver ? e.driverName : e.vehicleNumber;
        const daysText = e.daysLeft < 0 ? `Expired ${Math.abs(e.daysLeft)} days ago` : `${e.daysLeft} days left`;
        return `<div class="notif-item ${iconClass}" style="${isRead ? 'opacity:0.55;' : ''}" onclick="markNotificationRead('${e.key}');renderAllNotifications();updateBadges();renderNotifDropdown();">
            <div class="notif-icon"><i class="fas ${icon}"></i></div>
            <div class="notif-body">
                <div class="notif-title">${label} - ${e.docName}</div>
                <div class="notif-desc">Expiry: ${formatDate(e.expiryDate)}</div>
                <div class="notif-time">${daysText}</div>
            </div>
        </div>`;
    }).join('');
    filterNotifications();
}

function filterNotifications() {
    const query = document.getElementById('notificationSearchInput').value.trim().toLowerCase();
    const typeFilter = document.getElementById('notifTypeFilter').value;
    const items = document.querySelectorAll('#allNotificationsList .notif-item');
    let visible = 0;
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const matchesQuery = query === '' || text.includes(query);
        const matchesType = typeFilter === '' ||
            (typeFilter === 'expiring' && item.classList.contains('expiring')) ||
            (typeFilter === 'expired' && item.classList.contains('expired')) ||
            (typeFilter === 'info' && item.classList.contains('info'));
        if (matchesQuery && matchesType) {
            item.style.display = '';
            visible++;
        } else {
            item.style.display = 'none';
        }
    });
    document.getElementById('noNotificationResult').style.display = (visible === 0 && items.length > 0) ? 'block' : 'none';
}

// ==================== MODAL: VEHICLE ====================
function openVehicleModal(editId = null) {
    const v = editId ? appData.vehicles.find(x => x.id === editId) : null;
    document.getElementById('modalContainer').innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
            <div class="modal">
                <h2>${v ? 'Edit Vehicle' : 'New Vehicle'}</h2>
                <input id="vehNumber" placeholder="Vehicle Number" value="${v ? v.vehicleNumber : ''}">
                <input id="vehModel" placeholder="Model" value="${v ? v.model || '' : ''}">
                <select id="vehType">
                    <option ${v && v.type === 'Truck' ? 'selected' : ''}>Truck</option>
                    <option ${v && v.type === 'Trailer' ? 'selected' : ''}>Trailer</option>
                    <option ${v && v.type === 'Container' ? 'selected' : ''}>Container</option>
                    <option ${v && v.type === 'Tanker' ? 'selected' : ''}>Tanker</option>
                </select>
                <div class="btn-row">
                    <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-gold" onclick="saveVehicle(${editId || 'null'})">Save</button>
                </div>
            </div>
        </div>`;
}

function saveVehicle(editId = null) {
    const n = document.getElementById('vehNumber').value.trim();
    if (!n) return showToast('Please enter vehicle number', 'error');
    const model = document.getElementById('vehModel').value;
    const type = document.getElementById('vehType').value;

    if (editId) {
        const v = appData.vehicles.find(x => x.id === editId);
        if (v) { v.vehicleNumber = n; v.model = model; v.type = type; }
        showToast('Vehicle updated successfully', 'success');
    } else {
        appData.vehicles.push({
            id: appData.nextIds.vehicle++,
            vehicleNumber: n,
            model, type,
            documents: []
        });
        showToast('Vehicle added successfully', 'success');
    }
    persistData();
    closeModal();
    renderAll();
}

function editVehicle(id) { openVehicleModal(id); }

function deleteVehicle(id) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
        appData.vehicles = appData.vehicles.filter(v => v.id !== id);
        appData.drivers.forEach(d => { if (d.assignedVehicleId === id) d.assignedVehicleId = null; });
        persistData();
        renderAll();
        showToast('Vehicle deleted', 'warning');
    }
}

// ==================== MODAL: DRIVER ====================
function openDriverModal(editId = null) {
    const d = editId ? appData.drivers.find(x => x.id === editId) : null;
    const opts = appData.vehicles.map(v =>
        `<option value="${v.id}" ${d && d.assignedVehicleId === v.id ? 'selected' : ''}>${v.vehicleNumber}</option>`
    ).join('');
    document.getElementById('modalContainer').innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
            <div class="modal">
                <h2>${d ? 'Edit Driver' : 'New Driver'}</h2>
                <input id="drvName" placeholder="Full Name" value="${d ? d.name : ''}">
                <input id="drvPhone" placeholder="Phone Number" value="${d ? d.phone || '' : ''}">
                <input id="drvLicense" placeholder="License Number" value="${d ? d.licenseNumber || '' : ''}">
                <input type="date" id="drvLicExpiry" value="${d ? d.licenseExpiry || '' : ''}">
                <select id="drvVehicle">
                    <option value="">None</option>${opts}
                </select>
                <div class="btn-row">
                    <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-gold" onclick="saveDriver(${editId || 'null'})">Save</button>
                </div>
            </div>
        </div>`;
}

function saveDriver(editId = null) {
    const n = document.getElementById('drvName').value.trim();
    if (!n) return showToast('Please enter driver name', 'error');
    const data = {
        name: n,
        phone: document.getElementById('drvPhone').value,
        licenseNumber: document.getElementById('drvLicense').value,
        licenseExpiry: document.getElementById('drvLicExpiry').value,
        assignedVehicleId: parseInt(document.getElementById('drvVehicle').value) || null
    };
    if (editId) {
        const d = appData.drivers.find(x => x.id === editId);
        if (d) Object.assign(d, data);
        showToast('Driver updated successfully', 'success');
    } else {
        appData.drivers.push({ id: appData.nextIds.driver++, ...data });
        showToast('Driver added successfully', 'success');
    }
    persistData();
    closeModal();
    renderAll();
}

function editDriver(id) { openDriverModal(id); }

function deleteDriver(id) {
    if (confirm('Are you sure you want to delete this driver?')) {
        appData.drivers = appData.drivers.filter(d => d.id !== id);
        persistData();
        renderAll();
        showToast('Driver deleted', 'warning');
    }
}

// ==================== MODAL: BILL ====================
function openBillModal() {
    const vOpts = appData.vehicles.map(v => `<option value="${v.id}">${v.vehicleNumber}</option>`).join('');
    document.getElementById('modalContainer').innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
            <div class="modal">
                <h2>New Bill (${getCompanyName(currentBillTab)})</h2>
                <input id="billNumber" placeholder="Bill Number">
                <input type="number" id="billAmount" placeholder="Amount (₹)">
                <input type="date" id="billDate" value="${getToday()}">
                <select id="billVehicle">
                    <option value="">None</option>${vOpts}
                </select>
                <select id="billStatus">
                    <option value="booked">Booked</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                </select>
                <div class="btn-row">
                    <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-gold" onclick="saveBill()">Save</button>
                </div>
            </div>
        </div>`;
}

function saveBill() {
    const bn = document.getElementById('billNumber').value.trim();
    const amt = document.getElementById('billAmount').value;
    if (!bn || !amt) return showToast('Please fill bill number and amount', 'error');
    appData.bills[currentBillTab].push({
        id: appData.nextIds.bill++,
        billNumber: bn,
        amount: parseFloat(amt),
        date: document.getElementById('billDate').value,
        vehicleId: parseInt(document.getElementById('billVehicle').value) || null,
        status: document.getElementById('billStatus').value
    });
    persistData();
    closeModal();
    renderBills(currentBillTab);
    renderDashboard();
    showToast('Bill added successfully', 'success');
}

function updateBillStatus(company, id, status) {
    const b = appData.bills[company].find(x => x.id === id);
    if (b) {
        b.status = status;
        persistData();
        renderBills(company);
        renderDashboard();
        showToast('Bill status updated', 'success');
    }
}

function deleteBill(company, id) {
    if (confirm('Delete this bill?')) {
        appData.bills[company] = appData.bills[company].filter(b => b.id !== id);
        persistData();
        renderBills(company);
        renderDashboard();
        showToast('Bill deleted', 'warning');
    }
}

// ==================== MODAL: DOCUMENT ====================
function openDocumentUploadModal(vid = null) {
    if (!appData.vehicles.length) return showToast('Please add a vehicle first', 'error');
    const opts = appData.vehicles.map(v =>
        `<option value="${v.id}" ${v.id === vid ? 'selected' : ''}>${v.vehicleNumber}</option>`
    ).join('');
    document.getElementById('modalContainer').innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
            <div class="modal">
                <h2>Upload Document</h2>
                <select id="docVehicleId">${opts}</select>
                <input id="docName" placeholder="Document Name (e.g., Insurance, RC, Permit)">
                <input type="date" id="docExpiry">
                <input type="file" id="docFile" accept=".pdf,.jpg,.jpeg,.png">
                <div class="btn-row">
                    <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-gold" onclick="saveDocument()">Upload</button>
                </div>
            </div>
        </div>`;
}

function saveDocument() {
    const vid = parseInt(document.getElementById('docVehicleId').value);
    const name = document.getElementById('docName').value.trim();
    if (!name) return showToast('Please enter document name', 'error');
    const v = appData.vehicles.find(x => x.id === vid);
    if (!v) return;
    const fileInput = document.getElementById('docFile');

    const process = (data, type) => {
        v.documents.push({
            id: appData.nextIds.document++,
            name,
            expiryDate: document.getElementById('docExpiry').value,
            fileData: data,
            fileType: type
        });
        persistData();
        closeModal();
        renderAll();
        showToast('Document uploaded successfully', 'success');
    };

    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = e => process(e.target.result, fileInput.files[0].type);
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        process(null, null);
    }
}

function deleteDocument(vid, docId) {
    if (!confirm('Delete this document?')) return;
    const v = appData.vehicles.find(x => x.id === vid);
    if (v) {
        v.documents = v.documents.filter(d => d.id !== docId);
        persistData();
        renderAll();
        showToast('Document deleted', 'warning');
    }
}

function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

// ==================== NAVIGATION ====================
let currentSection = 'dashboard';

function navigateTo(sec) {
    currentSection = sec;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + sec).classList.add('active');
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`.sidebar-nav a[data-section="${sec}"]`);
    if (link) link.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        vehicles: 'Vehicle Management',
        drivers: 'Driver Details',
        bills: 'Bill Management',
        documents: 'Documents',
        notifications: 'Notifications'
    };
    document.getElementById('pageTitle').textContent = `SKY TRANSPORT · ${titles[sec] || ''}`;

    if (sec === 'dashboard') renderDashboard();
    if (sec === 'vehicles') renderVehicles();
    if (sec === 'drivers') renderDrivers();
    if (sec === 'bills') renderBills(currentBillTab);
    if (sec === 'documents') renderDocuments();
    if (sec === 'notifications') renderAllNotifications();
}

function renderAll() {
    navigateTo(currentSection);
    updateBadges();
    renderNotifDropdown();
}

// ==================== GLOBAL SEARCH ====================
function performGlobalSearch(query) {
    const results = document.getElementById('globalSearchResults');
    if (!query || query.length < 1) {
        results.classList.remove('show');
        return;
    }
    const q = query.toLowerCase();
    let html = '';
    let found = 0;

    // Search Vehicles
    const vehicles = appData.vehicles.filter(v =>
        v.vehicleNumber.toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q) ||
        (v.type || '').toLowerCase().includes(q)
    );
    if (vehicles.length) {
        html += '<div class="gs-section">Vehicles</div>';
        vehicles.slice(0, 5).forEach(v => {
            html += `<div class="gs-item" onclick="navigateTo('vehicles');document.getElementById('vehicleSearchInput').value='${v.vehicleNumber}';filterVehicleTable();closeGlobalSearch();">
                <i class="fas fa-truck"></i>
                <span>${v.vehicleNumber}</span>
                <span class="gs-meta">${v.model || v.type || ''}</span>
            </div>`;
        });
        found += vehicles.length;
    }

    // Search Drivers
    const drivers = appData.drivers.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.phone || '').toLowerCase().includes(q) ||
        (d.licenseNumber || '').toLowerCase().includes(q)
    );
    if (drivers.length) {
        html += '<div class="gs-section">Drivers</div>';
        drivers.slice(0, 5).forEach(d => {
            html += `<div class="gs-item" onclick="navigateTo('drivers');document.getElementById('driverSearchInput').value='${d.name}';filterDriverTable();closeGlobalSearch();">
                <i class="fas fa-user"></i>
                <span>${d.name}</span>
                <span class="gs-meta">${d.phone || ''}</span>
            </div>`;
        });
        found += drivers.length;
    }

    // Search Bills
    let bills = [];
    ['cocaCola', 'amul', 'britania'].forEach(c => {
        (appData.bills[c] || []).forEach(b => {
            if (b.billNumber.toLowerCase().includes(q) || String(b.amount).includes(q)) {
                bills.push({ ...b, company: c });
            }
        });
    });
    if (bills.length) {
        html += '<div class="gs-section">Bills</div>';
        bills.slice(0, 5).forEach(b => {
            html += `<div class="gs-item" onclick="navigateTo('bills');switchBillTab('${b.company}');document.getElementById('billSearchInput').value='${b.billNumber}';filterBillTable();closeGlobalSearch();">
                <i class="fas fa-receipt"></i>
                <span>${b.billNumber}</span>
                <span class="gs-meta">${formatCurrency(b.amount)}</span>
            </div>`;
        });
        found += bills.length;
    }

    // Search Documents
    let docs = [];
    appData.vehicles.forEach(v => (v.documents || []).forEach(d => {
        if (d.name.toLowerCase().includes(q) || v.vehicleNumber.toLowerCase().includes(q)) {
            docs.push({ ...d, vehicleNumber: v.vehicleNumber });
        }
    }));
    if (docs.length) {
        html += '<div class="gs-section">Documents</div>';
        docs.slice(0, 5).forEach(d => {
            html += `<div class="gs-item" onclick="navigateTo('documents');document.getElementById('documentSearchInput').value='${d.name}';filterDocumentTable();closeGlobalSearch();">
                <i class="fas fa-file"></i>
                <span>${d.name}</span>
                <span class="gs-meta">${d.vehicleNumber}</span>
            </div>`;
        });
        found += docs.length;
    }

    if (!found) {
        html = '<div class="empty-state">No results found</div>';
    }
    results.innerHTML = html;
    results.classList.add('show');
}

function closeGlobalSearch() {
    document.getElementById('globalSearchResults').classList.remove('show');
    document.getElementById('globalSearchInput').value = '';
}

function switchBillTab(company) {
    document.querySelectorAll('#billTabs .tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.querySelector(`#billTabs .tab-btn[data-tab="${company}"]`);
    if (tab) tab.classList.add('active');
    currentBillTab = company;
    renderBills(company);
}

// ==================== EVENT LISTENERS ====================
document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo(this.dataset.section);
    });
});

document.getElementById('notifBtn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('notifDropdown').classList.toggle('show');
});

document.addEventListener('click', e => {
    if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown')) {
        document.getElementById('notifDropdown').classList.remove('show');
    }
    if (!e.target.closest('.global-search')) {
        closeGlobalSearch();
    }
});

document.getElementById('billTabs').addEventListener('click', e => {
    if (e.target.classList.contains('tab-btn')) {
        document.querySelectorAll('#billTabs .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentBillTab = e.target.dataset.tab;
        document.getElementById('billSearchInput').value = '';
        document.getElementById('billStatusFilter').value = '';
        renderBills(currentBillTab);
    }
});

// Global search input
let searchTimeout;
document.getElementById('globalSearchInput').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performGlobalSearch(e.target.value.trim()), 200);
});

// Keyboard shortcut: Ctrl+K for global search
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearchInput').focus();
    }
    if (e.key === 'Escape') {
        closeGlobalSearch();
        closeModal();
        document.getElementById('notifDropdown').classList.remove('show');
    }
});

// ==================== INITIALIZATION ====================
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

renderDashboard();
updateBadges();
renderNotifDropdown();

// Auto-refresh every 30 seconds
setInterval(() => {
    updateBadges();
    renderNotifDropdown();
    if (currentSection === 'dashboard') renderDashboard();
    if (currentSection === 'notifications') renderAllNotifications();
}, 30000);

// Cross-tab sync
window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) {
        appData = getData();
        renderAll();
    }
});

console.log('🚛 SKY TRANSPORT Premium v2 | Global Search + Live Notifications + Document Expiry Alerts');