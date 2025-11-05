// Global variables
let currentQueries = [];
let deleteQueryId = null;
let editQueryId = null;
let originalUsername = null;
let currentQueryData = null;
let availableSchemas = []; // Available schemas - will be loaded dynamically based on project
let currentOpenModal = null; // Track currently open modal

// Application state (sessionId and currentUser are declared in menu.js)
let userPermissions = {
    can_edit_others: false,
    can_delete_others: false,
    can_register_users: false,
    can_view_dashboard: false,
    can_delete_comments: false
};

// Email Configuration - Customize these settings
const EMAIL_CONFIG = {
    recipients: [
        'infra-db-team@company.com',
        'database-admin@company.com',
        'dba-support@company.com',
        'add_new'
    ],
    subjectPrefix: 'Database Query Request',
    companyName: 'MOC',
    teamName: 'Infrastructure DB Team'
};

// Function to get saved recipients from localStorage
function getSavedRecipients() {
    const saved = localStorage.getItem('queryTracker_recipients');
    return saved ? JSON.parse(saved) : [];
}

// Function to save recipients to localStorage
function saveRecipients(recipients) {
    localStorage.setItem('queryTracker_recipients', JSON.stringify(recipients));
}

// Function to add new recipient to the list
function addNewRecipient(email) {
    const savedRecipients = getSavedRecipients();
    if (!savedRecipients.includes(email)) {
        savedRecipients.push(email);
        saveRecipients(savedRecipients);
        updateRecipientDropdown();
    }
}

// Function to update recipient dropdown with saved recipients
function updateRecipientDropdown() {
    const recipientSelect = document.getElementById('recipientSelect');
    const savedRecipients = getSavedRecipients();
    
    // Store the "Add New Recipient" option
    const addNewOption = recipientSelect.querySelector('option[value="add_new"]');
    
    // Clear all options except the first "Select Recipient" option
    while (recipientSelect.children.length > 1) {
        recipientSelect.removeChild(recipientSelect.lastChild);
    }
    
    // Add default recipient options
    const defaultRecipients = [
        { value: 'salmohaimeed01@moc.gov.sa', text: 'Sulaiman Almohaimeed (Contractor)' },
        { value: 'DBA@moc.gov.sa', text: 'Database Team' }
    ];
    
    defaultRecipients.forEach(recipient => {
        const option = document.createElement('option');
        option.value = recipient.value;
        option.textContent = recipient.text;
        recipientSelect.appendChild(option);
    });
    
    // Add saved recipients
    savedRecipients.forEach(email => {
        const option = document.createElement('option');
        option.value = email;
        option.textContent = email;
        recipientSelect.appendChild(option);
    });
    
    // Add the "Add New Recipient" option at the end
    const newOption = document.createElement('option');
    newOption.value = 'add_new';
    newOption.textContent = '+ Add New Recipient';
    recipientSelect.appendChild(newOption);
}


// Check authentication
function checkAuth() {
    sessionId = localStorage.getItem('sessionId');
    const userStr = localStorage.getItem('user');
    
    if (!sessionId || !userStr) {
        // Redirect to login
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        // Load permissions
        if (currentUser.permissions) {
            userPermissions = currentUser.permissions;
        }
        return true;
    } catch (e) {
        console.error('Error parsing user data:', e);
        window.location.href = '/login.html';
        return false;
    }
}

// Logout function
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

// Application initialization
async function initializeApp() {
    if (!checkAuth()) {
        return;
    }
    
    // Display user info in sidebar
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName && currentUser) {
        sidebarUserName.textContent = currentUser.full_name || currentUser.username;
    }
    
    // Set navigation links visibility based on user permissions
    // Menu is now handled by menu.js
    
    // Check for query parameter in URL FIRST (before checking hash)
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('query');
    
    // Check for URL hash to show correct section
    const hash = window.location.hash;
    
    // If there's a query ID, force "All Queries" section to be visible
    if (queryId) {
        // Show All Queries section
        document.getElementById('newQuerySection').style.display = 'none';
        document.getElementById('allQueriesSection').style.display = 'block';
        document.getElementById('queriesListSection').style.display = 'block';
        
        // Update menu active states if elements exist
        const allQueriesLink = document.getElementById('allQueriesLink');
        const newQueryLink = document.getElementById('newQueryLink');
        if (allQueriesLink) allQueriesLink.classList.add('active');
        if (newQueryLink) newQueryLink.classList.remove('active');
        
        // Load queries and wait for them to render before highlighting
        loadQueries().then(() => {
            // Wait a bit for DOM to update, then highlight
            setTimeout(() => {
                highlightAndScrollToQuery(queryId);
            }, 500);
        });
    } else if (hash === '#all') {
        // Show All Queries section
        document.getElementById('newQuerySection').style.display = 'none';
        document.getElementById('allQueriesSection').style.display = 'block';
        document.getElementById('queriesListSection').style.display = 'block';
        
        // Update menu active states if elements exist
        const allQueriesLink = document.getElementById('allQueriesLink');
        const newQueryLink = document.getElementById('newQueryLink');
        if (allQueriesLink) allQueriesLink.classList.add('active');
        if (newQueryLink) newQueryLink.classList.remove('active');
        
        loadQueries();
    } else {
        // Show New Query section by default
        document.getElementById('newQuerySection').style.display = 'block';
        document.getElementById('allQueriesSection').style.display = 'none';
        document.getElementById('queriesListSection').style.display = 'none';
        
        // Update menu active states if elements exist
        const allQueriesLink = document.getElementById('allQueriesLink');
        const newQueryLink = document.getElementById('newQueryLink');
        if (newQueryLink) newQueryLink.classList.add('active');
        if (allQueriesLink) allQueriesLink.classList.remove('active');
    }
     
     // Load projects after authentication is complete
     loadProjects();
 }

// Highlight and scroll to a specific query
function highlightAndScrollToQuery(queryId) {
    console.log('highlightAndScrollToQuery called with ID:', queryId);
    const queryCard = document.querySelector(`[data-query-id="${queryId}"]`);
    console.log('Query card found:', queryCard);
    
    if (queryCard) {
        // Scroll to the query
        queryCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect
        queryCard.classList.add('query-highlighted');
        console.log('Highlight class added');
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
            queryCard.classList.remove('query-highlighted');
        }, 3000);
        
        // Expand the query if it's collapsed
        const queryText = queryCard.querySelector('.query-text');
        if (queryText && queryText.classList.contains('collapsed')) {
            const expandBtn = queryCard.querySelector('.expand-btn');
            if (expandBtn) {
                expandBtn.click();
            }
        }
    } else {
        console.error('Query not found with ID:', queryId);
        showNotification(`Query #${queryId} not found`, 'error');
    }
}

// Show main content
function showMainContent() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
}

// Application functions

// Function to clear username and regenerate
function resetUsername() {
    localStorage.removeItem('queryTrackerUsername');
    console.log('Username cleared from localStorage');
    // Reload the page to regenerate username
    window.location.reload();
}

// Automatic Windows Authentication functions
async function autoLogin() {
    try {
        console.log('Attempting auto-login...');
        const response = await fetch('/api/auth/auto-login');
        const result = await response.json();
        
        if (result.success) {
            sessionId = result.sessionId;
            currentUsername = result.username;
            isAuthenticated = true;
            
            // Store session in localStorage
            localStorage.setItem('queryTrackerSession', JSON.stringify({
                sessionId: sessionId,
                username: currentUsername,
                loginTime: Date.now(),
                autoLogin: true
            }));
            
            showUserInfo();
            showNotification('Auto-login successful!', 'success');
            console.log('Auto-login successful for:', currentUsername);
            return true;
        } else {
            console.error('Auto-login failed:', result.message);
            showNotification('Auto-login failed: ' + result.message, 'error');
            return false;
        }
    } catch (error) {
        console.error('Auto-login error:', error);
        showNotification('Auto-login failed. Please try again.', 'error');
        return false;
    }
}

