const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Error handling middleware for JSON parsing
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON parsing error:', error.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: error.message
    });
  }
  next();
});

// Database connection
const db = new sqlite3.Database('./queries.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Session storage
global.activeSessions = new Map();

// Create table if not exists and migrate existing data
db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    can_edit_others INTEGER DEFAULT 0,
    can_delete_others INTEGER DEFAULT 0,
    can_register_users INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    is_active INTEGER DEFAULT 1
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table created/verified');
      
      // Add new columns to existing users table if they don't exist
      db.run(`ALTER TABLE users ADD COLUMN can_edit_others INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding can_edit_others column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN can_delete_others INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding can_delete_others column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN can_register_users INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding can_register_users column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN can_view_dashboard INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding can_view_dashboard column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN can_delete_comments INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding can_delete_comments column:', err);
        }
      });
    }
  });

  // Create audit table for tracking all operations
  db.run(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    user_name TEXT,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating audit table:', err);
    } else {
      console.log('Audit table created/verified');
    }
  });

  // First, check if the old table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='queries'", (err, row) => {
    if (err) {
      console.error('Error checking table:', err);
      return;
    }
    
    if (row) {
      // Table exists, check if it has the new columns
      db.get("PRAGMA table_info(queries)", (err, columns) => {
        if (err) {
          console.error('Error checking table structure:', err);
          return;
        }
        
        // Check if schema_name and environment columns exist
        let hasSchema = false;
        let hasEnvironment = false;
        let hasVersion = false;
        let hasParentId = false;
        
        db.all("PRAGMA table_info(queries)", (err, allColumns) => {
          if (err) {
            console.error('Error getting table info:', err);
            return;
          }
          
          allColumns.forEach(col => {
            if (col.name === 'schema_name') hasSchema = true;
            if (col.name === 'environment') hasEnvironment = true;
            if (col.name === 'version') hasVersion = true;
            if (col.name === 'parent_id') hasParentId = true;
          });
          
          if (!hasSchema || !hasEnvironment || !hasVersion || !hasParentId) {
            console.log('Adding missing columns to existing table...');
            
            // Add missing columns
            if (!hasSchema) {
              db.run("ALTER TABLE queries ADD COLUMN schema_name TEXT DEFAULT 'Unknown'", (err) => {
                if (err) console.error('Error adding schema_name column:', err);
                else console.log('Added schema_name column');
              });
            }
            
            if (!hasEnvironment) {
              db.run("ALTER TABLE queries ADD COLUMN environment TEXT DEFAULT 'Unknown'", (err) => {
                if (err) console.error('Error adding environment column:', err);
                else console.log('Added environment column');
              });
            }
            
            if (!hasVersion) {
              db.run("ALTER TABLE queries ADD COLUMN version INTEGER DEFAULT 1", (err) => {
                if (err) console.error('Error adding version column:', err);
                else console.log('Added version column');
              });
            }
            
            if (!hasParentId) {
              db.run("ALTER TABLE queries ADD COLUMN parent_id INTEGER DEFAULT NULL", (err) => {
                if (err) console.error('Error adding parent_id column:', err);
                else console.log('Added parent_id column');
              });
            }
            
            // Update existing records with default values
            db.run("UPDATE queries SET schema_name = 'Unknown' WHERE schema_name IS NULL", (err) => {
              if (err) console.error('Error updating schema_name:', err);
              else console.log('Updated existing records with default schema_name');
            });
            
            db.run("UPDATE queries SET environment = 'Unknown' WHERE environment IS NULL", (err) => {
              if (err) console.error('Error updating environment:', err);
              else console.log('Updated existing records with default environment');
            });
            
            db.run("UPDATE queries SET version = 1 WHERE version IS NULL", (err) => {
              if (err) console.error('Error updating version:', err);
              else console.log('Updated existing records with default version');
            });
          }
          
          // Add new columns for status tracking, priority, and assignment
          db.run("ALTER TABLE queries ADD COLUMN status TEXT DEFAULT 'Pending'", (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Error adding status column:', err);
            }
          });
          
          db.run("ALTER TABLE queries ADD COLUMN priority TEXT DEFAULT 'Medium'", (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Error adding priority column:', err);
            }
          });
          
          db.run("ALTER TABLE queries ADD COLUMN assigned_to TEXT DEFAULT NULL", (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Error adding assigned_to column:', err);
            }
          });
          
          db.run("ALTER TABLE queries ADD COLUMN completed_at DATETIME DEFAULT NULL", (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Error adding completed_at column:', err);
            }
          });
        });
      });
    } else {
      // Table doesn't exist, create it with all columns
      console.log('Creating new table with all columns...');
      db.run(`CREATE TABLE queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_text TEXT NOT NULL,
        user_name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        schema_name TEXT NOT NULL,
        environment TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        parent_id INTEGER DEFAULT NULL,
        status TEXT DEFAULT 'Pending',
        priority TEXT DEFAULT 'Medium',
        assigned_to TEXT DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('Error creating table:', err);
        else console.log('Table created successfully');
      });
    }
  });
  
  // Create comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating comments table:', err);
    } else {
      console.log('Comments table created/verified');
    }
  });

  // Create projects table
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating projects table:', err);
    } else {
      console.log('Projects table created/verified');
    }
  });

  // Create schemas table
  db.run(`CREATE TABLE IF NOT EXISTS schemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating schemas table:', err);
    } else {
      console.log('Schemas table created/verified');
    }
  });

  // Add project column to queries table if it doesn't exist
  db.run(`ALTER TABLE queries ADD COLUMN project TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding project column:', err);
    }
  });
});

