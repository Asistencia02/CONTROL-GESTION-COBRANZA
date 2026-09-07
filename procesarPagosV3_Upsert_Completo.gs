function procesarPagosV3Upsert(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { insertados: 0, actualizados: 0, ignorados: 0, errores: 0 };
  const pagosParaProcesar = [];
  const agrupados = {};
  
  const timestamp = Math.floor(Date.now() / 1000);
  let talonarioCounter = 0;
  
  // Cargar configuracion_carreras para obtener montos originales
  const configCarreras = cargarConfiguracionCarreras(config);
  
  for (let pagoArr of pagosArray) {
    try {
      const dni = pagoArr[1];
      const estId = dniAId[dni];
      if (!estId) {
        res.ignorados++;
        continue;
      }
      
      const carId = pagoArr[4];
      let conceptoId = null;
      let mes = null;
      let mesNum = null;
      
      if (tipo === "INSCRIPCION") {
        conceptoId = conceptos[carId] ? conceptos[carId].inscripcion : null;
      } else if (tipo === "SEGURO") {
        mes = pagoArr[5];
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].seguros[mesNum] : null;
      } else if (tipo === "CUOTA") {
        mes = pagoArr[5];
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].cuotas[mesNum] : null;
      }
      
      if (!conceptoId) {
        res.ignorados++;
        continue;
      }
      
      let metodo = pagoArr[tipo === "INSCRIPCION" ? 9 : (tipo === "SEGURO" ? 11 : 11)] || "EFECTIVO";
      let talonario = pagoArr[tipo === "INSCRIPCION" ? 11 : (tipo === "SEGURO" ? 12 : 12)] || "";
      metodo = String(metodo).trim().toUpperCase();
      talonario = String(talonario).trim();
      if (!talonario || talonario === "") {
        talonarioCounter++;
        talonario = `AUTO_${timestamp}_${String(talonarioCounter).padStart(6, '0')}`;
      }
      
      const montoPagado = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : (tipo === "SEGURO" ? 7 : 7)]) || 0;
      if (!montoPagado) {
        res.ignorados++;
        continue;
      }
      
      // Obtener monto original de configuracion_carreras
      const montoOriginal = obtenerMontoOriginal(configCarreras, parseInt(config.institucionId), parseInt(carId), tipo);
      if (!montoOriginal) {
        res.ignorados++;
        continue;
      }
      
      const key = `${estId}|${conceptoId}`;
      if (!agrupados[key]) {
        agrupados[key] = { 
          estId: estId, 
          carId: carId, 
          conceptoId: conceptoId,
          tipo: tipo, 
          metodo: metodo, 
          talonario: talonario, 
          montoPagado: 0, 
          montoOriginal: montoOriginal,
          detalles: []
        };
      }
      
      agrupados[key].montoPagado += montoPagado;
      agrupados[key].detalles.push({ 
        concepto_id: conceptoId, 
        monto_original: montoOriginal,
        monto_pagado: montoPagado
      });
      
    } catch (e) {
      res.errores++;
    }
  }
  
  Logger.log(`   DEBUG v3.0 ${tipo}: ${Object.keys(agrupados).length} pagos agrupados`);
  
  const hoy = new Date().toISOString().split('T')[0];
  
  // ===== COMPARAR CON PAGOS EXISTENTES =====
  Logger.log(`   🔍 Buscando pagos existentes...`);
  const pagosExistentes = buscarPagosExistentes(config, Object.values(agrupados), hoy);
  Logger.log(`   📊 Encontrados ${Object.keys(pagosExistentes).length} pagos existentes`);
  
  for (let key in agrupados) {
    const pago = agrupados[key];
    const cantidadConceptos = pago.detalles.length;
    
    // Key para búsqueda: estudiante_id|concepto_id
    const pagoKey = `${pago.estId}|${pago.conceptoId}`;
    const pagoExistente = pagosExistentes[pagoKey];
    
    if (pagoExistente) {
      // UPDATE - ya existe
      Logger.log(`     🔄 UPDATE: estudiante ${pago.estId}, concepto ${pago.conceptoId}`);
      actualizarPagoMultiple(config, pagoExistente.id, pago, hoy);
      res.actualizados++;
    } else {
      // INSERT - no existe
      Logger.log(`     ➕ INSERT: estudiante ${pago.estId}, concepto ${pago.conceptoId}`);
      insertarPagoMultiple(config, pago, cantidadConceptos, hoy);
      res.insertados++;
    }
  }
  
  Logger.log(`   ✅ ${tipo}: ${res.insertados} insertados, ${res.actualizados} actualizados`);
  
  return res;
}

// ==================== BUSCAR PAGOS EXISTENTES ====================

