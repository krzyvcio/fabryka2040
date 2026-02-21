@echo off
REM start-system.bat - Uruchamia cały system

echo.
echo ========================================
echo   NEUROFORGE-7 SYSTEM STARTER
echo ========================================
echo.

echo [1/3] Sprawdzanie LM Studio...
curl -s http://localhost:1234/v1/models >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ LM Studio NIE jest uruchomiony!
    echo    Wymagane: LM Studio działa na http://localhost:1234
    echo.
    pause
    exit /b 1
)
echo    ✅ LM Studio działa

echo.
echo [2/3] Uruchamianie serwera...
start "NEUROFORGE-7 Server" cmd /k "npx tsx server.ts"
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Sprawdzanie serwera...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Serwer NIE wystartował!
    pause
    exit /b 1
)
echo    ✅ Serwer działa

echo.
echo ========================================
echo   ✅ SYSTEM GOTOWY
echo ========================================
echo.
echo   🌐 http://localhost:3000
echo   📡 LM Studio: http://localhost:1234
echo.
echo   Naciśnij dowolny klawisz aby otworzyć przeglądarkę...
pause >nul

start http://localhost:3000
