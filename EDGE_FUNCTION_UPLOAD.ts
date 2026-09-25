// Edge Function: Upload de Comprobantes de Gastos
// Ubicación: supabase/functions/upload-gasto-comprobante/index.ts
// 
// Ejecutar en Supabase:
// supabase functions deploy upload-gasto-comprobante

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Manejo CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Crear cliente Supabase con service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase faltante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parsear request
    const formData = await req.formData()
    const archivo = formData.get("archivo") as File
    const institucionId = formData.get("institucion_id") as string
    const usuarioId = formData.get("usuario_id") as string
    const token = formData.get("token") as string

    // VALIDACIÓN 1: Parámetros requeridos
    if (!archivo || !institucionId || !usuarioId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Faltan parámetros: archivo, institucion_id, usuario_id" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // VALIDACIÓN 2: Tipo de archivo
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!tiposPermitidos.includes(archivo.type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Tipo de archivo no permitido. Solo JPG, PNG, WebP y PDF." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // VALIDACIÓN 3: Tamaño máximo (10 MB)
    const maxTamano = 10 * 1024 * 1024
    if (archivo.size > maxTamano) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Archivo demasiado grande. Máximo 10 MB." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // VALIDACIÓN 4: Usuario pertenece a institución (verificar en BD)
    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id, institucion_id")
      .eq("id", usuarioId)
      .single()

    if (errorUsuario || !usuario || usuario.institucion_id !== parseInt(institucionId)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Usuario no tiene permiso para esta institución" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Generar nombre único
    const timestamp = Date.now()
    const extension = archivo.name.split(".").pop() || "archivo"
    const nombreArchivo = `gasto-${institucionId}-${timestamp}.${extension}`
    const carpeta = `gastos/${institucionId}`
    const ruta = `${carpeta}/${nombreArchivo}`

    console.log(`📤 Subiendo archivo: ${ruta}`)

    // Convertir archivo a buffer
    const buffer = await archivo.arrayBuffer()

    // SUBIR A STORAGE (como admin, sin RLS)
    const { data: dataUpload, error: errorUpload } = await supabase.storage
      .from("comprobantes")
      .upload(ruta, buffer, {
        contentType: archivo.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (errorUpload) {
      console.error("❌ Error uploading:", errorUpload)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error al subir archivo: ${errorUpload.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Obtener URL pública
    const { data: datosPublicos } = supabase.storage
      .from("comprobantes")
      .getPublicUrl(ruta)

    const archivoUrl = datosPublicos.publicUrl

    console.log(`✅ Archivo subido: ${archivoUrl}`)

    // REGISTRAR EN AUDITORÍA (opcional, para seguridad)
    await supabase
      .from("audit_uploads")
      .insert({
        usuario_id: parseInt(usuarioId),
        institucion_id: parseInt(institucionId),
        archivo_url: archivoUrl,
        archivo_tipo: archivo.type.includes("image") ? "imagen" : "pdf",
        archivo_tamaño: archivo.size,
        timestamp: new Date().toISOString(),
      })
      .then(() => console.log("✅ Auditoría registrada"))
      .catch((err) => console.error("⚠️ Error auditoría:", err.message))

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        url: archivoUrl,
        tipoArchivo: archivo.type.includes("image") ? "imagen" : "pdf",
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  } catch (error) {
    console.error("❌ Error:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