// Helper functions for password hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hashedPassword) {
  const hash = hashPassword(password);
  return hash === hashedPassword;
}

// Generate session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Function to log audit entries
function logAudit(operation, tableName, recordId, oldValues, newValues, userName, ipAddress) {
  const sql = `INSERT INTO audit_log (operation_type, table_name, record_id, old_values, new_values, user_name, ip_address) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [operation, tableName, recordId, oldValues, newValues, userName, ipAddress], (err) => {
    if (err) {
      console.error('Error logging audit:', err);
    } else {
      console.log(`Audit logged: ${operation} on ${tableName} by ${userName} from ${ipAddress}`);
    }
  });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin page route
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Test auth endpoint
app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth endpoint is working', timestamp: new Date().toISOString() });
});

// Old Windows authentication code removed - using new user database authentication

// Get current user info
app.get('/api/user-info', (req, res) => {
  console.log('User info endpoint called');
  try {
    const { execSync } = require('child_process');
    let username = 'Windows User';
    
    try {
      // Use PowerShell to get username - most reliable for Windows
      const result = execSync('powershell -Command "echo $env:USERNAME"', { encoding: 'utf8' }).trim();
      if (result && result.length > 0) {
        username = result;
        console.log('Got username from PowerShell:', username);
      }
    } catch (e) {
      console.log('PowerShell command failed:', e.message);
      
      // Fallback to environment variable
      try {
        username = process.env.USERNAME || 'Windows User';
        console.log('Using environment variable USERNAME:', username);
      } catch (envError) {
        console.log('Environment variable failed:', envError.message);
      }
    }
    
    console.log('Final username:', username);
    
    res.json({
      username: username,
      platform: os.platform(),
      hostname: os.hostname(),
      method: 'echo %username%'
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.json({
      username: 'Windows User',
      platform: os.platform(),
      hostname: os.hostname(),
      error: 'Failed to get username'
    });
  }
});

// Automatic Windows Authentication - No manual login required
app.get('/api/auth/auto-login', (req, res) => {
  console.log('Auto-login request received');
  try {
    // Get the current Windows user automatically
    let username = 'Windows User';
    
    // Method 1: Try PowerShell to get current user
    try {
      const result = execSync('powershell -Command "echo $env:USERNAME"', { encoding: 'utf8' }).trim();
      if (result && result !== '') {
        username = result;
        console.log('Got username from PowerShell:', username);
      }
    } catch (e) {
      console.log('PowerShell method failed:', e.message);
    }
    
    // Method 2: Try environment variables
    if (username === 'Windows User') {
      username = process.env.USERNAME || process.env.USER || 'Windows User';
      console.log('Got username from environment:', username);
    }
    
    // Method 3: Try whoami command
    if (username === 'Windows User') {
      try {
        const whoami = execSync('whoami', { encoding: 'utf8' }).trim();
        username = whoami.split('\\').pop(); // Remove domain if present
        console.log('Got username from whoami:', username);
      } catch (e) {
        console.log('whoami method failed:', e.message);
      }
    }
    
    // Create a session for the user
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const userInfo = {
      username: username,
      loginTime: Date.now(),
      autoLogin: true
    };
    
    // Store in memory (in production, use Redis or database)
    if (!global.authenticatedUsers) {
      global.authenticatedUsers = new Map();
    }
    global.authenticatedUsers.set(sessionId, userInfo);
    
    console.log('Auto-login successful for:', username);
    
    res.json({
      success: true,
      username: username,
      sessionId: sessionId,
      message: 'Auto-login successful',
      autoLogin: true
    });
    
  } catch (error) {
    console.error('Auto-login error:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-login failed',
      error: error.message
    });
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId || !global.activeSessions.has(sessionId)) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const session = global.activeSessions.get(sessionId);
  req.user = session.user;
  req.sessionId = sessionId;
  next();
}

// Helper function to get client IP
function getClientIP(req) {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Check for real IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  // Check for client IP header
  const clientIP = req.headers['x-client-ip'];
  if (clientIP) {
    return clientIP;
  }
  
  // Get connection IP
  const connectionIP = req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                      req.ip;
  
  // If it's localhost, try to get the actual network IP
  if (connectionIP === '127.0.0.1' || connectionIP === '::1' || connectionIP === '::ffff:127.0.0.1') {
    // Try to get the network IP from the request host header
    const host = req.headers.host;
    if (host && host.includes(':')) {
      const ip = host.split(':')[0];
      if (ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
    
    // Return a more descriptive identifier for localhost
    return 'localhost';
  }
  
  return connectionIP || 'unknown';
}

// Authentication endpoints

// Secret registration key - change this to your own secret
const REGISTRATION_SECRET = 'moc-db-team-2025';

// Register new user (protected with secret key OR user permission)
app.post('/api/auth/register', (req, res) => {
  const { username, password, full_name, email, created_by, registration_key, session_id } = req.body;
  const ipAddress = getClientIP(req);
  
  // Check if user is authenticated with registration permission
  let hasPermission = false;
  let registeredBy = 'system';
  
  if (session_id && global.activeSessions.has(session_id)) {
    const session = global.activeSessions.get(session_id);
    if (session.user.permissions.can_register_users || session.user.role === 'admin') {
      hasPermission = true;
      registeredBy = session.user.username;
    }
  }
  
  // Check registration key if no permission
  if (!hasPermission && registration_key !== REGISTRATION_SECRET) {
    console.log(`Registration attempt with invalid key from ${ipAddress}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid registration key or insufficient permissions'
    });
  }
  
  if (!username || !password || !full_name) {
    return res.status(400).json({
      success: false,
      message: 'Username, password, and full name are required'
    });
  }
  
  // Hash the password
  const hashedPassword = hashPassword(password);
  
  const sql = `INSERT INTO users (username, password, full_name, email, created_by) VALUES (?, ?, ?, ?, ?)`;
  
  db.run(sql, [username, hashedPassword, full_name, email, created_by || 'system'], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      console.error('Error creating user:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating user'
      });
    }
    
    console.log(`User created: ${username} from ${ipAddress}`);
    
    res.json({
      success: true,
      message: 'User created successfully',
      userId: this.lastID
    });
  });
});



