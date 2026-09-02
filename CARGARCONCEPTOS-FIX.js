function cargarConceptos(config) {
  const conceptos = {};
  
  try {
    const instId = parseInt(config.institucionId);
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${instId}&select=id,tipo,mes,carrera_id`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      Logger.log(`   📊 Conceptos cargados: ${datos.length} total`);
      for (let c of datos) {
        const car = c.carrera_id;
        if (!conceptos[car]) {
          conceptos[car] = { inscripcion: null, seguros: {}, cuotas: {} };
        }
        if (c.tipo === "INSCRIPCION") conceptos[car].inscripcion = c.id;
        else if (c.tipo === "SEGURO" && c.mes) conceptos[car].seguros[c.mes] = c.id;
        else if (c.tipo === "CUOTA" && c.mes) conceptos[car].cuotas[c.mes] = c.id;
      }
    }
  } catch (e) {
    Logger.log(`   ❌ Error cargando conceptos: ${e}`);
  }
  
  return conceptos;
}