@echo off
echo Setting up Auth App Frontend...
cd frontend
echo Installing Node.js dependencies...
npm install
echo.
echo Frontend setup complete!
echo.
echo Next steps:
echo 1. Copy env.example to .env
echo 2. Update .env with your backend URL (default: http://localhost:8000)
echo 3. Run start-frontend.bat to start the development server
echo.
pause
