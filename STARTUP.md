# SE-GRID-BUILDER Quick Startup Guide

This document provides quick commands to start the application.

## Prerequisites

- Node.js and npm installed
- Python 3.8+ with virtual environment setup
- Dependencies installed

## Starting the Application

### Method 1: Using the startup script (Windows)
```powershell
# Start backend (from project root)
.\start-backend.ps1

# Start frontend (in new terminal, from project root)
npm run dev
```

### Method 2: Manual commands

#### Backend Server
```powershell
# From project root, navigate to server directory and start
cd server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

#### Frontend Server
```powershell
# From project root
npm run dev
```

## Access Points

- **Frontend**: http://localhost:3001 (or 3000/3002 if port 3001 is taken)
- **Backend API**: http://127.0.0.1:8001
- **Backend Docs**: http://127.0.0.1:8001/docs

## Available Pages

- `/` - Home page
- `/dashboard` - Operator dashboard with real-time data
- `/topology` - Interactive power system topology viewer
- `/contingency` - Real-Time Contingency Analysis (RTCA)
- `/what-if` - Scenario builder and power flow analysis
- `/state-estimator` - State estimation with residual analysis
- `/calibration` - Sensor calibration and bad data detection

## Troubleshooting

### Backend won't start
- Make sure you're running from the `server/` directory
- Check if port 8001 is already in use: `netstat -an | findstr :8001`
- Verify virtual environment is activated

### Frontend API errors
- Ensure backend is running on port 8001
- Check browser console for specific error messages
- Verify Next.js proxy configuration in `next.config.js`

### "Module not found" errors
- Run backend from `server/` directory, not project root
- Check Python virtual environment is properly set up
- Install dependencies: `pip install -r requirements.txt` 