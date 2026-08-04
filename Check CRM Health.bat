@echo off
setlocal EnableExtensions
title Free Energy Help AI OS - CRM Quality Check

cd /d "%~dp0frontend"
if errorlevel 1 (
  echo.
  echo Could not open the frontend folder: %~dp0frontend
  echo.
  echo ========================================
  echo   QUALITY CHECK FAILED
  echo ========================================
  echo.
  pause
  exit /b 1
)

echo.
echo Free Energy Help AI OS - CRM Health Check
echo Working directory: %CD%
echo.
echo Running: npm run check
echo   1. TypeScript typecheck
echo   2. ESLint
echo   3. Next.js production build
echo.

call npm run check
set "CHECK_EXIT=%ERRORLEVEL%"

echo.
if "%CHECK_EXIT%"=="0" (
  echo ========================================
  echo   ALL CHECKS PASSED
  echo ========================================
) else (
  echo ========================================
  echo   QUALITY CHECK FAILED
  echo ========================================
  echo Exit code: %CHECK_EXIT%
)
echo.
pause
exit /b %CHECK_EXIT%
