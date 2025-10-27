@echo off
echo Query Tracker Setup Script
echo =========================

echo.
echo 1. Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo Node.js is installed.
echo.

echo 2. Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo 3. Dependencies installed successfully!
echo.
echo 4. Starting the application...
echo The application will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

npm start
