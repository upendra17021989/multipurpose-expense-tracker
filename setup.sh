#!/bin/bash
# Setup script for Multi-Purpose Expense Tracker

echo "============================================"
echo "Multi-Purpose Expense Tracker Setup"
echo "============================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 17 or higher."
    exit 1
fi

if ! command -v mvn &> /dev/null; then
    echo "❌ Maven is not installed. Please install Maven 3.8 or higher."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client is not installed. Please install PostgreSQL 12 or higher."
    exit 1
fi

echo "✅ All prerequisites are installed"
echo ""

# Create database
echo "Creating PostgreSQL database..."
psql -U postgres -c "CREATE DATABASE expense_tracker;" 2>/dev/null || true
echo "✅ Database created/verified"
echo ""

# Build backend
echo "Building backend..."
cd backend
mvn clean install -q
if [ $? -eq 0 ]; then
    echo "✅ Backend built successfully"
else
    echo "❌ Backend build failed"
    exit 1
fi
cd ..
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install -q
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies installation failed"
    exit 1
fi
cd ..
echo ""

echo "============================================"
echo "Setup completed successfully!"
echo ""
echo "To start the application:"
echo ""
echo "1. Start Backend (from backend directory):"
echo "   mvn spring-boot:run"
echo ""
echo "2. Start Frontend (from frontend directory in another terminal):"
echo "   npm run dev"
echo ""
echo "Frontend will be available at: http://localhost:5173"
echo "Backend API will be available at: http://localhost:8080"
echo "============================================"
