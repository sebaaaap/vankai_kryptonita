@echo off
setlocal enabledelayedexpansion

echo ==============================================================
echo        INICIANDO EL SISTEMA DE PUNTO DE VENTA
echo ==============================================================
echo.

:: --- IMPORTANTE: Aseguramos que el script corra en su propia carpeta ---
cd /d "%~dp0"

:: 1. Intentamos actualizar el codigo desde GitHub sin preguntar
echo [1/3] Buscando actualizaciones en la nube (Git Pull)...
git pull origin main 
if %errorlevel% neq 0 (
    echo [Aviso] No se pudo conectar con el servidor de actualizaciones.
    echo         Iniciando con la version guardada localmente...
) else (
    echo [OK] Actualizaciones descargadas con exito.
)
echo.

:: 2. Encendemos el sistema usando Docker
echo [2/3] Levantando Base de Datos, Servidor y Sitio Web...
echo      (La primera vez esto tardara varios minutos, sea paciente)
echo.

docker-compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo ##############################################################
    echo [ERROR] Docker no pudo iniciar correctamente.
    echo.
    echo POSIBLES SOLUCIONES:
    echo 1. Asegurese de que "Docker Desktop" este ABIERTO (icono de la ballena).
    echo 2. Verifique que no haya otro programa usando los puertos 3000 o 8000.
    echo 3. Reinicie Docker Desktop e intente de nuevo.
    echo ##############################################################
    echo.
    pause
    exit /b 1
)

:: 3. Esperar a que el contenedor inicie y abrir Google Chrome
echo.
echo [3/3] Abriendo el sistema en su navegador...
:: Damos margen para que los servicios esten listos
timeout /t 5 /nobreak > NUL

:: Abre la url en el navegador predeterminado
start http://localhost:3000

echo.
echo ==============================================================
echo   SISTEMA ACTIVO EN: http://localhost:3000
echo.
echo   MANTENGA ESTA VENTANA ABIERTA MIENTRAS USE EL PROGRAMA.
echo   (Se cerrara sola en unos segundos)
echo ==============================================================
timeout /t 10 /nobreak > NUL
exit
