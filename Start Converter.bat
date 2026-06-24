@echo off
title Framer to Next.js Converter
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  Node.js is required. Install it from https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo Installing dependencies... This only happens once.
    call npm.cmd install
    if errorlevel 1 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo.
echo  Framer to Next.js Converter is starting...
echo  Browser will open at http://localhost:3847
echo  Keep this window open while using the converter.
echo  Press Ctrl+C to stop.
echo.

start "" "http://localhost:3847"
call npm.cmd run desktop
pause