async function refreshUser() {
    try {
        // Clear stored username and regenerate
        localStorage.removeItem('queryTrackerUsername');
        
        // Get new username
        const newUsername = await getWindowsUsername();
        currentUsername = newUsername;
        
        // Update display
        document.getElementById('authenticatedUser').textContent = currentUsername;
        showNotification('Device info refreshed', 'success');
        console.log('Device info refreshed:', currentUsername);
    } catch (error) {
        console.error('Refresh user error:', error);
        showNotification('Failed to refresh device info', 'error');
    }
}

function showUserInfo() {
    document.getElementById('userInfoSection').style.display = 'block';
    document.getElementById('authenticatedUser').textContent = currentUsername;
}

async function checkExistingSession() {
    try {
        const storedSession = localStorage.getItem('queryTrackerSession');
        if (storedSession) {
            const session = JSON.parse(storedSession);
            
            // Check if session is still valid (24 hours)
            if (Date.now() - session.loginTime < 24 * 60 * 60 * 1000) {
                sessionId = session.sessionId;
                currentUsername = session.username;
                isAuthenticated = true;
                
                // Verify session with server
                const response = await fetch('/api/auth/current-user', {
                    headers: {
                        'X-Session-ID': sessionId
                    }
                });
                
                if (response.ok) {
                    showUserInfo();
                    console.log('Restored session for:', currentUsername);
                    return true;
                }
            }
            
            // Clear invalid session
            localStorage.removeItem('queryTrackerSession');
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
    
    return false;
}

// Function to show all available client-side information
function showClientInfo() {
    console.log('=== AVAILABLE CLIENT-SIDE INFORMATION ===');
    
    // Browser Information
    console.log('🌐 BROWSER INFO:');
    console.log('User Agent:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    console.log('Language:', navigator.language);
    console.log('Languages:', navigator.languages);
    console.log('Cookie Enabled:', navigator.cookieEnabled);
    console.log('Online Status:', navigator.onLine);
    console.log('Do Not Track:', navigator.doNotTrack);
    
    // Hardware Information
    console.log('💻 HARDWARE INFO:');
    console.log('Screen Resolution:', screen.width + 'x' + screen.height);
    console.log('Screen Color Depth:', screen.colorDepth);
    console.log('Screen Pixel Depth:', screen.pixelDepth);
    console.log('Available Screen Size:', screen.availWidth + 'x' + screen.availHeight);
    console.log('CPU Cores:', navigator.hardwareConcurrency);
    console.log('Device Memory:', navigator.deviceMemory || 'Not available');
    console.log('Connection:', navigator.connection ? navigator.connection.effectiveType : 'Not available');
    
    // Time and Location
    console.log('🕐 TIME & LOCATION:');
    console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('Timezone Offset:', new Date().getTimezoneOffset());
    console.log('Current Time:', new Date().toISOString());
    console.log('Date Locale:', new Date().toLocaleDateString());
    console.log('Time Locale:', new Date().toLocaleTimeString());
    
    // Network Information
    console.log('🌐 NETWORK INFO:');
    console.log('Hostname:', window.location.hostname);
    console.log('Protocol:', window.location.protocol);
    console.log('Port:', window.location.port);
    console.log('Pathname:', window.location.pathname);
    console.log('Referrer:', document.referrer);
    
    // Browser Capabilities
    console.log('🔧 BROWSER CAPABILITIES:');
    console.log('WebGL Vendor:', getWebGLInfo().vendor);
    console.log('WebGL Renderer:', getWebGLInfo().renderer);
    console.log('Canvas Fingerprint:', getCanvasFingerprint());
    console.log('Audio Context:', getAudioFingerprint());
    
    // Storage Information
    console.log('💾 STORAGE INFO:');
    console.log('Local Storage Available:', typeof(Storage) !== 'undefined');
    console.log('Session Storage Available:', typeof(sessionStorage) !== 'undefined');
    console.log('IndexedDB Available:', 'indexedDB' in window);
    console.log('WebSQL Available:', 'openDatabase' in window);
    
    // Performance Information
    console.log('⚡ PERFORMANCE INFO:');
    console.log('Memory Usage:', performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    } : 'Not available');
    
    // Plugin Information
    console.log('🔌 PLUGIN INFO:');
    console.log('Plugins Count:', navigator.plugins.length);
    for (let i = 0; i < navigator.plugins.length; i++) {
        console.log(`Plugin ${i}:`, navigator.plugins[i].name);
    }
    
    console.log('=== END OF CLIENT INFO ===');
}

// Helper functions for fingerprinting
function getWebGLInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return {
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'
            };
        }
    } catch (e) {}
    return { vendor: 'Unknown', renderer: 'Unknown' };
}

function getCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Canvas fingerprint', 2, 2);
        return canvas.toDataURL();
    } catch (e) {
        return 'Error';
    }
}

function getAudioFingerprint() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const analyser = audioContext.createAnalyser();
        oscillator.connect(analyser);
        oscillator.frequency.value = 1000;
        oscillator.start();
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        oscillator.stop();
        audioContext.close();
        return Array.from(data).slice(0, 10).join(',');
    } catch (e) {
        return 'Error';
    }
}

// DOM elements - will be initialized after DOM is loaded
let queryForm, queriesList, loadingSpinner, noQueries, queryCount;
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');

// Schema elements
const schemaName = document.getElementById('schemaName');
const newSchemaInput = document.getElementById('newSchemaInput');
const editSchemaName = document.getElementById('editSchemaName');
const editNewSchemaInput = document.getElementById('editNewSchemaInput');
const searchSchema = document.getElementById('searchSchema');

// Modals
const deleteModal = document.getElementById('deleteModal');
const editModal = document.getElementById('editModal');
const versionModal = document.getElementById('versionModal');

// Modal elements
const closeModal = document.querySelectorAll('.close');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');
const saveEdit = document.getElementById('saveEdit');
const cancelEdit = document.getElementById('cancelEdit');
const closeVersion = document.getElementById('closeVersion');

// Edit form elements
const editQueryText = document.getElementById('editQueryText');
const editPurpose = document.getElementById('editPurpose');
const editEnvironment = document.getElementById('editEnvironment');

// Version list
const versionList = document.getElementById('versionList');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    queryForm = document.getElementById('queryForm');
    queriesList = document.getElementById('queriesList');
    loadingSpinner = document.getElementById('loadingSpinner');
    noQueries = document.getElementById('noQueries');
    queryCount = document.getElementById('queryCount');
    
    initializeApp();
    setupEventListeners();
    updateSchemaDropdowns();
    updateRecipientDropdown();
});

