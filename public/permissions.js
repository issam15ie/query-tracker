// Global variables (sessionId is declared in menu.js)
let currentUserId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [Permissions] DOMContentLoaded fired');
    sessionId = localStorage.getItem('sessionId');
    const userStr = localStorage.getItem('user');
    
    console.log('🔍 [Permissions] Initialization:', {
        hasSessionId: !!sessionId,
        hasUserStr: !!userStr
    });
    
    if (!sessionId || !userStr) {
        console.warn('⚠️ [Permissions] Missing session or user, redirecting to login');
        window.location.href = '/login.html';
        return;
    }
    
    await checkAuth();
    await loadUsers();
    console.log('✅ [Permissions] Setting up event listeners');
    setupEventListeners();
});


// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/current-user', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        
        const data = await response.json();
        
        // Check if user has permission to manage permissions
        if (!data.user.can_manage_permissions && data.user.role !== 'admin') {
            alert('Access denied. You do not have permission to manage permissions.');
            window.location.href = 'index.html';
            return;
        }
        
        // Set username in sidebar
        const sidebarUserName = document.getElementById('sidebarUserName');
        if (sidebarUserName && data.user) {
            sidebarUserName.textContent = data.user.full_name || data.user.username;
        }
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutLink').addEventListener('click', logout);
    
    // User search
    document.getElementById('userSearch').addEventListener('input', (e) => {
        const searchValue = e.target.value;
        const userSearchResults = document.getElementById('userSearchResults');
        
        // Show results only when user types something
        if (searchValue.trim()) {
            filterUsers(searchValue);
        } else {
            userSearchResults.style.display = 'none';
            // Don't clear selection when search is cleared - keep selected user visible
        }
    });
    
    // Clear selection button
    document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);
    
    // Save and cancel buttons
    document.getElementById('savePermissionsBtn').addEventListener('click', savePermissions);
    document.getElementById('cancelPermissionsBtn').addEventListener('click', resetPermissions);
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const container = document.querySelector('.container');
    
    sidebar.classList.toggle('collapsed');
    container.classList.toggle('sidebar-collapsed');
}

// Global variable to store all users
let allUsers = [];

// Load all users
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        allUsers = await response.json();
        console.log('✅ Loaded', allUsers.length, 'users');
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Failed to load users');
    }
}

// Display user search results inline
function displayUserSearchResults(users) {
    const resultsDiv = document.getElementById('userSearchResults');
    
    if (users.length === 0) {
        resultsDiv.innerHTML = '<div class="alert alert-info">No users found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    let resultsHTML = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    users.forEach(user => {
        resultsHTML += `
            <div class="user-result-item" onclick="selectUser(${user.id})">
                <i class="fas fa-user-circle" style="margin-right: 8px; color: #4fd1c7;"></i>
                <strong>${user.username}</strong> <span style="color: #a0aec0;">${user.full_name || ''}</span>
            </div>
        `;
    });
    resultsHTML += '</div>';
    
    resultsDiv.innerHTML = resultsHTML;
    resultsDiv.style.display = 'block';
}

// Global function to handle user selection
window.selectUser = async function(userId) {
    console.log('🎯 User selected:', userId);
    currentUserId = userId;
    
    // Find the selected user from allUsers array
    const selectedUser = allUsers.find(u => u.id === userId);
    
    // Hide search results
    const userSearchResults = document.getElementById('userSearchResults');
    userSearchResults.style.display = 'none';
    
    // Clear search input
    document.getElementById('userSearch').value = '';
    
    // Show and populate selected user display
    const selectedUserDisplay = document.getElementById('selectedUserDisplay');
    if (selectedUser) {
        document.getElementById('selectedUserName').textContent = selectedUser.username;
        document.getElementById('selectedUserFullName').textContent = selectedUser.full_name || '';
        selectedUserDisplay.style.display = 'block';
    }
    
    // Load user permissions
    await loadUserPermissions(userId);
}

