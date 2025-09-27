@echo off
echo Starting Auth App Backend in production mode with multiple workers...
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
pause
