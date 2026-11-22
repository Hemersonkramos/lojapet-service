@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\teste-entrega4.ps1
echo.
echo Fim. Resultado em artifacts\teste-entrega4\resultado.txt
pause
