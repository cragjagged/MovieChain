@echo off
setlocal

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

set "NSSM=%APP_DIR%\nssm.exe"
set "SERVICE=MovieChain"

:: Stop and remove the service
"%NSSM%" stop %SERVICE% >nul 2>&1
"%NSSM%" remove %SERVICE% confirm

endlocal
exit /b 0
