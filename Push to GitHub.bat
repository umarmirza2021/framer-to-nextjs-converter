@echo off
title Push to GitHub
cd /d "%~dp0"

echo.
echo  ============================================
echo   Framer to Next.js Converter - Push to GitHub
echo  ============================================
echo.

gh auth status >nul 2>&1
if not errorlevel 1 goto PUSH

echo  STEP 1: GitHub Login
echo  --------------------
echo  A new window will open for login.
echo  Your browser will also open automatically.
echo.
echo  1. Copy the code shown in the login window
echo  2. Paste it at https://github.com/login/device
echo  3. Click Authorize
echo  4. Come back here and press any key
echo.
pause
start "" "https://github.com/login/device"
start "GitHub Login - enter code here" cmd /k "gh auth login --hostname github.com --git-protocol https --web"
echo.
echo  After you finished login in the other window, press any key...
pause >nul

:PUSH
echo.
echo  STEP 2: Creating repo and pushing...
echo  Repo: https://github.com/umarmirza2021/framer-to-nextjs-converter
echo.

git remote remove origin 2>nul
gh repo create framer-to-nextjs-converter --public --description "Convert Framer websites to deployable Next.js projects" --source=. --remote=origin --push 2>nul
if errorlevel 1 (
    git remote add origin https://github.com/umarmirza2021/framer-to-nextjs-converter.git 2>nul
    git push -u origin main
)

if errorlevel 1 (
    echo.
    echo  Push failed. Try creating the repo manually:
    echo  1. Go to https://github.com/new
    echo  2. Name: framer-to-nextjs-converter
    echo  3. Click Create repository
    echo  4. Run this bat file again
    echo.
) else (
    echo.
    echo  SUCCESS! Repo is live at:
    echo  https://github.com/umarmirza2021/framer-to-nextjs-converter
    echo.
)

pause