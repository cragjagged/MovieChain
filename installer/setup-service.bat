@echo off
setlocal enabledelayedexpansion

:: Derive app directory from script location
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

:: Arguments passed by Inno Setup
set "PORT=%~1"
if "%PORT%"=="" set "PORT=7879"

set "DATA_DIR=%~2"
if "%DATA_DIR%"=="" set "DATA_DIR=C:\ProgramData\MovieChain"

set "NSSM=%APP_DIR%\nssm.exe"
set "NODE=%APP_DIR%\node\node.exe"
set "SCRIPT=%APP_DIR%\server\index.js"
set "SERVICE=MovieChain"

:: Create data and log directories
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%DATA_DIR%\logs" mkdir "%DATA_DIR%\logs"

:: Write port to server-config.json (merge if file already exists)
powershell -Command "$f='%DATA_DIR%\server-config.json'; $cfg=if(Test-Path $f){Get-Content $f -Raw|ConvertFrom-Json}else{[PSCustomObject]@{}}; $cfg|Add-Member -Force -NotePropertyName port -NotePropertyValue %PORT%; $cfg|ConvertTo-Json|Set-Content $f -Encoding UTF8"

:: Remove existing service if present
"%NSSM%" status %SERVICE% >nul 2>&1
if %errorlevel% == 0 (
    "%NSSM%" stop %SERVICE% >nul 2>&1
    "%NSSM%" remove %SERVICE% confirm >nul 2>&1
)

:: Install the service
"%NSSM%" install %SERVICE% "%NODE%"
"%NSSM%" set %SERVICE% AppParameters "\"%SCRIPT%\""
"%NSSM%" set %SERVICE% AppDirectory "%APP_DIR%"
"%NSSM%" set %SERVICE% AppEnvironmentExtra "MC_DATA_DIR=%DATA_DIR%" "MC_INSTALL_TYPE=installer"
"%NSSM%" set %SERVICE% Start SERVICE_AUTO_START
"%NSSM%" set %SERVICE% DisplayName "Movie Chain"
"%NSSM%" set %SERVICE% Description "Movie Chain film-watching game server"
"%NSSM%" set %SERVICE% AppStdout "%DATA_DIR%\logs\service.log"
"%NSSM%" set %SERVICE% AppStderr "%DATA_DIR%\logs\service-error.log"
"%NSSM%" set %SERVICE% AppRotateFiles 1
"%NSSM%" set %SERVICE% AppRotateBytes 1048576

:: Start the service
net start %SERVICE%

endlocal
exit /b 0