// Clear selection function
function clearSelection() {
    currentUserId = null;
    
    // Hide selected user display
    document.getElementById('selectedUserDisplay').style.display = 'none';
    
    // Clear search input
    document.getElementById('userSearch').value = '';
    
    // Reset all permissions
    resetPermissions();
}

// Filter users based on search term
function filterUsers(searchTerm) {
    console.log('🔍 Filtering users with term:', searchTerm);
    
    if (!searchTerm.trim()) {
        console.log('📋 No search term, hiding results');
        const userSearchResults = document.getElementById('userSearchResults');
        userSearchResults.style.display = 'none';
        return;
    }
    
    const filteredUsers = allUsers.filter(user => {
        const username = user.username.toLowerCase();
        const fullName = (user.full_name || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return username.includes(search) || fullName.includes(search);
    });
    
    console.log('📊 Found', filteredUsers.length, 'matching users');
    displayUserSearchResults(filteredUsers);
}

// Load user permissions
async function loadUserPermissions(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) throw new Error('Failed to load user permissions');
        
        const user = await response.json();
        
        // Populate Type 1 permissions (Action Permissions)
        document.getElementById('canEditOthers').checked = user.can_edit_others || false;
        document.getElementById('canDeleteOthers').checked = user.can_delete_others || false;
        document.getElementById('canRegisterUsers').checked = user.can_register_users || false;
        document.getElementById('canDeleteComments').checked = user.can_delete_comments || false;
        
        // Populate Type 2 permissions (Access Permissions)
        document.getElementById('canViewDashboard').checked = user.can_view_dashboard || false;
        document.getElementById('canViewApprovals').checked = user.can_view_approvals || false;
        document.getElementById('canViewAdmin').checked = user.can_view_admin || false;
        document.getElementById('canManagePermissions').checked = user.can_manage_permissions || false;
    } catch (error) {
        console.error('Error loading user permissions:', error);
        alert('Failed to load user permissions');
    }
}

// Save permissions
async function savePermissions() {
    if (!currentUserId) {
        alert('Please select a user first');
        return;
    }
    
    try {
        // First, get the current user's data to preserve the role and is_active
        const userResponse = await fetch(`/api/users/${currentUserId}`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!userResponse.ok) {
            throw new Error('Failed to load user data');
        }
        
        const userData = await userResponse.json();
        
        const permissions = {
            // Preserve existing role and is_active
            role: userData.role || 'user',
            is_active: userData.is_active !== undefined ? userData.is_active : 1,
            
            // Type 1: Action Permissions
            can_edit_others: document.getElementById('canEditOthers').checked,
            can_delete_others: document.getElementById('canDeleteOthers').checked,
            can_register_users: document.getElementById('canRegisterUsers').checked,
            can_delete_comments: document.getElementById('canDeleteComments').checked,
            
            // Type 2: Access Permissions (map to existing fields)
            can_view_dashboard: document.getElementById('canViewDashboard').checked,
            can_view_approvals: document.getElementById('canViewApprovals').checked,
            can_view_admin: document.getElementById('canViewAdmin').checked,
            can_manage_permissions: document.getElementById('canManagePermissions').checked
        };
        
        console.log('[PERMISSIONS DEBUG] Sending permissions:', permissions);
        
        const response = await fetch(`/api/users/${currentUserId}/permissions`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(permissions)
        });
        
        console.log('[PERMISSIONS DEBUG] Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('[PERMISSIONS DEBUG] Error response:', error);
            throw new Error(error.error || 'Failed to save permissions');
        }
        
        const result = await response.json();
        console.log('[PERMISSIONS DEBUG] Success response:', result);
        
        alert('Permissions saved successfully!\n\nThe user\'s session has been updated. They can now access the approvals page without logging out.');
    } catch (error) {
        console.error('Error saving permissions:', error);
        alert('Failed to save permissions: ' + error.message);
    }
}

// Reset permissions
function resetPermissions() {
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset user selection
    if (currentUserId) {
        loadUserPermissions(currentUserId);
    }
}

// Logout
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
