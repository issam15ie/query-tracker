/**
 * Dynamic Menu Generator
 * Generates sidebar menu based on user permissions
 */

// Global variables (shared with page scripts)
let currentUser = null;
let sessionId = null;

// Initialize menu system
async function initializeMenu() {
    console.log('🍽️ Initializing dynamic menu system...');
    
    sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        console.warn('⚠️ No session ID found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        // Get user menu from server
        const response = await fetch('/api/user/menu', {
            headers: {
                'x-session-id': sessionId
            }
        });
        
        if (!response.ok) {
            console.warn('⚠️ Failed to get menu, redirecting to login');
            window.location.href = '/login.html';
            return;
        }
        
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            generateMenu(data.menuItems);
            updateSidebarUser(data.user.username);
            console.log('✅ Dynamic menu initialized successfully');
        } else {
            console.error('❌ Failed to initialize menu:', data.error);
        }
    } catch (error) {
        console.error('❌ Error initializing menu:', error);
        window.location.href = '/login.html';
    }
}

// Generate sidebar menu HTML
function generateMenu(menuItems) {
    console.log('🔨 Generating menu with', menuItems.length, 'items');
    
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) {
        console.error('❌ Sidebar navigation not found');
        return;
    }
    
    // Clear existing menu items (except logout)
    const existingItems = sidebarNav.querySelectorAll('.sidebar-link:not(.logout-link)');
    existingItems.forEach(item => item.remove());
    
    // Generate menu items
    let menuHTML = '';
    menuItems.forEach(item => {
        const isActive = isCurrentPage(item.href);
        const activeClass = isActive ? ' active' : '';
        
        menuHTML += `
            <a href="${item.href}" class="sidebar-link${activeClass}" id="${item.id}Link">
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            </a>
        `;
    });
    
    // Insert menu items before logout
    const logoutLink = sidebarNav.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.insertAdjacentHTML('beforebegin', menuHTML);
    } else {
        sidebarNav.innerHTML = menuHTML;
    }
    
    console.log('✅ Menu generated successfully');
    
    // Re-attach navigation event listeners after menu is generated
    // This is important because menu items are dynamically replaced
    attachNavigationListeners();
}

// Flag to prevent multiple event listener attachments
let navigationListenersAttached = false;

// Attach navigation event listeners for New Query and All Queries links
// Use event delegation on sidebar-nav so it works even when menu items are replaced
function attachNavigationListeners() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;
    
    // Only attach once per page
    if (navigationListenersAttached) {
        console.log('⚠️ Navigation listeners already attached, skipping...');
        return;
    }
    
    // Only attach if we're on the index.html page
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        // Use event delegation - listen on the sidebar-nav container
        sidebarNav.addEventListener('click', function(e) {
            const target = e.target.closest('#newQueryLink, #allQueriesLink');
            if (!target) return;
            
            e.preventDefault();
            
            if (target.id === 'newQueryLink') {
                // New Query link clicked
                window.location.hash = ''; // Clear hash
                const newQuerySection = document.getElementById('newQuerySection');
                const allQueriesSection = document.getElementById('allQueriesSection');
                const queriesListSection = document.getElementById('queriesListSection');
                
                if (newQuerySection) newQuerySection.style.display = 'block';
                if (allQueriesSection) allQueriesSection.style.display = 'none';
                if (queriesListSection) queriesListSection.style.display = 'none';
                
                // Update active states
                const allLink = document.getElementById('allQueriesLink');
                const newLink = document.getElementById('newQueryLink');
                if (newLink) newLink.classList.add('active');
                if (allLink) allLink.classList.remove('active');
            } else if (target.id === 'allQueriesLink') {
                // All Queries link clicked
                window.location.hash = '#all'; // Set hash
                const newQuerySection = document.getElementById('newQuerySection');
                const allQueriesSection = document.getElementById('allQueriesSection');
                const queriesListSection = document.getElementById('queriesListSection');
                
                if (newQuerySection) newQuerySection.style.display = 'none';
                if (allQueriesSection) allQueriesSection.style.display = 'block';
                if (queriesListSection) queriesListSection.style.display = 'block';
                
                // Update active states
                const newLink = document.getElementById('newQueryLink');
                const allLink = document.getElementById('allQueriesLink');
                if (allLink) allLink.classList.add('active');
                if (newLink) newLink.classList.remove('active');
                
                // Load queries if loadQueries function exists
                if (typeof loadQueries === 'function') {
                    loadQueries();
                }
            }
        });
        
        navigationListenersAttached = true;
        console.log('✅ Navigation listeners attached using event delegation');
    }
}

// Check if current page matches menu item
function isCurrentPage(href) {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    // Handle special cases
    if (href === 'index.html' && currentPath.endsWith('index.html') && !currentHash) {
        return true; // New Query page
    }
    if (href === 'index.html#all' && currentPath.endsWith('index.html') && currentHash === '#all') {
        return true; // All Queries page
    }
    
    // Regular page matching
    return currentPath.endsWith(href);
}

// Update sidebar user name
function updateSidebarUser(username) {
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) {
        sidebarUserName.textContent = username;
    }
}

// Setup sidebar toggle
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            // Update main container
            const container = document.querySelector('.container, .dashboard-container, .schema-container, .admin-container, .approval-container');
            if (container) {
                container.classList.toggle('sidebar-collapsed');
            }
        });
    }
}

// Setup logout functionality
function setupLogout() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'x-session-id': sessionId
                    }
                });
                
                if (response.ok) {
                    localStorage.removeItem('sessionId');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                }
            } catch (error) {
                console.error('Logout error:', error);
                // Force logout even if API fails
                localStorage.removeItem('sessionId');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            }
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, initializing menu system...');
    await initializeMenu();
    setupSidebarToggle();
    setupLogout();
});
