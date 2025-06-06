#!/usr/bin/env pwsh

# SE-GRID-BUILDER Backend Startup Script
# This script starts the FastAPI backend server from the correct directory

Write-Host "Starting SE-GRID-BUILDER Backend Server..." -ForegroundColor Green

# Check if we're in the correct directory
if (-not (Test-Path "server/app/main.py")) {
    Write-Host "Error: Please run this script from the SE-GRID-BUILDER project root directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "Error: Virtual environment not found. Please create it first with: python -m venv .venv" -ForegroundColor Red
    exit 1
}

# Activate virtual environment and start server
try {
    Write-Host "Changing to server directory..." -ForegroundColor Yellow
    Set-Location "server"
    
    Write-Host "Starting FastAPI server on http://127.0.0.1:8001..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
    Write-Host ""
    
    & python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
}
catch {
    Write-Host "Error starting server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # Return to original directory
    Set-Location ".."
} 