function setupEventListeners() {
    debugger; // Debugger 1: This will pause when setupEventListeners is called
    console.log('setupEventListeners called'); // Debug log
    
    // Username button - click to open profile
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Dashboard link
    const dashboardLink = document.getElementById('dashboardLink');
    console.log('dashboardLink element found:', dashboardLink); // Debug log
    if (dashboardLink) {
        console.log('Adding event listener to dashboard link'); // Debug log
        dashboardLink.addEventListener('click', (e) => {
            debugger; // Debugger 2: This will pause when dashboard link is clicked
            console.log('Dashboard link clicked!'); // Debug log
            e.preventDefault();
            window.location.href = 'dashboard.html';
        });
    } else {
        console.log('dashboardLink element not found!'); // Debug log
    }
    
    // Logout link
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Navigation between New Query and All Queries sections
    // Note: Menu links are handled by menu.js after menu generation
    // We only handle the New Query button here
    const newQueryBtn = document.getElementById('newQueryBtn');
    
    if (newQueryBtn) {
        newQueryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('newQuerySection').style.display = 'block';
            document.getElementById('allQueriesSection').style.display = 'none';
            document.getElementById('queriesListSection').style.display = 'none'; // Hide queries list
            const newLink = document.getElementById('newQueryLink');
            const allLink = document.getElementById('allQueriesLink');
            if (newLink) newLink.classList.add('active');
            if (allLink) allLink.classList.remove('active');
            // Scroll to top of form
            document.getElementById('queryForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    
    // Form submission
    queryForm.addEventListener('submit', handleFormSubmit);
    
    // Project dropdown functionality
    const projectName = document.getElementById('projectName');
    if (projectName) {
        projectName.addEventListener('change', function() {
            loadSchemasForProject(this.value);
        });
    }
    
    // Schema dropdown functionality
    schemaName.addEventListener('change', handleSchemaChange);
    editSchemaName.addEventListener('change', handleEditSchemaChange);
    
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Modal functionality
    closeModal.forEach(close => {
        close.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
            currentOpenModal = null;
        });
    });
    
    confirmDelete.addEventListener('click', handleDeleteConfirm);
    cancelDelete.addEventListener('click', closeDeleteModal);
    saveEdit.addEventListener('click', handleEditSave);
    cancelEdit.addEventListener('click', closeEditModal);
    closeVersion.addEventListener('click', closeVersionModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            currentOpenModal = null;
        }
    });
    
    // Enter key in search inputs
    document.getElementById('searchQuery').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('searchUser').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('searchPurpose').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('searchSchema').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('searchEnvironment').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && currentOpenModal) {
            // Close the currently open modal
            currentOpenModal.style.display = 'none';
            
            // Clean up modal-specific state
            if (currentOpenModal.id === 'editModal') {
                closeEditModal();
            } else if (currentOpenModal.id === 'versionModal') {
                closeVersionModal();
            } else if (currentOpenModal.id === 'deleteModal') {
                closeDeleteModal();
            } else if (currentOpenModal.id === 'recipientModal') {
                closeRecipientModal();
            }
            
            currentOpenModal = null;
        }
    });
    
    // Event delegation for copy buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.copy-query-btn')) {
            const button = e.target.closest('.copy-query-btn');
            const queryId = button.getAttribute('data-query-id');
            const queryText = button.getAttribute('data-query-text').replace(/&quot;/g, '"');
            copyQueryToClipboard(queryId, queryText);
        }
    });
}

// Handle schema dropdown change
function handleSchemaChange() {
    if (schemaName.value === 'add_new') {
        newSchemaInput.style.display = 'block';
        newSchemaInput.required = true;
        newSchemaInput.focus();
    } else {
        newSchemaInput.style.display = 'none';
        newSchemaInput.required = false;
        newSchemaInput.value = '';
    }
}

// Handle edit schema dropdown change
function handleEditSchemaChange() {
    if (editSchemaName.value === 'add_new') {
        editNewSchemaInput.style.display = 'block';
        editNewSchemaInput.required = true;
        editNewSchemaInput.focus();
    } else {
        editNewSchemaInput.style.display = 'none';
        editNewSchemaInput.required = false;
        editNewSchemaInput.value = '';
    }
}

// Load projects and populate dropdown
async function loadProjects() {
    console.log('[DEBUG] loadProjects called');
    try {
        const response = await fetch('/api/projects', {
            headers: { 'x-session-id': sessionId }
        });
        
        console.log('[DEBUG] loadProjects response status:', response.status);
        
        if (response.ok) {
            const projects = await response.json();
            console.log('[DEBUG] loadProjects received', projects.length, 'projects:', projects);
            
            const projectDropdown = document.getElementById('projectName');
            const editProjectDropdown = document.getElementById('editProjectName');
            
            if (projectDropdown) {
                projectDropdown.innerHTML = '<option value="">Select Project</option>';
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.name;
                    option.textContent = project.name;
                    projectDropdown.appendChild(option);
                });
                console.log('[DEBUG] Added', projects.length, 'projects to dropdown');
            } else {
                console.error('[ERROR] projectName dropdown not found');
            }
            
            if (editProjectDropdown) {
                editProjectDropdown.innerHTML = '<option value="">Select Project</option>';
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.name;
                    option.textContent = project.name;
                    editProjectDropdown.appendChild(option);
                });
            }
        } else {
            console.error('[ERROR] loadProjects failed with status:', response.status);
        }
    } catch (error) {
        console.error('[ERROR] Error loading projects:', error);
    }
}

