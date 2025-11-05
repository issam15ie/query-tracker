// (sessionId is declared in menu.js)
let currentApprovalAction = null;
let currentQueryId = null;
let currentLevel = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Get session ID and user data
    sessionId = localStorage.getItem('sessionId');
    const userStr = localStorage.getItem('user');
    
    console.log('[APPROVALS] Session ID from storage:', sessionId ? 'Found' : 'Not found');
    console.log('[APPROVALS] User data from storage:', userStr ? 'Found' : 'Not found');
    
    if (!sessionId || !userStr) {
        console.log('[APPROVALS] Missing session or user data, redirecting to login');
        window.location.href = '/login.html';
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
        console.log('[APPROVALS] Checking auth with session:', sessionId);
        
        const response = await fetch('/api/auth/current-user', {
            headers: { 'x-session-id': sessionId }
        });
        
        console.log('[APPROVALS] Auth response status:', response.status);
        
        if (!response.ok) {
            console.error('[APPROVALS] Auth failed with status:', response.status);
            throw new Error('Not authenticated');
        }
        
        const data = await response.json();
        console.log('[APPROVALS] Auth successful, user:', data.user.username);
        
        // Check if user has permission to view approvals
        if (!data.user.can_view_approvals && data.user.role !== 'admin') {
            alert('Access denied. You do not have permission to view approvals.');
            window.location.href = 'index.html';
            return;
        }
        
        // Menu is now handled by menu.js
        
        // Set username in sidebar
        const sidebarUserName = document.getElementById('sidebarUserName');
        if (sidebarUserName && data.user) {
            sidebarUserName.textContent = data.user.full_name || data.user.username;
        }
    } catch (error) {
        console.error('[APPROVALS] Auth error:', error);
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
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
            headers: { 'x-session-id': sessionId },
            cache: 'no-cache' // Force fresh data
        });
        
        if (!response.ok) throw new Error('Failed to load approvals');
        
        const approvals = await response.json();
        displayPendingApprovals(approvals);
        
        // Update pending count immediately from the fetched data
        document.getElementById('pendingCount').textContent = approvals.length || 0;
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
            headers: { 'x-session-id': sessionId },
            cache: 'no-cache' // Force fresh data
        });
        
        if (!response.ok) {
            console.error('Failed to load stats, status:', response.status);
            // If user doesn't have permission, still try to show pending count
            if (response.status === 403) {
                // Just load pending approvals count instead
                const pendingResponse = await fetch('/api/approvals/pending', {
                    headers: { 'x-session-id': sessionId }
                });
                if (pendingResponse.ok) {
                    const pendingApprovals = await pendingResponse.json();
                    document.getElementById('pendingCount').textContent = pendingApprovals.length || 0;
                }
            }
            return;
        }
        
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
        
        // Reload all data to ensure stats are updated
        await Promise.all([
            loadPendingApprovals(),
            loadStats(),
            loadNotifications()
        ]);
        
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
        
        // Reload all data to ensure stats are updated
        await Promise.all([
            loadPendingApprovals(),
            loadStats(),
            loadNotifications()
        ]);
        
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

async function logout() {
    try {
        if (sessionId) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'x-session-id': sessionId
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local storage
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        
        // Redirect to login
        window.location.href = '/login.html';
    }
}
