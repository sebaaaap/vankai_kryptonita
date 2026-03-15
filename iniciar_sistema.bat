@echo off
echo ==============================================================
echo        INICIANDO EL SISTEMA DE PUNTO DE VENTA
echo ==============================================================
echo.

:: 1. Intentamos actualizar el codigo desde GitHub sin preguntar
echo [1/3] Buscando actualizaciones en la nube (Git Pull)...
git pull origin main 
if %errorlevel% neq 0 (
    echo [Aviso] No se pudo actualizar el codigo (o no hay internet), iniciando con la version actual.
) else (
    echo [Aviso] Actualizaciones descargadas correctamente.
)
echo.

:: 2. Encendemos el sistema usando Docker, reconstruyendolo si hubieron cambios
echo [2/3] Levantando Base de Datos, Servidor y Sitio Web...
echo (Este paso puede tardar un poco si hay una gran actualizacion)
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [Error] Docker no se pudo iniciar. Asegurese de tener Docker Desktop abierto.
    pause
    exit /b 1
)
echo.

:: 3. Esperar a que el contenedor inicie y abrir Google Chrome
echo [3/3] Abriendo el navegador...
:: Le damos unos 5 segundos al servidor para estar 100% activo
timeout /t 5 /nobreak > NUL

:: Abre la url en el navegador
start http://localhost:3000

echo.
echo ==============================================================
echo   El sistema ya esta corriendo en http://localhost:3000
echo   Puede cerrar esta ventana negra.
echo ==============================================================
:: Espera un momento antes de cerrarse
timeout /t 5 /nobreak > NUL
exit
