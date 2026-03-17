@echo off
setlocal enabledelayedexpansion

:: --- Correr en su propia carpeta ---
cd /d "%~dp0"

:: 1. Actualizar desde GitHub (silencioso, sin preguntar)
git pull origin main >nul 2>&1

:: 2. Levantar Docker en segundo plano
docker-compose up -d --build >nul 2>&1

if %errorlevel% neq 0 (
    msg * "Error al iniciar el sistema. Asegurese de que Docker Desktop este abierto (icono de la ballena en la barra de tareas) y luego intente de nuevo."
    exit /b 1
)

:: 3. Esperar a que los servicios esten listos
timeout /t 8 /nobreak >nul

:: 4. Abrir Chrome en pantalla completa en la pagina de login
::    Probamos rutas comunes de Chrome en Windows
set URL=http://localhost:3000/login

set CHROME1="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set CHROME2="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set CHROME3="%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist %CHROME1% (
    start "" %CHROME1% --start-fullscreen "%URL%"
    goto :fin
)
if exist %CHROME2% (
    start "" %CHROME2% --start-fullscreen "%URL%"
    goto :fin
)
if exist %CHROME3% (
    start "" %CHROME3% --start-fullscreen "%URL%"
    goto :fin
)

:: Si no tiene Chrome, abrir con navegador predeterminado (sin fullscreen)
start %URL%

:fin
exit