// Manual Login (Fallback)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const ipAddress = getClientIP(req);
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }
  
  const sql = `SELECT * FROM users WHERE username = ? AND is_active = 1`;
  
  db.get(sql, [username], (err, user) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).json({
        success: false,
        message: 'Login error'
      });
    }
    
    if (!user) {
      console.log(`Login failed: User not found - ${username} from ${ipAddress}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Verify password
    if (!verifyPassword(password, user.password)) {
      console.log(`Login failed: Invalid password - ${username} from ${ipAddress}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Create session
    const sessionId = generateSessionId();
    global.activeSessions.set(sessionId, {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        permissions: {
          can_edit_others: user.can_edit_others === 1 || user.role === 'admin',
          can_delete_others: user.can_delete_others === 1 || user.role === 'admin',
          can_register_users: user.can_register_users === 1 || user.role === 'admin',
          can_view_dashboard: user.can_view_dashboard === 1 || user.role === 'admin',
          can_delete_comments: user.can_delete_comments === 1 || user.role === 'admin'
        }
      },
      loginTime: new Date().toISOString(),
      ipAddress: ipAddress
    });
    
    console.log(`Login successful: ${username} (${user.role}) from ${ipAddress}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      sessionId: sessionId,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        permissions: {
          can_edit_others: user.can_edit_others === 1 || user.role === 'admin',
          can_delete_others: user.can_delete_others === 1 || user.role === 'admin',
          can_register_users: user.can_register_users === 1 || user.role === 'admin',
          can_view_dashboard: user.can_view_dashboard === 1 || user.role === 'admin',
          can_delete_comments: user.can_delete_comments === 1 || user.role === 'admin'
        }
      }
    });
  });
});

// Logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const sessionId = req.sessionId;
  
  if (global.activeSessions.has(sessionId)) {
    const session = global.activeSessions.get(sessionId);
    // Handle both session structures (NTLM and manual login)
    const username = session.username || (session.user && session.user.username) || 'unknown';
    console.log(`Logout: ${username}`);
    global.activeSessions.delete(sessionId);
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user info
app.get('/api/auth/current-user', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Get all projects
app.get('/api/projects', requireAuth, (req, res) => {
  db.all('SELECT * FROM projects ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get schemas by project
app.get('/api/schemas/:projectName', requireAuth, (req, res) => {
  const { projectName } = req.params;
  
  const sql = `
    SELECT s.* FROM schemas s
    INNER JOIN projects p ON s.project_id = p.id
    WHERE p.name = ?
    ORDER BY s.name
  `;
  
  db.all(sql, [projectName], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get all queries (latest versions only)
app.get('/api/queries', requireAuth, (req, res) => {
  const sql = `
    SELECT q1.* FROM queries q1
    LEFT JOIN queries q2 ON q1.parent_id = q2.parent_id AND q1.version < q2.version
    WHERE q2.id IS NULL
    ORDER BY q1.timestamp DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Ensure all records have required values
    const processedRows = rows.map(row => ({
      ...row,
      schema_name: row.schema_name || 'Unknown',
      environment: row.environment || 'Unknown',
      version: row.version || 1
    }));
    
    res.json(processedRows);
  });
});

