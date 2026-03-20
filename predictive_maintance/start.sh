#!/bin/bash

echo "=========================================="
echo "  Predictive Maintenance System"
echo "=========================================="
echo ""

# Check if services are already running
check_port() {
    if command -v lsof &> /dev/null; then
        lsof -i :$1 &> /dev/null
    elif command -v netstat &> /dev/null; then
        netstat -an | grep $1 | grep LISTEN &> /dev/null
    else
        return 1
    fi
}

# Function to check if command exists
command_exists() {
    command -v $1 &> /dev/null
}

echo "Checking prerequisites..."

# Check Node.js
if command_exists node; then
    echo "✓ Node.js: $(node --version)"
else
    echo "✗ Node.js not found. Please install Node.js."
    exit 1
fi

# Check Python
if command_exists python; then
    echo "✓ Python: $(python --version)"
else
    echo "✗ Python not found. Please install Python."
    exit 1
fi

# Check MySQL
echo ""
echo "Checking MySQL..."
if check_port 3306; then
    echo "✓ MySQL is running on port 3306"
else
    echo "⚠ MySQL may not be running on port 3306"
fi

echo ""
echo "=========================================="
echo "  Starting Services..."
echo "=========================================="

# Start Backend
echo ""
echo "[1/3] Starting Backend (port 5000)..."
cd backend
if [ -d "node_modules" ]; then
    npm run dev &
    echo "Backend started"
else
    echo "Installing backend dependencies..."
    npm install
    npm run db:push
    npm run db:seed
    npm run dev &
    echo "Backend started"
fi
cd ..

# Start Frontend
echo ""
echo "[2/3] Starting Frontend (port 5173)..."
cd frontend
if [ -d "node_modules" ]; then
    npm run dev &
    echo "Frontend started"
else
    echo "Installing frontend dependencies..."
    npm install
    npm run dev &
    echo "Frontend started"
fi
cd ..

# Start ML Service
echo ""
echo "[3/3] Starting ML Service (port 8000)..."
cd ml-service
python main.py &
echo "ML Service started"
cd ..

echo ""
echo "=========================================="
echo "  All Services Started!"
echo "=========================================="
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
echo "  ML API:   http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background jobs
wait
