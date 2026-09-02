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
    // ✅ Usar la URL hardcodeada como fallback si no está en env
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || 
      'https://script.google.com/macros/s/AKfycbx91rHcYaxu-Jgc6st2XSs3nwjh7DYt2ZEJH_WPPiXA35g__13VhhmxfvNuTRXEbVOt1Q/exec'

    console.log(`📍 [API] Llamando a Google Apps Script`)
    console.log(`📍 [API] URL: ${googleAppsScriptUrl.substring(0, 80)}...`)
    console.log(`📍 [API] Body: ${JSON.stringify(req.body).substring(0, 100)}`)

    // Llamar a Google Apps Script desde el servidor (sin CORS)
    const response = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    })

    console.log(`📊 [API] Google Apps Script status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [API] Google Apps Script error: ${errorText.substring(0, 200)}`)
      return res.status(response.status).json({
        exito: false,
        mensaje: `Google Apps Script error: ${errorText.substring(0, 100)}`
      })
    }

    const data = await response.json()

    console.log(`✅ [API] Sincronización completada`)
    console.log(`✅ [API] Response: ${JSON.stringify(data).substring(0, 100)}...`)
    
    return res.status(200).json(data)

  } catch (error) {
    console.error('❌ [API] Error en proxy:', error)
    return res.status(500).json({
      exito: false,
      mensaje: error instanceof Error ? error.message : 'Error interno del servidor',
      error: error instanceof Error ? error.stack : 'Sin detalles'
    })
  }
}
