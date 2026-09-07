/**
 * ========================================================================
 * PROCESADOR DE PAGOS V3 FINAL - FUNCIONES AUXILIARES
 * ========================================================================
 */

/**
 * PROCESAR PAGOS V3 FINAL
 * Realiza INSERT/UPDATE automático con comparación inteligente
 * Batches de 20 para optimizar tiempo
 */
function procesarPagosV3Final(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { insertados: 0, actualizados: 0, ignorados: 0, errores: 0, detalles: 0 };
  const pagosParaProcesar = [];
  const agrupados = {};
  
  const timestamp = Math.floor(Date.now() / 1000);
  let talonarioCounter = 0;
  
  // Cargar configuracion_carreras UNA SOLA VEZ
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
      
      // Determinar tipo de concepto
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
      
      // Extraer metodo y talonario
      let metodo = pagoArr[tipo === "INSCRIPCION" ? 9 : (tipo === "SEGURO" ? 11 : 11)] || "EFECTIVO";
      let talonario = pagoArr[tipo === "INSCRIPCION" ? 11 : (tipo === "SEGURO" ? 12 : 12)] || "";
      metodo = String(metodo).trim().toUpperCase();
      talonario = String(talonario).trim();
      
      // Generar talonario automático si está vacío
      if (!talonario || talonario === "") {
        talonarioCounter++;
        talonario = `AUTO_${timestamp}_${String(talonarioCounter).padStart(6, '0')}`;
      }
      
      // Obtener monto pagado
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
      
      // Agrupar por estudiante + concepto
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
      Logger.log(`   ❌ Error procesando pago: ${e}`);
      res.errores++;
    }
  }
  
  Logger.log(`   📊 Agrupados: ${Object.keys(agrupados).length}, Ignorados: ${res.ignorados}`);
  
  const hoy = new Date().toISOString().split('T')[0];
  
  // Preparar RPC calls
  for (let key in agrupados) {
    const pago = agrupados[key];
    const cantidadConceptos = pago.detalles.length;
    
    pagosParaProcesar.push({
      p_institucion_id: parseInt(config.institucionId),
      p_estudiante_id: pago.estId,
      p_numero_talonario: pago.talonario,
      p_monto_total: pago.montoPagado,
      p_cantidad_conceptos: cantidadConceptos,
      p_metodo_pago: pago.metodo,
      p_fecha_cobro: hoy,
      p_descripcion: `${tipo} - ${cantidadConceptos} concepto(s)`,
      p_detalles: pago.detalles
    });
  }
  
  if (pagosParaProcesar.length === 0) {
    Logger.log(`   ⚠️ No hay pagos para procesar (${tipo})`);
    return res;
  }
  
  Logger.log(`   📤 Enviando ${pagosParaProcesar.length} RPC calls (batches de 20)`);
  
  // ENVIAR EN BATCHES DE 20 (optimización de tiempo)
  for (let i = 0; i < pagosParaProcesar.length; i += 20) {
    const batch = pagosParaProcesar.slice(i, i + 20);
    
    for (let pago of batch) {
      try {
        const resp = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
          {
            method: "post",
            headers: { 
              "apikey": config.supabaseKey, 
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            payload: JSON.stringify(pago),
            muteHttpExceptions: true,
            timeout: 60
          }
        );
        
        if (resp.getResponseCode() === 200 || resp.getResponseCode() === 201) {
          const result = JSON.parse(resp.getContentText());
          if (result && result.length > 0) {
            const row = result[0];
            const accion = row.accion || "insertado";
            
            if (accion === "insertado") {
              res.insertados++;
            } else if (accion === "actualizado") {
              res.actualizados++;
            }
            
            res.detalles += (row.detalles_insertados || 0);
          }
        } else {
          const errorText = resp.getContentText();
          Logger.log(`     ❌ HTTP ${resp.getResponseCode()}: ${errorText.substring(0, 100)}`);
          res.errores++;
        }
      } catch (e) {
        Logger.log(`     ❌ Exception: ${e.message}`);
        res.errores++;
      }
      
      Utilities.sleep(25); // 25ms entre llamadas
    }
  }
  
  Logger.log(`   ✅ ${tipo}: ${res.insertados} INSERT, ${res.actualizados} UPDATE, ${res.detalles} detalles`);
  
  return res;
}

/**
 * CARGAR CONFIGURACION CARRERAS
 * Obtiene montos desde configuracion_carreras en BD
 */
function cargarConfiguracionCarreras(config) {
  const configuracion = {};
  
  try {
    const instId = parseInt(config.institucionId);
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}&select=carrera_id,monto_inscripcion,monto_cuota,monto_seguro`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 30
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
      Logger.log(`   📊 Configuración carreras cargada: ${datos.length} registros`);
    }
  } catch (e) {
    Logger.log(`   ❌ Error cargando config: ${e}`);
  }
  
  return configuracion;
}

/**
 * OBTENER MONTO ORIGINAL
 * Retorna el monto correcto según el tipo de concepto
 */
function obtenerMontoOriginal(configCarreras, institucionId, carreraId, tipo) {
  if (!configCarreras[carreraId]) {
    return null;
  }
  
  const config = configCarreras[carreraId];
  
  if (tipo === "INSCRIPCION") {
    return config.monto_inscripcion;
  } else if (tipo === "CUOTA") {
    return config.monto_cuota;
  } else if (tipo === "SEGURO") {
    return config.monto_seguro;
  }
  
  return null;
}

/**
 * CONVERTIR MES A NÚMERO
 * Convierte "MARZO" -> 3, "marzo" -> 3, "3" -> 3, etc.
 */
function convertirMesANumero(mesDato) {
  if (!mesDato) return null;
  
  const m = mesDato.toString().trim().toUpperCase();
  const meses = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
    "SEPT": 9, "SEP": 9, "NOV": 11, "DIC": 12,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, 
    "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12
  };
  
  return meses[m] || null;
}

/**
 * BUSCAR CONCEPTO POR ID
 */
function buscarConceptoPorId(conceptoId, conceptos) {
  for (let carrera in conceptos) {
    const config = conceptos[carrera];
    if (config.inscripcion === conceptoId) return { tipo: "INSCRIPCION", carrera };
    
    for (let mes in config.cuotas) {
      if (config.cuotas[mes] === conceptoId) return { tipo: "CUOTA", carrera, mes };
    }
    
    for (let mes in config.seguros) {
      if (config.seguros[mes] === conceptoId) return { tipo: "SEGURO", carrera, mes };
    }
  }
  
  return null;
}
