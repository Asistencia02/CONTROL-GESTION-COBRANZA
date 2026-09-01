#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🚀 SETUP RÁPIDO PARA VERCEL                         ║"
echo "║     Gestión de Cobranzas - Deployment Automático             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Paso 1: Git init
echo "📍 PASO 1: Inicializando Git..."
if [ -d ".git" ]; then
    echo "   ✓ Git ya inicializado"
else
    git init
    echo "   ✓ Git inicializado"
fi

# Paso 2: Add & Commit
echo ""
echo "📍 PASO 2: Preparando commit..."
git add .
git commit -m "Initial commit - Gestion de Cobranzas Web" || true
echo "   ✓ Código listo para push"

# Paso 3: Mostrar instrucciones
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              PASOS SIGUIENTES (EN TERMINAL)                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "1️⃣  CREAR REPOSITORIO EN GITHUB"
echo "   Opción A - GitHub Web:"
echo "      • Ve a github.com → + → New repository"
echo "      • Nombre: gestion-cobranzas"
echo "      • Copia el HTTPS URL"
echo ""
echo "   Opción B - GitHub CLI:"
echo "      gh repo create gestion-cobranzas --public --source=. --push"
echo ""

echo "2️⃣  AGREGAR REMOTE Y PUSH"
echo "   git remote add origin <URL-DEL-REPO>"
echo "   git push -u origin main"
echo ""

echo "3️⃣  CONECTAR A VERCEL"
echo "   Opción A - Vercel Web (recomendado):"
echo "      • Ve a vercel.com"
echo "      • Click 'New Project'"
echo "      • Selecciona tu repo"
echo "      • Click 'Deploy'"
echo ""
echo "   Opción B - Vercel CLI:"
echo "      npm i -g vercel"
echo "      vercel"
echo ""

echo "4️⃣  CONFIGURAR VARIABLES DE ENTORNO"
echo "   En Vercel Dashboard:"
echo "      • Settings → Environment Variables"
echo "      • Añade:"
echo "        VITE_SUPABASE_URL = https://tu-proyecto.supabase.co"
echo "        VITE_SUPABASE_ANON_KEY = eyJhbGc..."
echo "      • Click 'Save'"
echo "      • Redeploy"
echo ""

echo "5️⃣  VERIFICA"
echo "   Tu app en: https://gestion-cobranzas.vercel.app"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  DOCUMENTACIÓN COMPLETA EN: VERCEL_SETUP.md                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
