@echo off
echo Setting up Auth App Backend...
cd backend
echo Installing Python dependencies...
pip install -r requirements.txt
echo.
echo Backend setup complete!
echo.
echo Next steps:
echo 1. Copy env.example to .env
echo 2. Update .env with your MongoDB Atlas URI and other settings
echo 3. Run start-backend.bat to start the server
echo.
pause
