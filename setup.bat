@echo off
REM Setup script for Multi-Purpose Expense Tracker (Windows)

echo ============================================
echo Multi-Purpose Expense Tracker Setup
echo ============================================
echo.

REM Check prerequisites
echo Checking prerequisites...

where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Java is not installed. Please install Java 17 or higher.
    exit /b 1
)

where mvn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Maven is not installed. Please install Maven 3.8 or higher.
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    exit /b 1
)

echo ✅ All prerequisites are installed
echo.

REM Build backend
echo Building backend...
cd backend
call mvn clean install -q
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend build failed
    exit /b 1
)
echo ✅ Backend built successfully
cd ..
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install -q
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend dependencies installation failed
    exit /b 1
)
echo ✅ Frontend dependencies installed
cd ..
echo.

echo ============================================
echo Setup completed successfully!
echo.
echo To start the application:
echo.
echo 1. Start Backend (from backend directory):
echo    mvn spring-boot:run
echo.
echo 2. Start Frontend (from frontend directory in another terminal):
echo    npm run dev
echo.
echo Frontend will be available at: http://localhost:5173
echo Backend API will be available at: http://localhost:8080
echo ============================================