// Search queries (latest versions only)
app.get('/api/queries/search', requireAuth, (req, res) => {
  const { q, user, purpose, schema, environment, status, priority } = req.query;
  console.log('Search request:', { q, user, purpose, schema, environment, status, priority });
  let sql = `
    SELECT q1.* FROM queries q1
    LEFT JOIN queries q2 ON q1.parent_id = q2.parent_id AND q1.version < q2.version
    WHERE q2.id IS NULL
  `;
  const params = [];

  if (q) {
    sql += ` AND (q1.query_text LIKE ? OR q1.user_name LIKE ? OR q1.purpose LIKE ?)`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (user) {
    sql += ` AND q1.user_name LIKE ?`;
    params.push(`%${user}%`);
  }

  if (purpose) {
    sql += ` AND q1.purpose LIKE ?`;
    params.push(`%${purpose}%`);
  }

  if (schema) {
    sql += ` AND q1.schema_name LIKE ?`;
    params.push(`%${schema}%`);
  }

  if (environment) {
    sql += ` AND q1.environment LIKE ?`;
    params.push(`%${environment}%`);
  }

  if (status) {
    sql += ` AND q1.status = ?`;
    params.push(status);
  }

  if (priority) {
    sql += ` AND q1.priority = ?`;
    params.push(priority);
  }

  sql += ` ORDER BY q1.timestamp DESC`;

  console.log('Final SQL:', sql);
  console.log('Params:', params);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log('Query returned', rows.length, 'rows');
    
    // Ensure all records have required values
    const processedRows = rows.map(row => ({
      ...row,
      schema_name: row.schema_name || 'Unknown',
      environment: row.environment || 'Unknown',
      version: row.version || 1
    }));
    
    res.json(processedRows);
  });
});

// Get a single query by ID
app.get('/api/queries/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  const sql = `SELECT * FROM queries WHERE id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Query not found' });
      return;
    }
    
    // Ensure the record has required values
    const processedRow = {
      ...row,
      schema_name: row.schema_name || 'Unknown',
      environment: row.environment || 'Unknown',
      version: row.version || 1
    };
    
    res.json(processedRow);
  });
});

// Get all versions of a specific query
app.get('/api/queries/:id/versions', requireAuth, (req, res) => {
  const { id } = req.params;
  
  // First get the parent_id of the query
  db.get("SELECT parent_id FROM queries WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Query not found' });
      return;
    }
    
    const parentId = row.parent_id || id;
    
    // Get all versions of this query
    const sql = `
      SELECT * FROM queries 
      WHERE parent_id = ? OR id = ?
      ORDER BY version ASC
    `;
    
    db.all(sql, [parentId, parentId], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const processedRows = rows.map(row => ({
        ...row,
        schema_name: row.schema_name || 'Unknown',
        environment: row.environment || 'Unknown',
        version: row.version || 1
      }));
      
      res.json(processedRows);
    });
  });
});

