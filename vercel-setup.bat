@echo off
cls
color 0A

echo.
echo ════════════════════════════════════════════════════════════════
echo           SETUP RAPIDO PARA VERCEL
echo    Gestión de Cobranzas - Deployment Automático
echo ════════════════════════════════════════════════════════════════
echo.

echo PASO 1: Inicializando Git...
if exist ".git" (
    echo   ✓ Git ya inicializado
) else (
    git init
    echo   ✓ Git inicializado
)

echo.
echo PASO 2: Preparando commit...
git add .
git commit -m "Initial commit - Gestion de Cobranzas Web" 2>nul
echo   ✓ Código listo para push

echo.
echo ════════════════════════════════════════════════════════════════
echo           PASOS SIGUIENTES (EN TERMINAL)
echo ════════════════════════════════════════════════════════════════
echo.

echo 1. CREAR REPOSITORIO EN GITHUB
echo    • Ve a github.com
echo    • Click + (esquina superior derecha)
echo    • New repository
echo    • Nombre: gestion-cobranzas
echo    • Privado o Público (tu elección)
echo    • Create repository
echo    • Copia la URL HTTPS
echo.

echo 2. AGREGAR REMOTE Y PUSH
echo    git remote add origin URL-DEL-REPO
echo    git push -u origin main
echo.

echo 3. CONECTAR A VERCEL (OPCIÓN A - Recomendado)
echo    • Ve a vercel.com
echo    • Click "New Project"
echo    • Click "Import Git Repository"
echo    • Selecciona gestion-cobranzas
echo    • Vercel autodetecta todo
echo    • Click "Deploy"
echo.

echo    (OPCIÓN B - CLI)
echo    npm i -g vercel
echo    vercel
echo.

echo 4. CONFIGURAR VARIABLES DE ENTORNO
echo    En Vercel Dashboard:
echo    • Settings → Environment Variables
echo    • Add variable: VITE_SUPABASE_URL
echo    • Value: https://tu-proyecto.supabase.co
echo    • Add variable: VITE_SUPABASE_ANON_KEY
echo    • Value: eyJhbGc... (tu clave)
echo    • Save
echo    • Redeploy
echo.

echo 5. VERIFICA
echo    Tu app estará en:
echo    https://gestion-cobranzas.vercel.app
echo.

echo ════════════════════════════════════════════════════════════════
echo  ✨ DEPLOYMENT AUTOMÁTICO HABILITADO
echo  Cada git push → Deploy automático en Vercel
echo ════════════════════════════════════════════════════════════════
echo.

echo VER VERCEL_SETUP.md PARA DOCUMENTACION COMPLETA
echo.
pause
