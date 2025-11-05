// Check authentication (sessionId and currentUser are declared in menu.js)

function checkAuth() {
    sessionId = localStorage.getItem('sessionId');
    const userStr = localStorage.getItem('user');
    
    if (!sessionId || !userStr) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        return true;
    } catch (e) {
        console.error('Failed to parse user data:', e);
        window.location.href = 'login.html';
        return false;
    }
}

// Load user profile
async function loadProfile() {
    try {
        const response = await fetch('/api/auth/current-user', {
            headers: {
                'x-session-id': sessionId
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to load profile');
        }

        const data = await response.json();
        console.log('Profile data received:', data);
        const user = data.user || data; // Handle both {user: ...} and direct user object
        console.log('User object:', user);
        currentUser = user;

        // Update profile information
        document.getElementById('sidebarUserName').textContent = user.full_name || user.username;
        document.getElementById('profileUsername').textContent = user.username || 'N/A';
        document.getElementById('profileFullName').textContent = user.full_name || 'N/A';
        document.getElementById('profileEmail').textContent = user.email || 'N/A';
        
        // Handle role with fallback
        const role = user.role || 'user';
        document.getElementById('profileRole').textContent = role.toUpperCase();
        document.getElementById('profileRole').className = `role-badge role-${role}`;

        // Update permissions with fallback
        const permissions = user.permissions || {
            can_edit_others: false,
            can_delete_others: false,
            can_register_users: false,
            can_view_dashboard: false,
            can_delete_comments: false
        };
        
        document.getElementById('permEditOthers').textContent = permissions.can_edit_others ? 'Yes' : 'No';
        document.getElementById('permEditOthers').className = `permission-status ${permissions.can_edit_others ? 'enabled' : 'disabled'}`;
        
        document.getElementById('permDeleteOthers').textContent = permissions.can_delete_others ? 'Yes' : 'No';
        document.getElementById('permDeleteOthers').className = `permission-status ${permissions.can_delete_others ? 'enabled' : 'disabled'}`;
        
        document.getElementById('permRegisterUsers').textContent = permissions.can_register_users ? 'Yes' : 'No';
        document.getElementById('permRegisterUsers').className = `permission-status ${permissions.can_register_users ? 'enabled' : 'disabled'}`;
        
        document.getElementById('permViewDashboard').textContent = permissions.can_view_dashboard ? 'Yes' : 'No';
        document.getElementById('permViewDashboard').className = `permission-status ${permissions.can_view_dashboard ? 'enabled' : 'disabled'}`;
        
        document.getElementById('permDeleteComments').textContent = permissions.can_delete_comments ? 'Yes' : 'No';
        document.getElementById('permDeleteComments').className = `permission-status ${permissions.can_delete_comments ? 'enabled' : 'disabled'}`;

        // Show admin section if user is admin
        if (role === 'admin') {
            document.getElementById('adminSection').style.display = 'block';
            loadAllUsers();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Failed to load profile information');
    }
}

// Load all users (admin only)
async function loadAllUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: {
                'x-session-id': sessionId
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('loadingUsers').innerHTML = '<p class="error">Failed to load users</p>';
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.full_name}</td>
            <td><span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span></td>
            <td><span class="permission-badge ${user.can_edit_others ? 'yes' : 'no'}">${user.can_edit_others ? 'Yes' : 'No'}</span></td>
            <td><span class="permission-badge ${user.can_delete_others ? 'yes' : 'no'}">${user.can_delete_others ? 'Yes' : 'No'}</span></td>
            <td><span class="permission-badge ${user.can_register_users ? 'yes' : 'no'}">${user.can_register_users ? 'Yes' : 'No'}</span></td>
            <td><span class="permission-badge ${user.can_view_dashboard ? 'yes' : 'no'}">${user.can_view_dashboard ? 'Yes' : 'No'}</span></td>
            <td><span class="permission-badge ${user.can_delete_comments ? 'yes' : 'no'}">${user.can_delete_comments ? 'Yes' : 'No'}</span></td>
            <td><span class="status-badge ${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-icon" onclick="editUserPermissions(${user.id})" title="Edit Permissions">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('loadingUsers').style.display = 'none';
    document.getElementById('usersTable').style.display = 'block';
}

// Edit user permissions
let editingUserId = null;

async function editUserPermissions(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'x-session-id': sessionId
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load user details');
        }

        const user = await response.json();
        editingUserId = userId;

        // Populate modal
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserUsername').textContent = user.username;
        document.getElementById('editUserRole').value = user.role;
        document.getElementById('editCanEditOthers').checked = user.can_edit_others;
        document.getElementById('editCanDeleteOthers').checked = user.can_delete_others;
        document.getElementById('editCanRegisterUsers').checked = user.can_register_users;
        document.getElementById('editCanViewDashboard').checked = user.can_view_dashboard;
        document.getElementById('editCanDeleteComments').checked = user.can_delete_comments;
        document.getElementById('editIsActive').checked = user.is_active;

        // Show modal
        document.getElementById('editPermissionsModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading user details:', error);
        alert('Failed to load user details');
    }
}

// Save permissions
async function savePermissions() {
    const userId = editingUserId;
    const role = document.getElementById('editUserRole').value;
    const can_edit_others = document.getElementById('editCanEditOthers').checked;
    const can_delete_others = document.getElementById('editCanDeleteOthers').checked;
    const can_register_users = document.getElementById('editCanRegisterUsers').checked;
    const can_view_dashboard = document.getElementById('editCanViewDashboard').checked;
    const can_delete_comments = document.getElementById('editCanDeleteComments').checked;
    const is_active = document.getElementById('editIsActive').checked;

    try {
        const response = await fetch(`/api/users/${userId}/permissions`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({
                role,
                can_edit_others,
                can_delete_others,
                can_register_users,
                can_view_dashboard,
                can_delete_comments,
                is_active
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update permissions');
        }

        alert('Permissions updated successfully');
        document.getElementById('editPermissionsModal').style.display = 'none';
        loadAllUsers(); // Reload users table
    } catch (error) {
        console.error('Error updating permissions:', error);
        alert('Failed to update permissions');
    }
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
    
    // Show dashboard link if user has permission
    const dashboardLink = document.getElementById('dashboardLink');
    if (dashboardLink && currentUser && currentUser.permissions && currentUser.permissions.can_view_dashboard) {
        dashboardLink.style.display = 'flex';
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    loadProfile();
    setupSidebar();

    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });

    // Save permissions button
    document.getElementById('savePermissions').addEventListener('click', savePermissions);

    // Cancel permissions button
    document.getElementById('cancelPermissions').addEventListener('click', () => {
        document.getElementById('editPermissionsModal').style.display = 'none';
    });

    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});