// Add new query
app.post('/api/queries', requireAuth, (req, res) => {
  const { query_text, purpose, project, schema_name, environment, priority, status } = req.body;
  const ipAddress = getClientIP(req);
  const user_name = req.user.username; // Use authenticated user
  
  // Debug IP detection
  console.log('Request headers:', {
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-real-ip': req.headers['x-real-ip'],
    'x-client-ip': req.headers['x-client-ip'],
    'host': req.headers.host,
    'user-agent': req.headers['user-agent'],
    'connection-remoteAddress': req.connection.remoteAddress,
    'detected-ip': ipAddress
  });
  
  if (!query_text || !purpose || !project || !schema_name || !environment) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const sql = `INSERT INTO queries (query_text, user_name, purpose, project, schema_name, environment, priority, status, version, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`;
  db.run(sql, [query_text, user_name, purpose, project, schema_name, environment, priority || 'Medium', status || 'In Progress'], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const queryId = this.lastID;
    
    // Set the parent_id to the same as the id for the first version
    db.run("UPDATE queries SET parent_id = ? WHERE id = ?", [queryId, queryId], (err) => {
      if (err) {
        console.error('Error setting parent_id:', err);
      }
    });
    
    // Log audit entry for insert
    const newValues = JSON.stringify({
      query_text,
      user_name,
      purpose,
      project,
      schema_name,
      environment,
      version: 1
    });
    
    logAudit('INSERT', 'queries', queryId, null, newValues, user_name, ipAddress);
    
    res.json({
      id: queryId,
      message: 'Query added successfully'
    });
  });
});

// Edit query (creates new version)
app.post('/api/queries/:id/edit', requireAuth, (req, res) => {
  const { id } = req.params;
  const { query_text, purpose, schema_name, environment, priority, status } = req.body;
  const ipAddress = getClientIP(req);
  const user_name = req.user.username; // Use authenticated user
  
  if (!query_text || !purpose || !schema_name || !environment) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // First get the current query to determine version and parent_id
  db.get("SELECT * FROM queries WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Query not found' });
      return;
    }
    
    // Check permissions: user can only edit their own queries unless they have permission or are admin
    const isOwner = row.user_name === req.user.username;
    const canEditOthers = req.user.permissions.can_edit_others || req.user.role === 'admin';
    
    if (!isOwner && !canEditOthers) {
      console.log(`Permission denied: ${req.user.username} tried to edit query by ${row.user_name}`);
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'You can only edit your own queries'
      });
    }
    
    // Store old values for audit
    const oldValues = JSON.stringify({
      query_text: row.query_text,
      user_name: row.user_name,
      purpose: row.purpose,
      schema_name: row.schema_name,
      environment: row.environment,
      version: row.version
    });
    
    const currentVersion = row.version || 1;
    const parentId = row.parent_id || id;
    const newVersion = currentVersion + 1;
    
    // Insert new version
    const sql = `INSERT INTO queries (query_text, user_name, purpose, schema_name, environment, version, parent_id, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [query_text, user_name, purpose, schema_name, environment, newVersion, parentId, priority || 'Medium', status || 'Pending'], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const newQueryId = this.lastID;
      
      // Store new values for audit
      const newValues = JSON.stringify({
        query_text,
        user_name,
        purpose,
        schema_name,
        environment,
        version: newVersion
      });
      
      // Log audit entry for edit
      logAudit('UPDATE', 'queries', newQueryId, oldValues, newValues, user_name, ipAddress);
      
      res.json({
        id: newQueryId,
        version: newVersion,
        parent_id: parentId,
        message: 'Query updated successfully - new version created'
      });
    });
  });
});

// Delete query
app.delete('/api/queries/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const ipAddress = getClientIP(req);
  
  // First get the query details for audit logging
  db.get("SELECT * FROM queries WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Query not found' });
      return;
    }
    
    // Check permissions: user can only delete their own queries unless they have permission or are admin
    const isOwner = row.user_name === req.user.username;
    const canDeleteOthers = req.user.permissions.can_delete_others || req.user.role === 'admin';
    
    if (!isOwner && !canDeleteOthers) {
      console.log(`Permission denied: ${req.user.username} tried to delete query by ${row.user_name}`);
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'You can only delete your own queries'
      });
    }
    
    // Store old values for audit
    const oldValues = JSON.stringify({
      query_text: row.query_text,
      user_name: row.user_name,
      purpose: row.purpose,
      schema_name: row.schema_name,
      environment: row.environment,
      version: row.version
    });
    
    const sql = `DELETE FROM queries WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }
      
      // Log audit entry for delete
      logAudit('DELETE', 'queries', parseInt(id), oldValues, null, row.user_name, ipAddress);
      
      res.json({ message: 'Query deleted successfully' });
    });
  });
});