// Load schemas for a specific project
async function loadSchemasForProject(projectName) {
    if (!projectName) {
        schemaName.innerHTML = '<option value="">Select Project First</option>';
        schemaName.disabled = true;
        return;
    }
    
    try {
        const response = await fetch(`/api/schemas/${projectName}`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (response.ok) {
            const schemas = await response.json();
            schemaName.innerHTML = '<option value="">Select Schema</option>';
            
            schemas.forEach(schema => {
                const option = document.createElement('option');
                option.value = schema.name;
                option.textContent = schema.name;
                schemaName.appendChild(option);
            });
            
            schemaName.disabled = false;
        }
    } catch (error) {
        console.error('Error loading schemas:', error);
        schemaName.innerHTML = '<option value="">Error loading schemas</option>';
        schemaName.disabled = true;
    }
}

// Load schemas for edit modal
async function loadEditSchemasForProject(projectName) {
    if (!projectName) {
        editSchemaName.innerHTML = '<option value="">Select Project First</option>';
        editSchemaName.disabled = true;
        return;
    }
    
    try {
        const response = await fetch(`/api/schemas/${projectName}`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (response.ok) {
            const schemas = await response.json();
            
            // Clear all existing options first
            editSchemaName.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select Schema';
            editSchemaName.appendChild(defaultOption);
            
            // Add schema options
            schemas.forEach(schema => {
                const option = document.createElement('option');
                option.value = schema.name;
                option.textContent = schema.name;
                editSchemaName.appendChild(option);
            });
            
            // Add "Add New Schema" option
            const addNewOption = document.createElement('option');
            addNewOption.value = 'add_new';
            addNewOption.textContent = '+ Add New Schema';
            editSchemaName.appendChild(addNewOption);
            
            editSchemaName.disabled = false;
        } else {
            console.error('Failed to load schemas, status:', response.status);
        }
    } catch (error) {
        console.error('Error loading schemas for edit:', error);
        editSchemaName.innerHTML = '<option value="">Error loading schemas</option>';
        editSchemaName.disabled = true;
    }
}

// Update all schema dropdowns
function updateSchemaDropdowns() {
    // Update main form schema dropdown
    updateSchemaDropdown(schemaName, 'Select Schema');
    
    // Don't update edit form schema dropdown - it should be loaded dynamically based on project
    // updateSchemaDropdown(editSchemaName, 'Select Schema');
    
    // Update search form schema dropdown
    updateSchemaDropdown(searchSchema, 'All Schemas');
}

// Update a specific schema dropdown
function updateSchemaDropdown(dropdown, defaultText) {
    const currentValue = dropdown.value;
    const isSearch = dropdown === searchSchema;
    
    // Clear existing options except the first one
    while (dropdown.children.length > 1) {
        dropdown.removeChild(dropdown.lastChild);
    }
    
    // Add schema options
    availableSchemas.forEach(schema => {
        const option = document.createElement('option');
        option.value = schema;
        option.textContent = schema;
        dropdown.appendChild(option);
    });
    
    // Add "Add New Schema" option for forms (not search)
    if (!isSearch) {
        const addNewOption = document.createElement('option');
        addNewOption.value = 'add_new';
        addNewOption.textContent = '+ Add New Schema';
        dropdown.appendChild(addNewOption);
    }
    
    // Restore previous value if it still exists
    if (currentValue && availableSchemas.includes(currentValue)) {
        dropdown.value = currentValue;
    }
}

// Add new schema to the list
function addNewSchema(schemaName) {
    if (schemaName && !availableSchemas.includes(schemaName)) {
        availableSchemas.push(schemaName);
        updateSchemaDropdowns();
        return true;
    }
    return false;
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(queryForm);
    let schemaValue = formData.get('schemaName');
    
    // Handle new schema input
    if (schemaValue === 'add_new') {
        const newSchema = formData.get('newSchemaInput').trim();
        if (!newSchema) {
            showNotification('Please enter a new schema name', 'error');
            return;
        }
        schemaValue = newSchema;
        addNewSchema(newSchema);
    }
    
    const queryData = {
        query_text: formData.get('queryText'),
        purpose: formData.get('purpose'),
        project: formData.get('projectName'),
        schema_name: schemaValue,
        environment: formData.get('environment'),
        priority: formData.get('priority') || 'Medium',
        status: formData.get('status') || 'In Progress'
    };
    
    try {
        const response = await fetch('/api/queries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(queryData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('Query saved successfully!', 'success');
            queryForm.reset();
            newSchemaInput.style.display = 'none';
            newSchemaInput.required = false;
            // Switch to All Queries section after successful submission
            document.getElementById('newQuerySection').style.display = 'none';
            document.getElementById('allQueriesSection').style.display = 'block';
            document.getElementById('queriesListSection').style.display = 'block'; // Show queries list
            const allLink = document.getElementById('allQueriesLink');
            const newLink = document.getElementById('newQueryLink');
            if (allLink) allLink.classList.add('active');
            if (newLink) newLink.classList.remove('active');
            loadQueries(); // Reload the list
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to save query', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Load all queries
async function loadQueries() {
    console.log('Loading queries...');
    showLoading(true);
    
    try {
        const response = await fetch('/api/queries', {
            headers: {
                'x-session-id': sessionId
            }
        });
        console.log('Response status:', response.status);
        if (response.ok) {
            currentQueries = await response.json();
            console.log('Loaded queries:', currentQueries.length);
            displayQueries(currentQueries);
        } else if (response.status === 401) {
            // Session expired
            logout();
        } else {
            console.error('Failed to load queries, status:', response.status);
            showNotification('Failed to load queries', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Display queries in the list
function displayQueries(queries) {
    console.log('Displaying queries:', queries.length);
    if (!queriesList || !noQueries || !queryCount) {
        console.error('DOM elements not found');
        return;
    }
    
    if (queries.length === 0) {
        console.log('No queries to display');
        queriesList.innerHTML = '';
        noQueries.style.display = 'block';
        queryCount.textContent = '0 queries';
        return;
    }
    
    console.log('Rendering queries...');
    noQueries.style.display = 'none';
    queryCount.textContent = `${queries.length} query${queries.length !== 1 ? 'ies' : ''}`;
    
    const queriesHTML = queries.map(query => createQueryHTML(query)).join('');
    queriesList.innerHTML = queriesHTML;
    
    // Add event listeners to buttons
    setupQueryEventListeners();
    
    // Set formatted query content and auto-collapse large queries
    queries.forEach(query => {
        const queryTextElement = document.getElementById(`query-text-${query.id}`);
        if (queryTextElement) {
            // Set the formatted SQL content
            const formattedContent = formatSQLQuery(query.query_text);
            queryTextElement.innerHTML = formattedContent;
            
            // Auto-collapse large queries
            if (shouldCollapseQuery(query.query_text)) {
                queryTextElement.classList.add('collapsed');
            }
        }
    });
}

// Create HTML for a single query
function createQueryHTML(query) {
    const timestamp = new Date(query.timestamp).toLocaleString();
    
    // Check if user can edit/delete this query
    const isOwner = currentUser && query.user_name === currentUser.username;
    const canEdit = isOwner || userPermissions.can_edit_others || (currentUser && currentUser.role === 'admin');
    const canDelete = isOwner || userPermissions.can_delete_others || (currentUser && currentUser.role === 'admin');
    
    return `
        <div class="query-item" data-query-id="${query.id}">
            <div class="query-header">
                <h3>
                    Query #${query.id}
                    <span class="version-badge">v${query.version || 1}</span>
                </h3>
                <div class="query-actions">
                    <button class="btn btn-sm btn-info view-versions-btn" data-id="${query.id}">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button class="btn btn-sm btn-info view-approval-btn" data-id="${query.id}">
                        <i class="fas fa-check-circle"></i> Approval Status
                    </button>
                    ${canEdit ? `
                    <button class="btn btn-sm btn-warning edit-btn" data-id="${query.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ` : ''}
                    <button class="btn btn-sm btn-success outlook-btn" 
                            data-id="${query.id}"
                            data-query="${query.query_text.replace(/"/g, '&quot;')}"
                            data-user="${query.user_name}"
                            data-purpose="${query.purpose}"
                            data-schema="${query.schema_name}"
                            data-environment="${query.environment}">
                        <i class="fas fa-envelope"></i> Send via Outlook
                    </button>
                    ${canDelete ? `
                    <button class="btn btn-sm btn-danger delete-btn" 
                            data-id="${query.id}" 
                            data-query="${query.query_text.replace(/"/g, '&quot;')}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="query-meta">
                <span><i class="fas fa-user"></i> ${query.user_name}</span>
                <span><i class="fas fa-clock"></i> ${timestamp}</span>
                <span><i class="fas fa-database"></i> ${query.schema_name}</span>
                <span><i class="fas fa-server"></i> ${query.environment}</span>
            </div>
            
            <div class="query-status-priority">
                <span class="status-badge status-${(query.status || 'Pending').toLowerCase().replace(' ', '-')}">${query.status || 'Pending'}</span>
                <span class="priority-badge priority-${(query.priority || 'Medium').toLowerCase()}">${query.priority || 'Medium'} Priority</span>
                ${query.assigned_to ? `<span class="assigned-badge"><i class="fas fa-user-tag"></i> ${query.assigned_to}</span>` : ''}
            </div>
            
            <div class="query-text-container">
                <div class="query-text" id="query-text-${query.id}">Loading...</div>
                <button class="copy-query-btn" data-query-id="${query.id}" data-query-text="${query.query_text.replace(/"/g, '&quot;')}" title="Copy query to clipboard">
                    <i class="fas fa-copy"></i>
                </button>
                ${shouldCollapseQuery(query.query_text) ? `
                    <button class="expand-toggle-btn" id="expand-btn-${query.id}" onclick="toggleQueryExpansion('${query.id}')" title="Expand query">
                        <i class="fas fa-expand-alt"></i> Show More
                    </button>
                ` : ''}
            </div>
            
            <div class="query-purpose">
                <strong>Purpose:</strong> ${escapeHTML(query.purpose)}
            </div>
            
            <!-- Comments Section -->
            <div class="comments-section" id="comments-section-${query.id}">
                <div class="comments-header">
                    <h4><i class="fas fa-comments"></i> Comments</h4>
                    <button class="btn-sm btn-toggle-comments" onclick="toggleComments('${query.id}')">
                        <i class="fas fa-chevron-down"></i> Show Comments
                    </button>
                </div>
                <div class="comments-container" id="comments-container-${query.id}" style="display: none;">
                    <div class="comments-list" id="comments-list-${query.id}">
                        <div class="loading-comments"><i class="fas fa-spinner fa-spin"></i> Loading comments...</div>
                    </div>
                    <div class="add-comment-form">
                        <textarea id="comment-input-${query.id}" placeholder="Add a comment..." rows="2"></textarea>
                        <button class="btn btn-sm btn-primary" onclick="addComment('${query.id}')">
                            <i class="fas fa-paper-plane"></i> Post Comment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Update query status
async function updateQueryStatus(queryId, newStatus) {
    try {
        const response = await fetch(`/api/queries/${queryId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ 
                status: newStatus,
                completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update status');
        }

        showNotification(`Status updated to: ${newStatus}`, 'success');
        
        // Reload queries to show updated status badge
        await loadQueries();
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Failed to update status', 'error');
        
        // Reload to reset dropdown
        await loadQueries();
    }
}

// Setup event listeners for query actions
function setupQueryEventListeners() {
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const queryId = this.getAttribute('data-id');
            const queryText = this.getAttribute('data-query');
            showDeleteModal(queryId, queryText);
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const queryId = this.getAttribute('data-id');
            showEditModal(queryId);
        });
    });
    
    // View versions buttons
    document.querySelectorAll('.view-versions-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const queryId = this.getAttribute('data-id');
            showVersionHistory(queryId);
        });
    });
    
    // View approval status buttons
    document.querySelectorAll('.view-approval-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const queryId = this.getAttribute('data-id');
            showApprovalTracking(queryId);
        });
    });
    
    // Outlook buttons
    document.querySelectorAll('.outlook-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const queryId = this.getAttribute('data-id');
            const queryText = this.getAttribute('data-query');
            const userName = this.getAttribute('data-user');
            const purpose = this.getAttribute('data-purpose');
            const schema = this.getAttribute('data-schema');
            const environment = this.getAttribute('data-environment');
            sendViaOutlook(queryId, queryText, userName, purpose, schema, environment);
        });
    });
}

