// ==================== CAMBIOS PARA v2.14 ====================
// ✅ FIX: Parse instId como INT en cargarConceptos()
// ✅ FEATURE: Expandir SEGUROS ANUAL en 1 registro por mes pagado

// 1. REEMPLAZAR FUNCIÓN cargarConceptos (línea ~485):

function cargarConceptos(config) {
  const conceptos = {};
  
  try {
    const instId = parseInt(config.institucionId);  // FIX: Convertir a INT
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

// 2. MODIFICAR sincronizarDatos() - parte SEGUROS (línea ~365):
// REEMPLAZAR ESTO:
/*
  if (pagosSeguro.length > 0) {
    Logger.log(`   Procesando ${pagosSeguro.length} seguros...`);
    const res = procesarPagosBatch(config, pagosSeguro, "SEGURO", dniAId, conceptos, pagosExistentes);
    contadores.pagosSeguroInsertados = res.insertados;
    contadores.segurosActualizados = res.actualizados;
    contadores.ignorados += res.ignorados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`   ✅ SEGUROS: ${res.insertados} insertados, ${res.actualizados} actualizados, ${res.skipped} skipped, ${res.errores} errores`);
  }
*/
// POR ESTO:
  if (pagosSeguro.length > 0) {
    Logger.log(`   Procesando ${pagosSeguro.length} seguros (expandiendo por mes)...`);
    const pagosSeguroExpandidos = expandirSegurosPorMes(pagosSeguro);
    Logger.log(`   📊 Expandidos a ${pagosSeguroExpandidos.length} registros individuales`);
    const res = procesarPagosBatch(config, pagosSeguroExpandidos, "SEGURO", dniAId, conceptos, pagosExistentes);
    contadores.pagosSeguroInsertados = res.insertados;
    contadores.segurosActualizados = res.actualizados;
    contadores.ignorados += res.ignorados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`   ✅ SEGUROS: ${res.insertados} insertados, ${res.actualizados} actualizados, ${res.skipped} skipped, ${res.errores} errores`);
  }

// 3. AGREGAR 2 FUNCIONES NUEVAS (antes de convertirMesANumero):

function expandirSegurosPorMes(pagosSeguro) {
  const expandidos = [];
  
  for (let pagoArr of pagosSeguro) {
    const notas = pagoArr[14] || "";
    const mesesMatch = notas.match(/Cuotas: ([^\n]*)/);
    let meses = [];
    
    if (mesesMatch && mesesMatch[1]) {
      meses = mesesMatch[1]
        .split(",")
        .map(function(m) { return m.trim(); })
        .filter(function(m) { return m; });
    }
    
    if (meses.length === 0) {
      expandidos.push(pagoArr);
      continue;
    }
    
    const montoTotal = parseFloat(pagoArr[7]) || 0;
    const montoPorMes = Math.round(montoTotal / meses.length);
    const montoConfigTotal = parseFloat(pagoArr[8]) || 0;
    const montoConfigMes = Math.round(montoConfigTotal / meses.length);
    
    for (let i = 0; i < meses.length; i++) {
      const mes = meses[i];
      const mesNum = convertirMesANumero(mes);
      if (!mesNum) continue;
      
      const montoAdeudado = Math.max(0, montoConfigMes - montoPorMes);
      const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
      
      const nuevoPago = [
        pagoArr[0],
        pagoArr[1],
        pagoArr[2],
        pagoArr[3],
        pagoArr[4],
        mesNum,
        pagoArr[6],
        montoPorMes,
        montoConfigMes,
        montoAdeudado,
        "1 cuota",
        "EFECTIVO",
        "",
        estado,
        mes
      ];
      
      expandidos.push(nuevoPago);
    }
  }
  
  return expandidos;
}

function convertirMesANumero(mesDato) {
  if (!mesDato) return null;
  const m = mesDato.toString().trim().toUpperCase();
  const meses = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
    "SEPT": 9, "SEP": 9, "NOV": 11, "DIC": 12,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12
  };
  return meses[m] || null;
}