// Get audit log endpoint
app.get('/api/audit-log', (req, res) => {
  const sql = `SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching audit log:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching audit log'
      });
    }
    
    res.json({
      success: true,
      auditLog: rows
    });
  });
});

// Utility endpoint to fix existing records
app.post('/api/fix-records', (req, res) => {
  console.log('Fixing existing records...');
  
  // Update all records that have NULL or undefined values
  db.run("UPDATE queries SET schema_name = 'Unknown' WHERE schema_name IS NULL OR schema_name = ''", (err) => {
    if (err) {
      console.error('Error updating schema_name:', err);
      res.status(500).json({ error: 'Failed to update schema_name' });
      return;
    }
    
    db.run("UPDATE queries SET environment = 'Unknown' WHERE environment IS NULL OR environment = ''", (err) => {
      if (err) {
        console.error('Error updating environment:', err);
        res.status(500).json({ error: 'Failed to update environment' });
        return;
      }
      
      db.run("UPDATE queries SET version = 1 WHERE version IS NULL", (err) => {
        if (err) {
          console.error('Error updating version:', err);
          res.status(500).json({ error: 'Failed to update version' });
          return;
        }
        
        console.log('All records updated successfully');
        res.json({ message: 'All records updated successfully' });
      });
    });
  });
});

// Get database info
app.get('/api/db-info', (req, res) => {
  db.all("PRAGMA table_info(queries)", (err, columns) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.get("SELECT COUNT(*) as count FROM queries", (err, countRow) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        tableStructure: columns,
        recordCount: countRow.count,
        columns: columns.map(col => col.name)
      });
    });
  });
});

// Get all users (admin only)
app.get('/api/users', requireAuth, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'Only admins can view all users'
    });
  }

  const sql = `SELECT id, username, full_name, email, role, can_edit_others, can_delete_others, can_register_users, can_view_dashboard, can_delete_comments, is_active, created_at FROM users ORDER BY role DESC, username`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single user details (admin only)
app.get('/api/users/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'Only admins can view user details'
    });
  }

  const sql = `SELECT id, username, full_name, email, role, can_edit_others, can_delete_others, can_register_users, can_view_dashboard, can_delete_comments, is_active, created_at FROM users WHERE id = ?`;
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(row);
  });
});

 // Update user permissions (admin only)
 app.put('/api/users/:id/permissions', requireAuth, (req, res) => {
   const { id } = req.params;
   const { role, can_edit_others, can_delete_others, can_register_users, can_view_dashboard, can_delete_comments, is_active } = req.body;
   
   // Check if user is admin
   if (req.user.role !== 'admin') {
     return res.status(403).json({ 
       error: 'Permission denied',
       message: 'Only admins can update user permissions'
     });
   }

   // Validate role
   if (!['user', 'admin'].includes(role)) {
     return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
   }
   
   // Get the user being modified
   db.get('SELECT id, role FROM users WHERE id = ?', [id], (err, user) => {
     if (err) {
       console.error('Error fetching user:', err);
       return res.status(500).json({ error: err.message });
     }
     
     if (!user) {
       return res.status(404).json({ error: 'User not found' });
     }
     
     // If changing from admin to user, check if this is the last admin
     if (user.role === 'admin' && role === 'user') {
       db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, result) => {
         if (err) {
           console.error('Error counting admins:', err);
           return res.status(500).json({ error: err.message });
         }
         
         if (result.count <= 1) {
           return res.status(400).json({ 
             error: 'Cannot remove last admin',
             message: 'There must be at least one admin user in the system'
           });
         }
         
         // Continue with update
         updateUserPermissions();
       });
     } else {
       // Not changing from admin to user, proceed directly
       updateUserPermissions();
     }
     
     function updateUserPermissions() {
       const sql = `UPDATE users SET role = ?, can_edit_others = ?, can_delete_others = ?, can_register_users = ?, can_view_dashboard = ?, can_delete_comments = ?, is_active = ? WHERE id = ?`;
       
       db.run(sql, [role, can_edit_others ? 1 : 0, can_delete_others ? 1 : 0, can_register_users ? 1 : 0, can_view_dashboard ? 1 : 0, can_delete_comments ? 1 : 0, is_active ? 1 : 0, id], function(err) {
         if (err) {
           console.error('Error updating user permissions:', err);
           return res.status(500).json({ error: err.message });
         }
         
         if (this.changes === 0) {
           return res.status(404).json({ error: 'User not found' });
         }
         
         console.log(`Permissions updated for user ID ${id} by ${req.user.username}`);
         res.json({ 
           message: 'Permissions updated successfully',
           changes: this.changes
         });
       });
     }
   });
});

// ============= NEW FEATURES API ENDPOINTS =============

// Get comments for a query
app.get('/api/queries/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params;
  
  const sql = `SELECT * FROM comments WHERE query_id = ? ORDER BY timestamp ASC`;
  
  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error('Error fetching comments:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add comment to a query
app.post('/api/queries/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params;
  const { comment_text } = req.body;
  const clientIp = getClientIP(req);
  
  if (!comment_text || comment_text.trim() === '') {
    return res.status(400).json({ error: 'Comment text is required' });
  }
  
  const sql = `INSERT INTO comments (query_id, user_name, comment_text) VALUES (?, ?, ?)`;
  
  db.run(sql, [id, req.user.username, comment_text], function(err) {
    if (err) {
      console.error('Error adding comment:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Log audit
    logAudit('INSERT', 'comments', this.lastID, null, JSON.stringify({ query_id: id, comment_text }), req.user.username, clientIp);
    
    res.json({ 
      success: true,
      id: this.lastID,
      message: 'Comment added successfully'
    });
  });
});

// Delete comment
app.delete('/api/queries/:queryId/comments/:commentId', requireAuth, (req, res) => {
  const { queryId, commentId } = req.params;
  const clientIp = getClientIP(req);
  
  // First get the comment to check ownership and for audit logging
  db.get('SELECT * FROM comments WHERE id = ? AND query_id = ?', [commentId, queryId], (err, comment) => {
    if (err) {
      console.error('Error fetching comment:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check permissions: user can delete their own comments OR if they have permission
    const isOwner = comment.user_name === req.user.username;
    const canDeleteComments = req.user.permissions.can_delete_comments;
    
    if (!isOwner && !canDeleteComments) {
      console.log(`Permission denied: ${req.user.username} tried to delete comment by ${comment.user_name}`);
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'You can only delete your own comments'
      });
    }
    
    // Delete the comment
    db.run('DELETE FROM comments WHERE id = ?', [commentId], function(err) {
      if (err) {
        console.error('Error deleting comment:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Log audit
      logAudit('DELETE', 'comments', parseInt(commentId), JSON.stringify(comment), null, req.user.username, clientIp);
      
      res.json({ 
        success: true,
        message: 'Comment deleted successfully'
      });
    });
  });
});

// Update query status
app.put('/api/queries/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, assigned_to } = req.body;
  const clientIp = getClientIP(req);
  
  // Validate status
  const validStatuses = ['Pending', 'In Progress', 'Completed', 'Rejected', 'On Hold'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Check if query exists and get current values
  db.get('SELECT * FROM queries WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Query not found' });
    }
    
    // Prepare update
    let sql = 'UPDATE queries SET status = ?';
    let params = [status];
    
    // Add completed_at timestamp if status is Completed
    if (status === 'Completed') {
      sql += ', completed_at = CURRENT_TIMESTAMP';
    }
    
    // Add assigned_to if provided
    if (assigned_to !== undefined) {
      sql += ', assigned_to = ?';
      params.push(assigned_to);
    }
    
    sql += ' WHERE id = ?';
    params.push(id);
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error updating status:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Log audit
      logAudit('UPDATE', 'queries', id, JSON.stringify({ status: row.status }), JSON.stringify({ status, assigned_to }), req.user.username, clientIp);
      
      res.json({ 
        success: true,
        message: 'Status updated successfully',
        changes: this.changes
      });
    });
  });
});

// Get dashboard statistics (based on latest versions only)
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  // Check if user has permission to view dashboard
  if (req.user.role !== 'admin' && !req.user.permissions.can_view_dashboard) {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'You do not have permission to view the dashboard'
    });
  }
  
  const stats = {};
  
  // Total queries (latest versions only)
  const latestVersionsQuery = `
    SELECT q1.* FROM queries q1
    LEFT JOIN queries q2 ON q1.parent_id = q2.parent_id AND q1.version < q2.version
    WHERE q2.id IS NULL
  `;
  
  db.get(`SELECT COUNT(*) as total FROM (${latestVersionsQuery}) as latest`, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    stats.total = row.total;
    
    // Queries by status (latest versions only)
    db.all(`SELECT status, COUNT(*) as count FROM (${latestVersionsQuery}) as latest GROUP BY status`, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      stats.byStatus = rows;
      
      // Queries by priority (latest versions only)
      db.all(`SELECT priority, COUNT(*) as count FROM (${latestVersionsQuery}) as latest GROUP BY priority`, (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        stats.byPriority = rows;
        
        // Queries by user (latest versions only)
        db.all(`SELECT user_name, COUNT(*) as count FROM (${latestVersionsQuery}) as latest GROUP BY user_name ORDER BY count DESC LIMIT 10`, (err, rows) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          stats.byUser = rows;
          
          // Queries by environment (latest versions only)
          db.all(`SELECT environment, COUNT(*) as count FROM (${latestVersionsQuery}) as latest GROUP BY environment`, (err, rows) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            stats.byEnvironment = rows;
            
            // Recent activity (last 7 days, latest versions only)
            db.all(`SELECT DATE(timestamp) as date, COUNT(*) as count 
                    FROM (${latestVersionsQuery}) as latest
                    WHERE timestamp >= DATE('now', '-7 days') 
                    GROUP BY DATE(timestamp) 
                    ORDER BY date DESC`, (err, rows) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              stats.recentActivity = rows;
              
              // Average completion time (for completed queries, latest versions only)
              db.get(`SELECT AVG(JULIANDAY(completed_at) - JULIANDAY(timestamp)) * 24 as avg_hours 
                      FROM (${latestVersionsQuery}) as latest
                      WHERE status = 'Completed' AND completed_at IS NOT NULL`, (err, row) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                stats.avgCompletionTime = row.avg_hours ? row.avg_hours.toFixed(2) : null;
                
                res.json(stats);
              });
            });
          });
        });
      });
    });
  });
});

// ============= ADMIN API ENDPOINTS =============

// Get all tables in database
app.get('/api/admin/tables', requireAuth, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'Only admins can access this endpoint'
    });
  }
  
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get table structure and data
app.get('/api/admin/tables/:tableName', requireAuth, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'Only admins can access this endpoint'
    });
  }
  
  const { tableName } = req.params;
  
  // Get table structure
  db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get table data
    db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        columns: columns,
        data: rows
      });
    });
  });
});

// Insert record into table
app.post('/api/admin/tables/:tableName', requireAuth, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'Only admins can access this endpoint'
    });
  }
  
  const { tableName } = req.params;
  const data = req.body;
  
  // Build INSERT query
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  
  const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
  
  db.run(sql, values, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Log audit
    logAudit('INSERT', tableName, this.lastID, null, JSON.stringify(data), req.user.username, getClientIP(req));
    
    res.json({ 
      success: true,
      message: 'Record inserted successfully',
      id: this.lastID
    });
  });
});

// Update record in table
app.put('/api/admin/tables/:tableName/:id', requireAuth, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'Only admins can access this endpoint'
    });
  }
  
  const { tableName, id } = req.params;
  const data = req.body;
  
  // Get table structure first to check column types
  db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get old values for audit
    db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [id], (err, oldRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!oldRow) {
        return res.status(404).json({ error: 'Record not found' });
      }
      
      // Build UPDATE query - filter out read-only columns and handle data types
      const updateData = {};
      columns.forEach(col => {
        // Skip if column not in request data
        if (!(col.name in data)) return;
        
        // Skip auto-generated or read-only columns
        if (col.pk || col.dflt_value || col.name === 'created_at' || col.name === 'id') {
          return;
        }
        
        // Get column info to handle data types
        let value = data[col.name];
        
        // Handle NULL values
        if (value === null || value === '') {
          updateData[col.name] = null;
        } else {
          updateData[col.name] = value;
        }
      });
      
      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Build UPDATE query
      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      values.push(id);
      
      const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
      
      console.log('Update SQL:', sql);
      console.log('Update values:', values);
      
      db.run(sql, values, function(err) {
        if (err) {
          console.error('Update error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        // Log audit
        logAudit('UPDATE', tableName, id, JSON.stringify(oldRow), JSON.stringify(data), req.user.username, getClientIP(req));
        
        res.json({ 
          success: true,
          message: 'Record updated successfully',
          changes: this.changes
        });
      });
    });
  });
});

// Delete record from table
app.delete('/api/admin/tables/:tableName/:id', requireAuth, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'Only admins can access this endpoint'
    });
  }
  
  const { tableName, id } = req.params;
  
  // Get old values for audit
  db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [id], (err, oldRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!oldRow) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Delete record
    db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Log audit
      logAudit('DELETE', tableName, id, JSON.stringify(oldRow), null, req.user.username, getClientIP(req));
      
      res.json({ 
        success: true,
        message: 'Record deleted successfully'
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Network access: http://10.10.44.224:${PORT}`);
  console.log(`Database info available at: http://localhost:${PORT}/api/db-info`);
  console.log(`Fix records endpoint: http://localhost:${PORT}/api/fix-records (POST)`);
});
