export default async function handler(req, res) {
  // Permitir CORS desde tu frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version')

  // Manejar preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL

    if (!googleAppsScriptUrl) {
      return res.status(500).json({ error: 'GOOGLE_APPS_SCRIPT_URL no configurada' })
    }

    console.log(`📍 Llamando a Google Apps Script: ${googleAppsScriptUrl}`)

    // Llamar a Google Apps Script desde el servidor (sin CORS)
    const response = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    })

    console.log(`📊 Google Apps Script response: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Google Apps Script error: ${errorText}`)
      return res.status(response.status).json({
        exito: false,
        mensaje: `Google Apps Script error: ${errorText}`
      })
    }

    const data = await response.json()

    console.log(`✅ Sincronización completada`)
    return res.status(200).json(data)

  } catch (error) {
    console.error('❌ Error en proxy:', error)
    return res.status(500).json({
      exito: false,
      mensaje: error instanceof Error ? error.message : 'Error interno del servidor'
    })
  }
}
