// Global variables (sessionId is declared in menu.js)
let tables = [];
let currentTable = null;
let currentTableData = null;
let currentColumns = null;
let editRecordId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
        window.location.href = 'login.html';
        return;
    }
    
    checkAuth();
    setupEventListeners();
    await loadTables();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/current-user', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }
        
        const data = await response.json();
        if (!data.success || data.user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
        
        document.getElementById('userInfo').textContent = `${data.user.username} (${data.user.role})`;
        
        // Set username in sidebar
        const sidebarUserName = document.getElementById('sidebarUserName');
        if (sidebarUserName && data.user) {
            sidebarUserName.textContent = data.user.full_name || data.user.username;
        }
        
        // Set navigation links visibility based on user permissions
        // Menu is now handled by menu.js
    } catch (error) {
        window.location.href = 'login.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('tableSelect').addEventListener('change', handleTableSelect);
    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const container = document.querySelector('.admin-container');
    
    sidebar.classList.toggle('collapsed');
    container.classList.toggle('sidebar-collapsed');
}

// Load all tables
async function loadTables() {
    try {
        const response = await fetch('/api/admin/tables', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load tables');
        }
        
        tables = await response.json();
        const select = document.getElementById('tableSelect');
        select.innerHTML = '<option value="">Select a table</option>';
        
        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.name;
            option.textContent = table.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading tables:', error);
        alert('Failed to load tables');
    }
}

// Handle table selection
async function handleTableSelect(e) {
    const tableName = e.target.value;
    if (!tableName) {
        document.getElementById('dataContainer').innerHTML = '<p style="color: #94a3b8;">Select a table to view and manage its data.</p>';
        return;
    }
    
    currentTable = tableName;
    await loadTableData(tableName);
}

// Load table data
async function loadTableData(tableName) {
    try {
        const response = await fetch(`/api/admin/tables/${tableName}`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load table data');
        }
        
        const data = await response.json();
        currentColumns = data.columns;
        currentTableData = data.data;
        
        displayTableData(data.columns, data.data);
    } catch (error) {
        console.error('Error loading table data:', error);
        alert('Failed to load table data');
    }
}

// Display table data
function displayTableData(columns, data) {
    const container = document.getElementById('dataContainer');
    
    if (data.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8;">No records found.</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col.name}</th>`;
    });
    html += '<th>Actions</th></tr></thead><tbody>';
    
    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            let value = row[col.name];
            if (value === null || value === undefined) value = '';
            if (typeof value === 'string' && value.length > 50) {
                value = value.substring(0, 50) + '...';
            }
            html += `<td>${value}</td>`;
        });
        html += `<td>
            <button class="btn-edit" onclick="editRecord(${row.id})">Edit</button>
            <button class="btn-delete" onclick="deleteRecord(${row.id})">Delete</button>
        </td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Show add modal
function showAddModal() {
    if (!currentTable || !currentColumns) {
        alert('Please select a table first');
        return;
    }
    
    editRecordId = null;
    document.getElementById('modalTitle').textContent = 'Add New Record';
    const form = document.getElementById('editForm');
    form.innerHTML = '';
    
    currentColumns.forEach(col => {
        if (col.pk) return; // Skip primary key for new records
        
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = col.name;
        label.setAttribute('for', col.name);
        
        let input;
        if (col.type.toLowerCase().includes('text')) {
            input = document.createElement('textarea');
            input.rows = 3;
        } else {
            input = document.createElement('input');
            input.type = col.type.toLowerCase().includes('integer') ? 'number' : 'text';
        }
        
        input.id = col.name;
        input.name = col.name;
        input.required = col.notnull && !col.dflt_value;
        
        // Special handling for project_id - allow empty string for NULL
        if (col.name === 'project_id' && !col.notnull) {
            input.placeholder = 'Leave empty for global';
        }
        
        group.appendChild(label);
        group.appendChild(input);
        form.appendChild(group);
    });
    
    document.getElementById('editModal').style.display = 'block';
}

// Edit record
async function editRecord(id) {
    if (!currentTableData) return;
    
    const record = currentTableData.find(r => r.id === id);
    if (!record) return;
    
    editRecordId = id;
    document.getElementById('modalTitle').textContent = 'Edit Record';
    const form = document.getElementById('editForm');
    form.innerHTML = '';
    
    currentColumns.forEach(col => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = col.name;
        label.setAttribute('for', col.name);
        
        let input;
        if (col.type.toLowerCase().includes('text')) {
            input = document.createElement('textarea');
            input.rows = 3;
        } else {
            input = document.createElement('input');
            if (col.pk) input.disabled = true;
            input.type = col.type.toLowerCase().includes('integer') ? 'number' : 'text';
        }
        
        input.id = col.name;
        input.name = col.name;
        input.value = record[col.name] || '';
        
        group.appendChild(label);
        group.appendChild(input);
        form.appendChild(group);
    });
    
    document.getElementById('editModal').style.display = 'block';
}

// Save record
async function saveRecord() {
    const form = document.getElementById('editForm');
    const formData = new FormData(form);
    const data = {};
    
    currentColumns.forEach(col => {
        if (col.pk && !editRecordId) return; // Skip PK for new records
        let value = formData.get(col.name);
        
        // Handle empty values for nullable integer fields
        if (col.type.toLowerCase().includes('integer')) {
            if (value === '' || value === null) {
                value = null;
            } else {
                value = parseInt(value);
            }
        } else if (value === '') {
            value = null;
        }
        
        data[col.name] = value;
    });
    
    try {
        let response;
        if (editRecordId) {
            // Update
            response = await fetch(`/api/admin/tables/${currentTable}/${editRecordId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify(data)
            });
        } else {
            // Insert
            response = await fetch(`/api/admin/tables/${currentTable}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Server error:', error);
            throw new Error(error.error || 'Failed to save record');
        }
        
        const result = await response.json();
        console.log('Save result:', result);
        alert('Record saved successfully');
        closeModal();
        await loadTableData(currentTable);
    } catch (error) {
        console.error('Error saving record:', error);
        console.error('Data being sent:', data);
        alert('Failed to save record: ' + error.message + '\n\nCheck console for details.');
    }
}

// Delete record
async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
        const response = await fetch(`/api/admin/tables/${currentTable}/${id}`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete record');
        }
        
        alert('Record deleted successfully');
        await loadTableData(currentTable);
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record');
    }
}

// Close modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editForm').innerHTML = '';
    editRecordId = null;
}

// Logout
function logout() {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
