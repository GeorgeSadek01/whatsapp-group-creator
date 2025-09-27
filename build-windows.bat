@echo off
echo Stopping any running Electron processes...
taskkill /F /IM "electron.exe" >nul 2>&1
taskkill /F /IM "WhatsApp Group Creator.exe" >nul 2>&1

echo Waiting for processes to close...
timeout /t 3 /nobreak >nul

echo Removing dist folder...
if exist dist\ rmdir /s /q dist\

echo Building Windows app...
npm run build:win

echo Build completed!
pause