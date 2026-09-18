╔════════════════════════════════════════════════════════════════════════════════╗
║            🚀 OPCIÓN 2: SERVIDOR NODE.JS + CLOUDFLARE TUNNEL                    ║
╚════════════════════════════════════════════════════════════════════════════════╝

## 📋 ARCHIVOS CREADOS:

✅ server/index.js
   └─ Servidor Express simple que procesa chatbot requests + Ollama

✅ server/package.json
   └─ Dependencias del servidor

✅ server/.env
   └─ Configuración puerto

✅ src/renderer/hooks/useChatFundacion.ts (ACTUALIZADO)
   └─ Ahora soporta tanto localhost como Cloudflare Tunnel


═══════════════════════════════════════════════════════════════════════════════════

## 🔧 PASO 1: INSTALAR DEPENDENCIAS DEL SERVIDOR

Abre terminal en carpeta raíz y ejecuta:

```bash
cd server
npm install
```

Espera a que termine (~1-2 min).


═══════════════════════════════════════════════════════════════════════════════════

## 🚀 PASO 2: INICIAR SERVIDOR LOCALMENTE

En NUEVA terminal (NO CIERRES Ollama):

```bash
cd server
npm start
```

Deberías ver:
```
[INFO] ... 🚀 Servidor corriendo en http://localhost:3001
[INFO] ... ✅ Ollama esperado en http://localhost:11434
```


═══════════════════════════════════════════════════════════════════════════════════

## 🌐 PASO 3: INSTALAR CLOUDFLARE TUNNEL

Descargar: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

O con Chocolatey (si tienes):
```powershell
choco install cloudflared
```

Verificar instalación:
```powershell
cloudflared --version
```


═══════════════════════════════════════════════════════════════════════════════════

## 🔐 PASO 4: CONFIGURAR CLOUDFLARE TUNNEL

En NUEVA terminal ejecuta:

```powershell
cloudflared tunnel login
```

Se abrirá navegador → autoriza con tu cuenta Cloudflare.


═══════════════════════════════════════════════════════════════════════════════════

## 🔗 PASO 5: CREAR TUNNEL

En misma terminal:

```powershell
cloudflared tunnel create chatbot-fundacion
```

Guarda el resultado (ID del tunnel).

Luego crea archivo: `server/.cloudflared/config.yml`

```yaml
tunnel: chatbot-fundacion
credentialsFile: C:\Users\[TU_USUARIO]\.cloudflared\[ID_DEL_TUNNEL].json

ingress:
  - hostname: chatbot-fundacion.cfargotunnel.com
    service: http://localhost:3001
  - service: http_status:404
```

Reemplaza `[TU_USUARIO]` y `[ID_DEL_TUNNEL]` con los valores reales.


═══════════════════════════════════════════════════════════════════════════════════

## 🟢 PASO 6: EJECUTAR TUNNEL

En terminal ejecuta:

```powershell
cloudflared tunnel run chatbot-fundacion
```

Deberías ver:
```
Tunnel running at https://chatbot-fundacion.cfargotunnel.com
```


═══════════════════════════════════════════════════════════════════════════════════

## 📝 PASO 7: CONFIGURAR URL EN VERCEL

En Vercel → Settings → Environment Variables

Agregar:
```
VITE_CHATBOT_SERVER_URL = https://chatbot-fundacion.cfargotunnel.com
```

Redeploy en Vercel (git push).


═══════════════════════════════════════════════════════════════════════════════════

## 📊 RESUMEN - TERMINALES ABIERTAS:

Terminal 1: Ollama
```
ollama serve
```

Terminal 2: Servidor Node.js
```
cd server
npm start
```

Terminal 3: Cloudflare Tunnel
```
cloudflared tunnel run chatbot-fundacion
```


═══════════════════════════════════════════════════════════════════════════════════

## ✅ VERIFICAR QUE TODO FUNCIONA:

Desde OTRA máquina/celular/lugar:

1. Abre: https://cobranzafnsm.vercel.app
2. Loguéate como ADMIN
3. Click en: 💬 chat-FUNDACION
4. Escribe: ¿Cuánto recaudé?
5. Presiona Enter

Debería responder sin problema.


═══════════════════════════════════════════════════════════════════════════════════

## ⚠️ IMPORTANTE:

- 🖥️ Ollama DEBE estar corriendo (localhost:11434)
- 🖥️ Servidor Node.js DEBE estar corriendo (localhost:3001)
- 🖥️ Cloudflare Tunnel DEBE estar activo (https://chatbot-fundacion.cfargotunnel.com)
- 🖥️ Tu PC NO puede apagarse

Si algo falla, verifica en Consola del navegador (F12).

═══════════════════════════════════════════════════════════════════════════════════
