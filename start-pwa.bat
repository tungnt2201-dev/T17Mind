@echo off
chcp 65001 >nul
echo ===============================================
echo   T17Mind - Khoi chay ban PWA (cai dat duoc)
echo ===============================================
echo.

if not exist "dist-pwa\index.html" (
  echo [Lan dau chay] Chua co ban build PWA, dang build...
  call npm run build:pwa
  if errorlevel 1 (
    echo.
    echo LOI: Build that bai. Kiem tra da chay "npm install" chua.
    pause
    exit /b 1
  )
)

echo Dang khoi dong server cuc bo tai http://localhost:5175 ...
start "T17Mind PWA Server" /min node serve-pwa.js
timeout /t 2 /nobreak >nul
start "" http://localhost:5175

echo.
echo Server dang chay o cua so rieng (thu nho). DUNG DONG cua so do
echo trong luc dang dung T17Mind - dong lai la mat ket noi.
echo Muon tat han: dong cua so "T17Mind PWA Server".
echo.
pause
