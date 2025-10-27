let sessionId = null;
let currentApprovalAction = null;
let currentQueryId = null;
let currentLevel = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Get session ID
    sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
        window.location.href = 'login.html';
        return;
    }

    // Check authentication and load user permissions
    await checkAuth();
    
    // Load data
    loadPendingApprovals();
    loadStats();
    loadNotifications();
    
    // Setup event listeners
    setupEventListeners();
}

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/current-user', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        
        const data = await response.json();
        showNavLinks(data.user.role, data.user.permissions);
    } catch (error) {
        localStorage.removeItem('sessionId');
        window.location.href = 'login.html';
    }
}

function showNavLinks(role, permissions) {
    // Show dashboard if user has permission
    if (permissions.can_view_dashboard) {
        document.getElementById('dashboardLink').style.display = 'block';
    }
    
    // Show admin link if user is admin
    if (role === 'admin') {
        document.getElementById('adminLink').style.display = 'block';
    }
}

function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutLink').addEventListener('click', logout);
    
    // Modal close
    document.getElementById('closeModal').addEventListener('click', closeModal);
    
    // Notification bell
    document.getElementById('notificationBell').addEventListener('click', toggleNotifications);
    
    // Close modal on outside click
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('approvalModal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const container = document.getElementById('approvalContainer');
    
    sidebar.classList.toggle('collapsed');
    container.classList.toggle('sidebar-collapsed');
}

async function loadPendingApprovals() {
    try {
        const response = await fetch('/api/approvals/pending', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) throw new Error('Failed to load approvals');
        
        const approvals = await response.json();
        displayPendingApprovals(approvals);
    } catch (error) {
        console.error('Error loading approvals:', error);
        document.getElementById('pendingApprovalsList').innerHTML = 
            '<p style="text-align: center; color: #ef4444; padding: 40px;">Error loading approvals</p>';
    }
}

function displayPendingApprovals(approvals) {
    const container = document.getElementById('pendingApprovalsList');
    
    if (approvals.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">No pending approvals</p>';
        return;
    }
    
    container.innerHTML = approvals.map(query => `
        <div class="approval-item">
            <div class="approval-item-header">
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #f1f5f9;">Query #${query.id} - ${query.purpose}</h3>
                    <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">
                        Submitted by: ${query.user_name} | Level: ${query.level}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.85rem;">
                        ${query.query_text.substring(0, 150)}${query.query_text.length > 150 ? '...' : ''}
                    </p>
                </div>
                <div class="approval-actions">
                    <button class="btn-approve" onclick="openApprovalModal(${query.id}, ${query.level}, 'approve')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="openApprovalModal(${query.id}, ${query.level}, 'reject')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadStats() {
    try {
        const response = await fetch('/api/approvals/dashboard-stats', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const stats = await response.json();
        document.getElementById('pendingCount').textContent = stats.pending || 0;
        document.getElementById('totalCount').textContent = stats.byStatus?.reduce((sum, s) => sum + s.count, 0) || 0;
        document.getElementById('avgTime').textContent = stats.avgApprovalTime ? `${parseFloat(stats.avgApprovalTime).toFixed(1)}h` : '0h';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function openApprovalModal(queryId, level, action) {
    currentQueryId = queryId;
    currentLevel = level;
    currentApprovalAction = action;
    
    document.getElementById('modalTitle').textContent = action === 'approve' ? 'Approve Query' : 'Reject Query';
    document.getElementById('approvalComments').value = '';
    
    const modal = document.getElementById('approvalModal');
    modal.style.display = 'block';
    
    document.getElementById('confirmApprovalBtn').onclick = () => {
        if (action === 'approve') {
            approveQuery();
        } else {
            rejectQuery();
        }
    };
}

function closeModal() {
    document.getElementById('approvalModal').style.display = 'none';
}

async function approveQuery() {
    const comments = document.getElementById('approvalComments').value;
    
    try {
        const response = await fetch(`/api/approvals/${currentQueryId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ level: currentLevel, comments })
        });
        
        if (!response.ok) throw new Error('Failed to approve query');
        
        closeModal();
        loadPendingApprovals();
        loadStats();
        loadNotifications();
        
        alert('Query approved successfully!');
    } catch (error) {
        console.error('Error approving query:', error);
        alert('Error approving query');
    }
}

async function rejectQuery() {
    const comments = document.getElementById('approvalComments').value;
    
    try {
        const response = await fetch(`/api/approvals/${currentQueryId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ level: currentLevel, comments })
        });
        
        if (!response.ok) throw new Error('Failed to reject query');
        
        closeModal();
        loadPendingApprovals();
        loadStats();
        loadNotifications();
        
        alert('Query rejected');
    } catch (error) {
        console.error('Error rejecting query:', error);
        alert('Error rejecting query');
    }
}

async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) throw new Error('Failed to load notifications');
        
        const notifications = await response.json();
        displayNotifications(notifications);
        
        // Load unread count
        const unreadResponse = await fetch('/api/notifications/unread-count', {
            headers: { 'x-session-id': sessionId }
        });
        const unreadData = await unreadResponse.json();
        
        const badge = document.getElementById('notificationBadge');
        if (unreadData.count > 0) {
            badge.textContent = unreadData.count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #94a3b8;">No notifications</p>';
        return;
    }
    
    container.innerHTML = notifications.slice(0, 10).map(notif => `
        <div style="padding: 15px; border-bottom: 1px solid #334155; ${!notif.is_read ? 'background: #0f172a;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <p style="margin: 0 0 5px 0; color: #f1f5f9; font-size: 0.9rem;">${notif.message}</p>
                    <p style="margin: 0; color: #64748b; font-size: 0.8rem;">${new Date(notif.created_at).toLocaleString()}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function logout() {
    localStorage.removeItem('sessionId');
    window.location.href = 'login.html';
}
