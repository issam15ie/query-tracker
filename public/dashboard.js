// Dashboard JavaScript
// (sessionId and currentUser are declared in menu.js)


// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupSidebar();
});

async function checkAuth() {
    sessionId = localStorage.getItem('sessionId');
    const userInfo = localStorage.getItem('user'); // Changed from 'userInfo' to 'user'
    
    if (!sessionId || !userInfo) {
        console.log('No session or user info, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(userInfo);
        console.log('User authenticated:', currentUser.username);
        
        // Display user info in sidebar
        const sidebarUserName = document.getElementById('sidebarUserName');
        if (sidebarUserName) {
            sidebarUserName.textContent = currentUser.full_name || currentUser.username;
        }
        
        // Set navigation links visibility based on user permissions
        // Menu is now handled by menu.js
        
        loadDashboard();
    } catch (e) {
        console.error('Error parsing user info:', e);
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}

function setupSidebar() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Logout link
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('sessionId');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        });
    }
}

async function loadDashboard() {
    const loadingEl = document.getElementById('loadingDashboard');
    const contentEl = document.getElementById('dashboardContent');
    const errorEl = document.getElementById('errorDashboard');
    
    try {
        const response = await fetch('/api/dashboard/stats', {
            headers: {
                'x-session-id': sessionId
            },
            cache: 'no-cache' // Force fresh data
        });
        
        if (response.status === 403) {
            // No permission
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';
            document.getElementById('errorMessage').textContent = 
                'You don\'t have permission to view the dashboard.';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }
        
        const stats = await response.json();
        
        // Hide loading, show content
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
        
        // Populate stats
        populateStats(stats);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        document.getElementById('errorMessage').textContent = 
            'Failed to load dashboard data. Please try again later.';
    }
}

// Refresh dashboard when page becomes visible again
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page is now visible, refresh dashboard data
        const contentEl = document.getElementById('dashboardContent');
        if (contentEl && contentEl.style.display !== 'none') {
            console.log('Page visible, refreshing dashboard...');
            loadDashboard();
        }
    }
});

// Auto-refresh dashboard every 30 seconds
setInterval(function() {
    const contentEl = document.getElementById('dashboardContent');
    if (contentEl && contentEl.style.display !== 'none' && !document.hidden) {
        console.log('Auto-refreshing dashboard...');
        loadDashboard();
    }
}, 30000); // 30 seconds

function populateStats(stats) {
    // Total queries
    document.getElementById('totalQueries').textContent = stats.total || 0;
    
    // Find completed and pending counts
    const completedCount = stats.byStatus?.find(s => s.status === 'Completed')?.count || 0;
    const pendingCount = stats.byStatus?.find(s => s.status === 'Pending')?.count || 0;
    
    document.getElementById('completedQueries').textContent = completedCount;
    document.getElementById('pendingQueries').textContent = pendingCount;
    
    // Average completion time
    if (stats.avgCompletionTime) {
        document.getElementById('avgCompletionTime').textContent = 
            parseFloat(stats.avgCompletionTime).toFixed(1);
    } else {
        document.getElementById('avgCompletionTime').textContent = 'N/A';
    }
    
    // Status chart
    renderStatusChart(stats.byStatus || []);
    
    // Priority chart
    renderPriorityChart(stats.byPriority || []);
    
    // Environment chart
    renderEnvironmentChart(stats.byEnvironment || []);
    
    // Top users
    renderUsersList(stats.byUser || []);
    
    // Recent activity
    renderActivityChart(stats.recentActivity || []);
}

function renderStatusChart(data) {
    const container = document.getElementById('statusChart');
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">No data available</p>';
        return;
    }
    
    const total = data.reduce((sum, item) => sum + item.count, 0);
    
    container.innerHTML = data.map(item => {
        const percentage = total > 0 ? (item.count / total * 100) : 0;
        const statusClass = item.status.toLowerCase().replace(' ', '-');
        return `
            <div class="chart-item status-${statusClass}">
                <div>
                    <div class="chart-label">${item.status}</div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="chart-value">${item.count}</div>
            </div>
        `;
    }).join('');
}

function renderPriorityChart(data) {
    const container = document.getElementById('priorityChart');
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">No data available</p>';
        return;
    }
    
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
    
    // Sort by priority order
    const sortedData = data.sort((a, b) => {
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    });
    
    container.innerHTML = sortedData.map(item => {
        const percentage = total > 0 ? (item.count / total * 100) : 0;
        const priorityClass = item.priority.toLowerCase();
        return `
            <div class="chart-item priority-${priorityClass}">
                <div>
                    <div class="chart-label">${item.priority}</div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="chart-value">${item.count}</div>
            </div>
        `;
    }).join('');
}

function renderEnvironmentChart(data) {
    const container = document.getElementById('environmentChart');
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">No data available</p>';
        return;
    }
    
    const total = data.reduce((sum, item) => sum + item.count, 0);
    
    container.innerHTML = data.map(item => {
        const percentage = total > 0 ? (item.count / total * 100) : 0;
        return `
            <div class="chart-item">
                <div>
                    <div class="chart-label">${item.environment}</div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="chart-value">${item.count}</div>
            </div>
        `;
    }).join('');
}

function renderUsersList(data) {
    const container = document.getElementById('usersList');
    if (!data || data.length === 0) {
        container.innerHTML = '<li style="text-align: center; color: #6c757d; padding: 20px;">No data available</li>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <li class="user-list-item">
            <span><i class="fas fa-user"></i> ${item.user_name}</span>
            <span style="font-weight: bold; color: #007bff;">${item.count} queries</span>
        </li>
    `).join('');
}

function renderActivityChart(data) {
    const container = document.getElementById('activityChart');
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">No recent activity</p>';
        return;
    }
    
    const maxCount = Math.max(...data.map(item => item.count));
    
    // Reverse to show oldest first
    const sortedData = [...data].reverse();
    
    container.innerHTML = sortedData.map(item => {
        const percentage = maxCount > 0 ? (item.count / maxCount * 100) : 0;
        const date = new Date(item.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        
        return `
            <div class="chart-item">
                <div style="flex: 1;">
                    <div class="chart-label">${formattedDate}</div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="chart-value">${item.count}</div>
            </div>
        `;
    }).join('');
}

