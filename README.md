# Query Tracker

A web application to track database queries sent to the Infrastructure DB Team. This application stores query statements, user information, purpose, schema, environment, and maintains a complete version history of all changes.

## ✨ Features

- **Query Storage**: Store database queries with metadata
- **User Tracking**: Track who submitted each query
- **Purpose Documentation**: Document why each query was run
- **Schema & Environment**: Categorize queries by database schema and environment
- **Version Control**: **NEW!** Track all versions of queries with edit history
- **Search & Filter**: Search through queries by various criteria
- **Responsive Design**: Modern, mobile-friendly interface
- **Real-time Updates**: Instant feedback and notifications

## 🔧 Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3 (local file-based database)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Custom CSS with Font Awesome icons
- **Database Schema**: Automatic migration and version management

## 📋 Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run init-db
```

### 3. Start the Application
```bash
npm start
```

### 4. Access the Application
Open your browser and navigate to: `http://localhost:3000`

## 🗄️ Database Schema

The application automatically creates and manages the following table structure:

```sql
CREATE TABLE queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_text TEXT NOT NULL,
  user_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  schema_name TEXT NOT NULL,
  environment TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  parent_id INTEGER DEFAULT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### New Version Tracking Fields:
- **`version`**: Tracks the version number of each query
- **`parent_id`**: Links all versions of the same query together
- **Automatic Migration**: Existing databases are automatically updated

## 📱 Usage

### Adding a Query
1. Fill out the form with your query details
2. Include the database schema and environment
3. Click "Save Query" to store it

### Editing a Query
1. Click the "Edit" button on any query
2. **NEW!** This creates a new version instead of overwriting
3. All previous versions are preserved and accessible
4. Version numbers automatically increment

### Viewing Version History
1. Click the "History" button on any query
2. **NEW!** See all versions of the query in chronological order
3. Track changes over time
4. Compare different versions

### Searching Queries
- **General Search**: Search across query text, user names, and purposes
- **Filter by User**: Find queries from specific users
- **Filter by Purpose**: Find queries with specific purposes
- **Filter by Schema**: Find queries for specific database schemas
- **Filter by Environment**: Find queries for specific environments

### Deleting Queries
- Click the "Delete" button to remove a query
- **Note**: This only deletes the specific version, not the entire history

## 🔄 Version Control System

### How It Works
1. **First Submission**: Creates version 1 with `parent_id` set to its own ID
2. **Editing**: Creates a new record with incremented version number
3. **History Tracking**: All versions share the same `parent_id`
4. **Latest Version**: The main view shows only the latest version of each query

### Benefits
- **Audit Trail**: Complete history of all changes
- **No Data Loss**: Previous versions are never overwritten
- **Change Tracking**: See exactly what changed and when
- **Collaboration**: Multiple users can see the evolution of queries

## 🛠️ API Endpoints

### Core Endpoints
- `GET /api/queries` - Get all latest versions of queries
- `POST /api/queries` - Add a new query
- `GET /api/queries/:id` - Get a specific query by ID
- `DELETE /api/queries/:id` - Delete a specific query version

### New Version Control Endpoints
- `POST /api/queries/:id/edit` - Edit a query (creates new version)
- `GET /api/queries/:id/versions` - Get all versions of a query

### Utility Endpoints
- `GET /api/queries/search` - Search queries with filters
- `POST /api/fix-records` - Fix existing records (adds missing fields)
- `GET /api/db-info` - Get database structure information

## 🎨 User Interface

### Color Scheme
- **Primary**: Black gradient theme for professional appearance
- **Accents**: Blue, green, and warning colors for actions
- **Responsive**: Mobile-friendly design with proper spacing

### Interactive Elements
- **Modals**: Clean, focused editing and confirmation dialogs
- **Notifications**: Real-time feedback for all actions
- **Loading States**: Visual feedback during operations
- **Version Badges**: Clear indication of query versions

## 🔍 Troubleshooting

### Common Issues

#### "npm is not recognized"
- **Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)
- **Verify**: Run `node --version` and `npm --version`

#### Database Connection Issues
- **Check**: Ensure the application has write permissions in the directory
- **Reset**: Delete `queries.db` file and restart the application

#### Version Display Issues
- **Fix**: Use the `/api/fix-records` endpoint to update existing records
- **Verify**: Check `/api/db-info` for database structure

#### Edit Functionality Not Working
- **Check**: Ensure all required fields are filled in the edit form
- **Verify**: Check browser console for JavaScript errors

### Database Migration
The application automatically handles database schema updates:
- Adds missing columns with default values
- Updates existing records to include new fields
- Maintains backward compatibility

## 📁 Project Structure

```
query-tracker/
├── server.js              # Main server file with all endpoints
├── package.json           # Dependencies and scripts
├── public/
│   ├── index.html        # Main application interface
│   ├── styles.css        # Application styling
│   └── script.js         # Frontend functionality
├── queries.db            # SQLite database file (auto-created)
└── README.md             # This documentation
```

## 🚀 Development

### Running in Development Mode
```bash
npm run dev
```

### Database Initialization
```bash
npm run init-db
```

### Adding New Features
- Backend: Add new routes in `server.js`
- Frontend: Update HTML, CSS, and JavaScript files
- Database: Modify schema in the initialization code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or support, please check the troubleshooting section or create an issue in the project repository.

---

**Note**: This application now includes a complete version control system that tracks all changes to queries, providing a comprehensive audit trail for database operations.
