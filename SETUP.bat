@echo off
echo ============================================
echo  Intelligent Sales Copilot -- Setup ^& Launch
echo ============================================
echo.

REM Add common Node.js install paths to PATH
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs"

REM Try to find node
where node >nul 2>&1
if %errorlevel% neq 0 (
    REM Try user-level nvm path
    set "PATH=%PATH%;%APPDATA%\nvm\current"
    where node >nul 2>&1
)

REM Run npm install directly -- let it fail naturally if node isn't found
echo Installing dependencies...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed.
    echo Make sure Node.js is installed: https://nodejs.org/en/download
    echo Or open a fresh CMD window and run:
    echo   cd "%~dp0"
    echo   npm install
    echo   npm run dev
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies installed successfully.
echo.
echo ==============================================
echo  Starting dev server...
echo  Open: http://localhost:5173
echo ==============================================
echo.
call npm run dev
