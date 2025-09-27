@echo off
echo Starting Auth App Backend in development mode...
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