// Show edit modal
async function showEditModal(queryId) {
    try {
        const response = await fetch(`/api/queries/${queryId}`, {
            headers: {
                'x-session-id': sessionId
            }
        });
        if (response.ok) {
            const query = await response.json();
            currentQueryData = query;
            editQueryId = queryId;
            
            // Store original username and populate edit form
            originalUsername = query.user_name;
            editQueryText.value = query.query_text;
            editPurpose.value = query.purpose;
            editSchemaName.value = query.schema_name;
            editEnvironment.value = query.environment;
            
            // Populate priority and status
            const editPriority = document.getElementById('editPriority');
            const editStatus = document.getElementById('editStatus');
            if (editPriority) editPriority.value = query.priority || 'Medium';
            if (editStatus) editStatus.value = query.status || 'Pending';
            
            // Load schemas based on project
            if (query.project) {
                // Load schemas for the assigned project
                await loadEditSchemasForProject(query.project);
            }
            
            // Set the current schema value after loading schemas
            if (query.project) {
                editSchemaName.value = query.schema_name;
            }
            
            // Handle schema display
            if (!availableSchemas.includes(query.schema_name)) {
                // If schema doesn't exist in dropdown, add it
                addNewSchema(query.schema_name);
            }
            
            // Hide new schema input initially
            editNewSchemaInput.style.display = 'none';
            editNewSchemaInput.required = false;
            
            // Show modal
            editModal.style.display = 'block';
            currentOpenModal = editModal;
        } else {
            showNotification('Failed to load query for editing', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Close edit modal
function closeEditModal() {
    editModal.style.display = 'none';
    editQueryId = null;
    currentQueryData = null;
    currentOpenModal = null;
}

// Handle edit save
async function handleEditSave() {
    if (!editQueryId) return;
    
    let schemaValue = editSchemaName.value;
    
    // Handle new schema input
    if (schemaValue === 'add_new') {
        const newSchema = editNewSchemaInput.value.trim();
        if (!newSchema) {
            showNotification('Please enter a new schema name', 'error');
            return;
        }
        schemaValue = newSchema;
        addNewSchema(newSchema);
    }
    
    const editPriority = document.getElementById('editPriority');
    const editStatus = document.getElementById('editStatus');
    
    const editData = {
        query_text: editQueryText.value,
        user_name: originalUsername, // Use original username, don't allow changes
        purpose: editPurpose.value,
        schema_name: schemaValue,
        environment: editEnvironment.value,
        priority: editPriority ? editPriority.value : 'Medium',
        status: editStatus ? editStatus.value : 'Pending'
    };
    
    try {
        const response = await fetch(`/api/queries/${editQueryId}/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(editData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`Query updated successfully! New version ${result.version} created.`, 'success');
            closeEditModal();
            loadQueries(); // Reload the list
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to update query', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Show version history
async function showVersionHistory(queryId) {
    try {
        const response = await fetch(`/api/queries/${queryId}/versions`, {
            headers: {
                'x-session-id': sessionId
            }
        });
        if (response.ok) {
            const versions = await response.json();
            displayVersionHistory(versions);
            versionModal.style.display = 'block';
            currentOpenModal = versionModal;
        } else {
            showNotification('Failed to load version history', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Display version history
function displayVersionHistory(versions) {
    const versionsHTML = versions.map(version => `
        <div class="version-item">
            <div class="version-header">
                <h4>Version ${version.version}</h4>
                <span class="version-badge">v${version.version}</span>
            </div>
            
            <div class="version-info">
                <span><i class="fas fa-user"></i> ${version.user_name}</span>
                <span><i class="fas fa-clock"></i> ${new Date(version.timestamp).toLocaleString()}</span>
                <span><i class="fas fa-database"></i> ${version.schema_name}</span>
                <span><i class="fas fa-server"></i> ${version.environment}</span>
            </div>
            
            <div class="query-text-container">
                <div class="version-text" id="version-text-${version.id}">Loading...</div>
                ${shouldCollapseQuery(version.query_text) ? `
                    <button class="expand-toggle-btn" id="version-expand-btn-${version.id}" onclick="toggleVersionExpansion('${version.id}')" title="Expand query">
                        <i class="fas fa-expand-alt"></i> Show More
                    </button>
                ` : ''}
            </div>
            
            <div class="query-purpose">
                <strong>Purpose:</strong> ${escapeHTML(version.purpose)}
            </div>
        </div>
    `).join('');
    
    versionList.innerHTML = versionsHTML;
    
    // Set formatted query content and auto-collapse large version queries
    versions.forEach(version => {
        const versionTextElement = document.getElementById(`version-text-${version.id}`);
        if (versionTextElement) {
            // Set the formatted SQL content
            versionTextElement.innerHTML = formatSQLQuery(version.query_text);
            
            // Auto-collapse large queries
            if (shouldCollapseQuery(version.query_text)) {
                versionTextElement.classList.add('collapsed');
            }
        }
    });
}

// Close version modal
function closeVersionModal() {
    versionModal.style.display = 'none';
    currentOpenModal = null;
}

// Show approval tracking panel
async function showApprovalTracking(queryId) {
    const panel = document.getElementById('approvalTrackingPanel');
    const panelContent = document.getElementById('approvalPanelContent');
    
    // Show loading state
    panelContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #58a6ff;"></i>
            <p>Loading approval status...</p>
        </div>
    `;
    
    // Slide in the panel
    panel.classList.add('active');
    
    try {
        // Load approvals
        const approvalsResponse = await fetch(`/api/queries/${queryId}/approvals`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!approvalsResponse.ok) throw new Error('Failed to load approvals');
        
        const approvals = await approvalsResponse.json();
        
        // Load query details
        const queryResponse = await fetch(`/api/queries/${queryId}`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!queryResponse.ok) throw new Error('Failed to load query details');
        
        const query = await queryResponse.json();
        
        // Display approval tracking
        displayApprovalTracking(query, approvals);
        
    } catch (error) {
        console.error('Error loading approval tracking:', error);
        panelContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f85149;"></i>
                <p style="color: #f85149;">Error loading approval status</p>
            </div>
        `;
    }
}

// Display approval tracking
function displayApprovalTracking(query, approvals) {
    const panelContent = document.getElementById('approvalPanelContent');
    
    let approvalHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #c9d1d9; margin-bottom: 10px;">
                <i class="fas fa-database"></i> Query #${query.id}
            </h4>
            <div style="padding: 15px; background: #0d1117; border-radius: 8px; border: 1px solid #30363d;">
                <div style="margin-bottom: 10px;">
                    <strong style="color: #8b949e;">Purpose:</strong>
                    <p style="color: #c9d1d9; margin: 5px 0 0 0;">${escapeHTML(query.purpose)}</p>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong style="color: #8b949e;">Project:</strong>
                    <span style="color: #c9d1d9;">${query.project || 'N/A'}</span>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong style="color: #8b949e;">Status:</strong>
                    <span class="status-badge status-${(query.status || 'Pending').toLowerCase().replace(' ', '-')}">${query.status || 'Pending'}</span>
                </div>
            </div>
        </div>
    `;
    
    if (approvals.length === 0) {
        approvalHTML += `
            <div style="text-align: center; padding: 30px;">
                <i class="fas fa-info-circle" style="font-size: 2rem; color: #8b949e;"></i>
                <p style="color: #8b949e; margin-top: 15px;">No approval records found for this query.</p>
            </div>
        `;
    } else {
        approvalHTML += '<div class="approval-timeline">';
        
        approvals.forEach(approval => {
            const statusClass = approval.status === 'approved' ? 'approved' : approval.status === 'rejected' ? 'rejected' : 'pending';
            const isCurrent = approval.status === 'pending';
            const isCompleted = approval.status !== 'pending';
            
            approvalHTML += `
                <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>Level ${approval.level} Approval</h4>
                        <span class="status-badge status-${statusClass}">${approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}</span>
                        <div class="timeline-info">
                            <div><strong>Approver:</strong> ${approval.approver_username || 'Pending Assignment'}</div>
                            ${approval.approved_at ? `<div><strong>Date:</strong> ${new Date(approval.approved_at).toLocaleString()}</div>` : '<div><strong>Status:</strong> Pending</div>'}
                            ${approval.comments ? `<div class="timeline-comments"><strong>Comments:</strong><br>${escapeHTML(approval.comments)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        approvalHTML += '</div>';
    }
    
    panelContent.innerHTML = approvalHTML;
    
    // Set up close buttons
    document.getElementById('closeApprovalPanel').onclick = function() {
        document.getElementById('approvalTrackingPanel').classList.remove('active');
    };
    document.getElementById('closeApprovalPanelFooter').onclick = function() {
        document.getElementById('approvalTrackingPanel').classList.remove('active');
    };
    
    // Close on outside click
    document.getElementById('approvalTrackingPanel').onclick = function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    };
}

// Search functionality
async function handleSearch() {
    const searchQuery = document.getElementById('searchQuery').value.trim();
    const searchUser = document.getElementById('searchUser').value.trim();
    const searchPurpose = document.getElementById('searchPurpose').value.trim();
    const searchSchema = document.getElementById('searchSchema').value.trim();
    const searchEnvironment = document.getElementById('searchEnvironment').value.trim();
    const searchStatus = document.getElementById('searchStatus').value.trim();
    const searchPriority = document.getElementById('searchPriority').value.trim();
    
    if (!searchQuery && !searchUser && !searchPurpose && !searchSchema && !searchEnvironment && !searchStatus && !searchPriority) {
        loadQueries(); // Load all if no search criteria
        return;
    }
    
    showLoading(true);
    
    try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);
        if (searchUser) params.append('user', searchUser);
        if (searchPurpose) params.append('purpose', searchPurpose);
        if (searchSchema) params.append('schema', searchSchema);
        if (searchEnvironment) params.append('environment', searchEnvironment);
        if (searchStatus) params.append('status', searchStatus);
        if (searchPriority) params.append('priority', searchPriority);
        
        const response = await fetch(`/api/queries/search?${params.toString()}`, {
            headers: {
                'x-session-id': sessionId
            }
        });
        if (response.ok) {
            const results = await response.json();
            currentQueries = results;
            displayQueries(results);
        } else {
            showNotification('Search failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error during search', 'error');
    } finally {
        showLoading(false);
    }
}

// Clear search
function clearSearch() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('searchUser').value = '';
    document.getElementById('searchPurpose').value = '';
    document.getElementById('searchSchema').value = '';
    document.getElementById('searchEnvironment').value = '';
    document.getElementById('searchStatus').value = '';
    document.getElementById('searchPriority').value = '';
    loadQueries();
}

// Delete functionality
function showDeleteModal(queryId, queryText) {
    deleteQueryId = queryId;
    const previewElement = document.querySelector('.query-preview');
    if (previewElement) {
        previewElement.innerHTML = formatSQLQuery(queryText);
    }
    deleteModal.style.display = 'block';
    currentOpenModal = deleteModal;
}

function closeDeleteModal() {
    deleteModal.style.display = 'none';
    deleteQueryId = null;
    currentOpenModal = null;
}

async function handleDeleteConfirm() {
    if (!deleteQueryId) return;
    
    try {
        const response = await fetch(`/api/queries/${deleteQueryId}`, {
            method: 'DELETE',
            headers: {
                'x-session-id': sessionId
            }
        });
        
        if (response.ok) {
            showNotification('Query deleted successfully!', 'success');
            closeDeleteModal();
            loadQueries(); // Reload the list
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to delete query', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Utility functions
function showLoading(show) {
    if (!loadingSpinner || !queriesList) {
        console.error('Loading elements not found');
        return;
    }
    loadingSpinner.style.display = show ? 'block' : 'none';
    if (show) {
        queriesList.style.display = 'none';
    } else {
        queriesList.style.display = 'block';
    }
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format SQL query with syntax highlighting and proper formatting
function formatSQLQuery(sqlText) {
    if (!sqlText) return '';
    
    // Simple approach: just escape HTML and add basic formatting
    let formattedSQL = sqlText
        // Escape HTML characters
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        // Add line breaks
        .replace(/\n/g, '<br>')
        // Preserve multiple spaces
        .replace(/  +/g, function(match) {
            return '&nbsp;'.repeat(match.length);
        });
    
    return formattedSQL;
}

// Copy query to clipboard
async function copyQueryToClipboard(queryId, queryText) {
    try {
        await navigator.clipboard.writeText(queryText);
        showNotification(`Query #${queryId} copied to clipboard!`, 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = queryText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification(`Query #${queryId} copied to clipboard!`, 'success');
        } catch (fallbackErr) {
            showNotification('Failed to copy query to clipboard', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// Check if query should be collapsed (based on length or line count)
function shouldCollapseQuery(queryText) {
    if (!queryText) return false;
    
    // Collapse if query is longer than 500 characters or has more than 8 lines
    const lines = queryText.split('\n').length;
    return queryText.length > 500 || lines > 8;
}

// Toggle query expansion/collapse
function toggleQueryExpansion(queryId) {
    const queryTextElement = document.getElementById(`query-text-${queryId}`);
    const expandBtn = document.getElementById(`expand-btn-${queryId}`);
    
    if (!queryTextElement || !expandBtn) return;
    
    const isCollapsed = queryTextElement.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expand the query
        queryTextElement.classList.remove('collapsed');
        expandBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Show Less';
        expandBtn.title = 'Collapse query';
    } else {
        // Collapse the query
        queryTextElement.classList.add('collapsed');
        expandBtn.innerHTML = '<i class="fas fa-expand-alt"></i> Show More';
        expandBtn.title = 'Expand query';
    }
}

// Toggle version expansion/collapse
function toggleVersionExpansion(versionId) {
    const versionTextElement = document.getElementById(`version-text-${versionId}`);
    const expandBtn = document.getElementById(`version-expand-btn-${versionId}`);
    
    if (!versionTextElement || !expandBtn) return;
    
    const isCollapsed = versionTextElement.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expand the version query
        versionTextElement.classList.remove('collapsed');
        expandBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Show Less';
        expandBtn.title = 'Collapse query';
    } else {
        // Collapse the version query
        versionTextElement.classList.add('collapsed');
        expandBtn.innerHTML = '<i class="fas fa-expand-alt"></i> Show More';
        expandBtn.title = 'Expand query';
    }
}

// Toggle comments section
async function toggleComments(queryId) {
    const container = document.getElementById(`comments-container-${queryId}`);
    const btn = document.querySelector(`#comments-section-${queryId} .btn-toggle-comments`);
    
    if (!container || !btn) return;
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Comments';
        // Load comments when opening
        await loadComments(queryId);
    } else {
        container.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> Show Comments';
    }
}

// Load comments for a query
async function loadComments(queryId) {
    const commentsList = document.getElementById(`comments-list-${queryId}`);
    if (!commentsList) return;
    
    commentsList.innerHTML = '<div class="loading-comments"><i class="fas fa-spinner fa-spin"></i> Loading comments...</div>';
    
    try {
        const response = await fetch(`/api/queries/${queryId}/comments`, {
            headers: {
                'x-session-id': sessionId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load comments');
        }
        
        const comments = await response.json();
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments"><i class="fas fa-info-circle"></i> No comments yet. Be the first to comment!</div>';
        } else {
            const isOwner = (comment) => comment.user_name === currentUser.username;
            const canDelete = (comment) => isOwner(comment) || userPermissions.can_delete_comments;
            
            commentsList.innerHTML = comments.map(comment => {
                const showDeleteBtn = canDelete(comment);
                return `
                <div class="comment-item">
                    <div class="comment-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="comment-author"><i class="fas fa-user"></i> ${escapeHTML(comment.user_name)}</span>
                            ${showDeleteBtn ? `
                                <button class="btn-delete-comment" onclick="deleteComment('${queryId}', ${comment.id})" title="Delete comment">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                        <span class="comment-time">${new Date(comment.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="comment-text">${escapeHTML(comment.comment_text)}</div>
                </div>
            `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<div class="error-comments"><i class="fas fa-exclamation-triangle"></i> Failed to load comments</div>';
    }
}

// Add a new comment
async function addComment(queryId) {
    const input = document.getElementById(`comment-input-${queryId}`);
    if (!input) return;
    
    const commentText = input.value.trim();
    if (!commentText) {
        showNotification('Please enter a comment', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/queries/${queryId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ comment_text: commentText })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add comment');
        }
        
        // Clear input
        input.value = '';
        
        // Reload comments
        await loadComments(queryId);
        
        showNotification('Comment added successfully', 'success');
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

// Delete a comment
async function deleteComment(queryId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/queries/${queryId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'x-session-id': sessionId
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete comment');
        }
        
        // Reload comments
        await loadComments(queryId);
        
        showNotification('Comment deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting comment:', error);
        showNotification(error.message || 'Failed to delete comment', 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    // Add keyframe animation
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    document.body.appendChild(notification);
}

// Send query via Outlook
function sendViaOutlook(queryId, queryText, userName, purpose, schema, environment) {
    // Store the query data for the modal
    window.currentOutlookData = {
        queryId, queryText, userName, purpose, schema, environment
    };
    
    // Show recipient selection modal
    showRecipientModal();
}

// Show recipient selection modal
function showRecipientModal() {
    const recipientModal = document.getElementById('recipientModal');
    const recipientSelect = document.getElementById('recipientSelect');
    const newRecipientInput = document.getElementById('newRecipientInput');
    const emailPreviewContent = document.getElementById('emailPreviewContent');
    
    // Update recipient dropdown with latest saved recipients first
    updateRecipientDropdown();
    
    // Reset form and set default recipients AFTER dropdown is populated
    setTimeout(() => {
        console.log('Setting recipientSelect value to salmohaimeed01@moc.gov.sa');
        recipientSelect.value = 'salmohaimeed01@moc.gov.sa';
        console.log('RecipientSelect value after setting:', recipientSelect.value);
        console.log('RecipientSelect options:', Array.from(recipientSelect.options).map(opt => ({ value: opt.value, text: opt.text })));
        
    newRecipientInput.style.display = 'none';
    newRecipientInput.required = false;
        newRecipientInput.value = '';
        
        // Set default CC
        const ccSelect = document.getElementById('ccSelect');
        const newCCInput = document.getElementById('newCCInput');
        ccSelect.value = 'DBA@moc.gov.sa';
        newCCInput.style.display = 'none';
        newCCInput.required = false;
        newCCInput.value = '';
        
        // Force the form to recognize the values
        recipientSelect.setAttribute('data-selected', 'true');
        ccSelect.setAttribute('data-selected', 'true');
        
        // Trigger change events to ensure form recognizes the selections
        recipientSelect.dispatchEvent(new Event('change'));
        ccSelect.dispatchEvent(new Event('change'));
    }, 50);
    
    // Update email preview
    updateEmailPreview();
    
    // Update preview recipient display
    document.getElementById('previewRecipient').textContent = 'salmohaimeed01@moc.gov.sa';
    
    // Show modal
    recipientModal.style.display = 'block';
    currentOpenModal = recipientModal;
    
    // Add event listeners (remove existing ones first to prevent duplicates)
    recipientSelect.removeEventListener('change', handleRecipientChange);
    recipientSelect.addEventListener('change', handleRecipientChange);
    
    // CC field event listeners
    ccSelect.removeEventListener('change', handleCCChange);
    ccSelect.addEventListener('change', handleCCChange);
    
    // Add input event listener for new CC input
    newCCInput.removeEventListener('input', handleCCInputChange);
    newCCInput.addEventListener('input', handleCCInputChange);
    
    
    const sendEmailBtn = document.getElementById('sendEmail');
    const cancelEmailBtn = document.getElementById('cancelEmail');
    
    sendEmailBtn.removeEventListener('click', handleSendEmail);
    sendEmailBtn.addEventListener('click', handleSendEmail);
    
    cancelEmailBtn.removeEventListener('click', closeRecipientModal);
    cancelEmailBtn.addEventListener('click', closeRecipientModal);
    
    // Copy email content button
    const copyEmailContentBtn = document.getElementById('copyEmailContent');
    copyEmailContentBtn.removeEventListener('click', handleCopyEmailContent);
    copyEmailContentBtn.addEventListener('click', handleCopyEmailContent);
    
    // Download SQL file button
    const downloadSQLFileBtn = document.getElementById('downloadSQLFile');
    downloadSQLFileBtn.removeEventListener('click', handleDownloadSQLFile);
    downloadSQLFileBtn.addEventListener('click', handleDownloadSQLFile);
}

// Handle recipient selection change
function handleRecipientChange() {
    const recipientSelect = document.getElementById('recipientSelect');
    const newRecipientInput = document.getElementById('newRecipientInput');
    
    if (recipientSelect.value === 'add_new') {
        newRecipientInput.style.display = 'block';
        newRecipientInput.required = true;
        newRecipientInput.focus();
    } else {
        newRecipientInput.style.display = 'none';
        newRecipientInput.required = false;
        newRecipientInput.value = '';
    }
    
    // Update email preview when recipient changes
    updateEmailPreview();
}

// Handle CC selection change
function handleCCChange() {
    const ccSelect = document.getElementById('ccSelect');
    const newCCInput = document.getElementById('newCCInput');
    
    if (ccSelect.value === 'add_new_cc') {
        newCCInput.style.display = 'block';
        newCCInput.required = true;
        newCCInput.focus();
    } else {
        newCCInput.style.display = 'none';
        newCCInput.required = false;
        newCCInput.value = '';
    }
    
    // Update email preview when CC changes
    updateEmailPreview();
    
    // Also update the preview CC display immediately
    const previewCC = document.getElementById('previewCC');
    if (previewCC) {
        let ccValue = ccSelect.value;
        if (ccSelect.value === 'add_new_cc' && newCCInput.value.trim()) {
            ccValue = newCCInput.value.trim();
        }
        previewCC.textContent = ccValue || 'No CC selected';
    }
}

// Handle CC input change (when typing in new CC field)
function handleCCInputChange() {
    const ccSelect = document.getElementById('ccSelect');
    const newCCInput = document.getElementById('newCCInput');
    
    // Update email preview when CC input changes
    updateEmailPreview();
    
    // Update the preview CC display immediately
    const previewCC = document.getElementById('previewCC');
    if (previewCC && ccSelect.value === 'add_new_cc') {
        const ccValue = newCCInput.value.trim();
        previewCC.textContent = ccValue || 'No CC selected';
    }
}

// Update email preview
function updateEmailPreview() {
    const emailPreviewContent = document.getElementById('emailPreviewContent');
    const data = window.currentOutlookData;
    
    if (!data) return;
    
    const emailBody = generateEmailBody(data.queryId, data.queryText, data.userName, data.purpose, data.schema, data.environment);
    
    const recipientSelect = document.getElementById('recipientSelect');
    const ccSelect = document.getElementById('ccSelect');
    const newRecipientInput = document.getElementById('newRecipientInput');
    const newCCInput = document.getElementById('newCCInput');
    
    let toRecipient = recipientSelect.value;
    let ccRecipient = ccSelect.value;
    
    // Handle new recipient input
    if (recipientSelect.value === 'add_new' && newRecipientInput.value.trim()) {
        toRecipient = newRecipientInput.value.trim();
    }
    
    // Handle new CC input
    if (ccSelect.value === 'add_new_cc' && newCCInput.value.trim()) {
        ccRecipient = newCCInput.value.trim();
    }
    
    emailPreviewContent.innerHTML = `
        <div class="email-preview-item">
            <strong>To:</strong> <span id="previewRecipient">${toRecipient || 'Select recipient above'}</span>
        </div>
        <div class="email-preview-item">
            <strong>CC:</strong> <span id="previewCC">${ccRecipient || 'No CC selected'}</span>
        </div>
        <div class="email-preview-item">
            <strong>Subject:</strong> ${data.purpose} - ${data.environment} - ${data.schema}
        </div>
        <div class="email-preview-item">
            <strong>Body:</strong>
            <div class="email-body-preview">${emailBody.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="email-preview-item">
            <strong>Attachment:</strong> Query_${data.queryId}.sql
        </div>
    `;
}

// Handle send email
function handleSendEmail() {
    const recipientSelect = document.getElementById('recipientSelect');
    const newRecipientInput = document.getElementById('newRecipientInput');
    const ccSelect = document.getElementById('ccSelect');
    const newCCInput = document.getElementById('newCCInput');
    
    let recipient = recipientSelect.value;
    let ccRecipient = ccSelect.value;
    
    console.log('Selected recipient:', recipient);
    console.log('Selected CC:', ccRecipient);
    console.log('Recipient select element:', recipientSelect);
    console.log('Recipient select value:', recipientSelect.value);
    console.log('CC select element:', ccSelect);
    console.log('CC select value:', ccSelect.value);
    
    // Handle TO recipient
    if (recipient === 'add_new') {
        recipient = newRecipientInput.value.trim();
        if (!recipient) {
            showNotification('Please enter a valid email address for TO field', 'error');
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient)) {
            showNotification('Please enter a valid email address for TO field', 'error');
            return;
        }
        // Add new recipient to saved list
        addNewRecipient(recipient);
        showNotification(`New recipient "${recipient}" added to your list!`, 'success');
    }
    
    // Handle CC recipient
    if (ccRecipient === 'add_new_cc') {
        ccRecipient = newCCInput.value.trim();
        if (!ccRecipient) {
            showNotification('Please enter a valid email address for CC field', 'error');
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ccRecipient)) {
            showNotification('Please enter a valid email address for CC field', 'error');
            return;
        }
    }
    
    // Check if recipient is valid (not empty and not the placeholder)
    if (!recipient || recipient === '' || recipient === 'Select Recipient' || recipient === 'Select recipient above') {
        console.log('Validation failed - recipient:', recipient);
        showNotification('Please select a recipient', 'error');
        return;
    }
    
    console.log('Validation passed - recipient:', recipient, 'CC:', ccRecipient);
    
    // Update preview recipient and CC
    document.getElementById('previewRecipient').textContent = recipient;
    if (document.getElementById('previewCC')) {
        document.getElementById('previewCC').textContent = ccRecipient || 'No CC selected';
    }
    
    // Generate and send email
    const data = window.currentOutlookData;
    const emailConfig = {
        to: recipient,
        cc: ccRecipient || '',
        subject: `${data.purpose} - ${data.environment} - ${data.schema}`,
        body: generateEmailBody(data.queryId, data.queryText, data.userName, data.purpose, data.schema, data.environment)
    };
    
    // Create mailto link with CC
    const mailtoLink = `mailto:${emailConfig.to}?cc=${encodeURIComponent(emailConfig.cc)}&subject=${encodeURIComponent(emailConfig.subject)}&body=${encodeURIComponent(emailConfig.body)}`;
    
    // Open Outlook automatically with pre-filled email
    try {
        window.open(mailtoLink, '_blank');
        showNotification('Opening Outlook with pre-filled email and SQL query in the body...', 'success');
        closeRecipientModal();
    } catch (error) {
        console.error('Error opening Outlook:', error);
        showNotification('Failed to open Outlook. Please check your email client.', 'error');
    }
}

// Close recipient modal
function closeRecipientModal() {
    const recipientModal = document.getElementById('recipientModal');
    recipientModal.style.display = 'none';
    currentOpenModal = null;
    
    // Clean up event listeners
    const recipientSelect = document.getElementById('recipientSelect');
    const sendEmailBtn = document.getElementById('sendEmail');
    const cancelEmailBtn = document.getElementById('cancelEmail');
    
    recipientSelect.removeEventListener('change', handleRecipientChange);
    sendEmailBtn.removeEventListener('click', handleSendEmail);
    cancelEmailBtn.removeEventListener('click', closeRecipientModal);
}

// Generate email body
function generateEmailBody(queryId, queryText, userName, purpose, schema, environment) {
    const timestamp = new Date().toLocaleString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    // Format the query creator's name (for "Submitted by" field)
    // Add null/undefined check before calling split
    const formattedUserName = (userName || 'Unknown User').split(/[._]/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Format the session user's name (for signature)
    // Add null/undefined check for currentUser and full_name
    const sessionUserName = (currentUser && currentUser.full_name ? currentUser.full_name : 'User').split(/[._]/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Get the current server URL
    const serverUrl = window.location.origin;
    const queryLink = `${serverUrl}/?query=${queryId}`;
    
    // Ensure all required fields have fallback values
    const safePurpose = purpose || 'Query Request';
    const safeSchema = schema || 'Unknown Schema';
    const safeEnvironment = environment || 'Unknown Environment';
    const safeQueryText = queryText || 'No query text provided';
    
    return `Dear Infrastructure DB Team,

I hope this message finds you well.
Kindly assist with the following database query request:

===============================================================================
                              QUERY DETAILS
===============================================================================
Query ID         : ${queryId}
Submitted by     : ${formattedUserName}
Date             : ${timestamp}
Schema           : ${safeSchema}
Environment      : ${safeEnvironment}
Purpose          : ${safePurpose}
===============================================================================

View Query: ${queryLink}

SQL QUERY:
-------------------------------------------------------------------------------
${safeQueryText}
-------------------------------------------------------------------------------

Please review and execute this query at your earliest convenience.

Best regards,
${sessionUserName}`;
}

// Generate and download SQL file
function generateSQLFile(queryId, queryText, userName, purpose, schema, environment) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Query_${queryId}_${timestamp}.sql`;
    
    // Create file content with metadata header
    const fileContent = `-- Query ID: ${queryId}
-- Submitted by: ${userName}
-- Date: ${new Date().toLocaleString()}
-- Schema: ${schema}
-- Environment: ${environment}
-- Purpose: ${purpose}
-- 
-- ==============================================
-- SQL Query
-- ==============================================

${queryText}

-- End of Query
`;

    // Create blob and download
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    return filename;
}

// Copy email content to clipboard
async function handleCopyEmailContent() {
    const data = window.currentOutlookData;
    if (!data) return;
    
    const recipientSelect = document.getElementById('recipientSelect');
    const ccSelect = document.getElementById('ccSelect');
    const newRecipientInput = document.getElementById('newRecipientInput');
    const newCCInput = document.getElementById('newCCInput');
    
    let toRecipient = recipientSelect.value;
    let ccRecipient = ccSelect.value;
    
    // Handle new recipient input
    if (recipientSelect.value === 'add_new' && newRecipientInput.value.trim()) {
        toRecipient = newRecipientInput.value.trim();
    }
    
    // Handle new CC input
    if (ccSelect.value === 'add_new_cc' && newCCInput.value.trim()) {
        ccRecipient = newCCInput.value.trim();
    }
    
    const emailConfig = {
        to: toRecipient,
        cc: ccRecipient || '',
        subject: `${data.purpose} - ${data.environment} - ${data.schema}`,
        body: generateEmailBody(data.queryId, data.queryText, data.userName, data.purpose, data.schema, data.environment)
    };
    
    const fullEmailContent = `To: ${emailConfig.to}
CC: ${emailConfig.cc}
Subject: ${emailConfig.subject}

${emailConfig.body}`;
    
    try {
        await navigator.clipboard.writeText(fullEmailContent);
        showNotification('Email content copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = fullEmailContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('Email content copied to clipboard!', 'success');
        } catch (fallbackErr) {
            showNotification('Failed to copy email content', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// Download SQL file manually
function handleDownloadSQLFile() {
    const data = window.currentOutlookData;
    if (!data) return;
    
    const fileName = generateSQLFile(data.queryId, data.queryText, data.userName, data.purpose, data.schema, data.environment);
    showNotification(`SQL file "${fileName}" downloaded successfully!`, 'success');
}