function buscarPagosExistentes(config, pagos, fecha) {
  const pagosExistentes = {};
  
  try {
    const instId = parseInt(config.institucionId);
    
    // Obtener todos los pagos_multiples de esta institución
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/pagos_multiples?institucion_id=eq.${instId}&select=id,estudiante_id,numero_talonario`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      Logger.log(`   📋 Total pagos_multiples en BD: ${datos.length}`);
      
      // Mapear pagos_multiples a sus detalles para obtener concepto_id
      for (let pagoM of datos) {
        // Obtener detalles de este pago
        const respDet = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/pagos_multiples_detalle?pago_multiple_id=eq.${pagoM.id}&select=concepto_id`,
          {
            method: "get",
            headers: { "apikey": config.supabaseKey },
            muteHttpExceptions: true
          }
        );
        
        if (respDet.getResponseCode() === 200) {
          const detalles = JSON.parse(respDet.getContentText());
          
          // Usar el primer concepto como identificador principal
          if (detalles.length > 0) {
            const conceptoId = detalles[0].concepto_id;
            const key = `${pagoM.estudiante_id}|${conceptoId}`;
            pagosExistentes[key] = {
              id: pagoM.id,
              numero_talonario: pagoM.numero_talonario
            };
          }
        }
      }
    }
  } catch (e) {
    Logger.log(`   ❌ Error buscando pagos existentes: ${e}`);
  }
  
  return pagosExistentes;
}

// ==================== ACTUALIZAR PAGO MÚLTIPLE ====================

function actualizarPagoMultiple(config, pagoId, pago, fecha) {
  try {
    const datos = {
      monto_total: pago.montoPagado,
      cantidad_conceptos: pago.detalles.length,
      metodo_pago: pago.metodo,
      numero_talonario: pago.talonario,
      updated_at: new Date().toISOString()
    };
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/pagos_multiples?id=eq.${pagoId}`,
      {
        method: "patch",
        headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
        payload: JSON.stringify(datos),
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200 || resp.getResponseCode() === 204) {
      // Borrar detalles antiguos
      UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/pagos_multiples_detalle?pago_multiple_id=eq.${pagoId}`,
        {
          method: "delete",
          headers: { "apikey": config.supabaseKey },
          muteHttpExceptions: true
        }
      );
      
      // Insertar nuevos detalles
      for (let detalle of pago.detalles) {
        const respDet = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/pagos_multiples_detalle`,
          {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify({
              pago_multiple_id: pagoId,
              concepto_id: detalle.concepto_id,
              monto_original: detalle.monto_original,
              monto_pagado: detalle.monto_pagado
            }),
            muteHttpExceptions: true
          }
        );
      }
      
      Logger.log(`     ✅ Actualizado pago ID ${pagoId}`);
    } else {
      Logger.log(`     ❌ Error UPDATE: HTTP ${resp.getResponseCode()}`);
    }
  } catch (e) {
    Logger.log(`     ❌ Exception UPDATE: ${e}`);
  }
  
  Utilities.sleep(100);
}

// ==================== INSERTAR PAGO MÚLTIPLE ====================

function insertarPagoMultiple(config, pago, cantidadConceptos, fecha) {
  try {
    const datos = {
      institucion_id: parseInt(config.institucionId),
      estudiante_id: pago.estId,
      numero_talonario: pago.talonario,
      monto_total: pago.montoPagado,
      cantidad_conceptos: cantidadConceptos,
      metodo_pago: pago.metodo,
      fecha_cobro: fecha,
      descripcion: `${pago.tipo} - ${cantidadConceptos} concepto(s)`,
      estado: "PAGADO"
    };
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/pagos_multiples`,
      {
        method: "post",
        headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
        payload: JSON.stringify(datos),
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
      const resultado = JSON.parse(resp.getContentText());
      const pagoId = resultado[0]?.id;
      
      if (pagoId) {
        // Insertar detalles
        for (let detalle of pago.detalles) {
          UrlFetchApp.fetch(
            `${config.supabaseUrl}/rest/v1/pagos_multiples_detalle`,
            {
              method: "post",
              headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
              payload: JSON.stringify({
                pago_multiple_id: pagoId,
                concepto_id: detalle.concepto_id,
                monto_original: detalle.monto_original,
                monto_pagado: detalle.monto_pagado
              }),
              muteHttpExceptions: true
            }
          );
        }
        
        Logger.log(`     ✅ Insertado pago ID ${pagoId}`);
      }
    } else {
      Logger.log(`     ❌ Error INSERT: HTTP ${resp.getResponseCode()}`);
    }
  } catch (e) {
    Logger.log(`     ❌ Exception INSERT: ${e}`);
  }
  
  Utilities.sleep(100);
}

// ==================== FUNCIONES AUXILIARES ====================

function cargarConfiguracionCarreras(config) {
  const configuracion = {};
  
  try {
    const instId = parseInt(config.institucionId);
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}&select=carrera_id,monto_inscripcion,monto_cuota,monto_seguro`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let c of datos) {
        configuracion[c.carrera_id] = {
          monto_inscripcion: c.monto_inscripcion,
          monto_cuota: c.monto_cuota,
          monto_seguro: c.monto_seguro
        };
      }
    }
  } catch (e) {
    Logger.log(`   ❌ Error cargando configuración: ${e}`);
  }
  
  return configuracion;
}

function obtenerMontoOriginal(configCarreras, institucionId, carreraId, tipo) {
  if (!configCarreras[carreraId]) return null;
  
  const config = configCarreras[carreraId];
  if (tipo === "INSCRIPCION") return config.monto_inscripcion;
  if (tipo === "CUOTA") return config.monto_cuota;
  if (tipo === "SEGURO") return config.monto_seguro;
  
  return null;
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
