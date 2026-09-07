// ==================== CREAR PAGO MÚLTIPLE ARREGLADO ====================

function crearPagoMultipleAgrupado(config, estId, estudiante, conceptosPagados, conceptos, config_carreras, carreraId) {
  try {
    const instId = parseInt(config.institucionId);
    
    const detalles = [];
    let montoTotal = 0;
    
    for (let concepto of conceptosPagados) {
      let conceptoId = null;
      let montoOriginal = 0;
      
      if (concepto.tipo === "INSCRIPCION") {
        conceptoId = conceptos[carreraId]?.inscripcion;
        montoOriginal = config_carreras[carreraId]?.monto_inscripcion || 0;
      } else if (concepto.tipo === "CUOTA") {
        const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
        conceptoId = conceptos[carreraId]?.cuotas[mesCapitalizado];
        montoOriginal = config_carreras[carreraId]?.monto_cuota || 0;
      } else if (concepto.tipo === "SEGURO") {
        const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
        conceptoId = conceptos[carreraId]?.seguros[mesCapitalizado];
        montoOriginal = config_carreras[carreraId]?.monto_seguro || 0;
      }
      
      if (!conceptoId) {
        continue;
      }
      
      detalles.push({
        concepto_id: conceptoId,
        monto_original: montoOriginal,
        monto_pagado: concepto.montoPagado
      });
      
      montoTotal += concepto.montoPagado;
    }
    
    if (detalles.length === 0) {
      return { success: false, error: "Sin conceptos", conceptos_count: 0 };
    }
    
    const talonario = `AUTO_${estId}_${Date.now()}`;
    const metodo = conceptosPagados[0]?.metodo || "EFECTIVO";
    
    // PASO 1: INSERTAR EN pagos_multiples
    const pagoPayload = {
      institucion_id: instId,
      estudiante_id: estId,
      numero_talonario: talonario,
      monto_total: montoTotal,
      cantidad_conceptos: detalles.length,
      metodo_pago: metodo,
      fecha_cobro: new Date().toISOString().split('T')[0],
      descripcion: `Pago agrupado: ${detalles.length} conceptos`
    };
    
    const respPago = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/pagos_multiples`,
      {
        method: "post",
        headers: { 
          "apikey": config.supabaseKey, 
          "Content-Type": "application/json", 
          "Prefer": "return=representation" 
        },
        payload: JSON.stringify(pagoPayload),
        muteHttpExceptions: true,
        timeout: 30
      }
    );
    
    if (respPago.getResponseCode() === 201 || respPago.getResponseCode() === 200) {
      const respData = JSON.parse(respPago.getContentText());
      const pagoId = Array.isArray(respData) ? respData[0].id : respData.id;
      
      // PASO 2: INSERTAR DETALLES EN pagos_multiples_detalle
      for (let detalle of detalles) {
        const detallePayload = {
          pago_multiple_id: pagoId,
          concepto_id: detalle.concepto_id,
          monto_original: detalle.monto_original,
          monto_pagado: detalle.monto_pagado
        };
        
        UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/pagos_multiples_detalle`,
          {
            method: "post",
            headers: { 
              "apikey": config.supabaseKey, 
              "Content-Type": "application/json" 
            },
            payload: JSON.stringify(detallePayload),
            muteHttpExceptions: true,
            timeout: 30
          }
        );
      }
      
      return { success: true, conceptos_count: detalles.length };
    } else {
      return { success: false, error: respPago.getContentText().substring(0, 100), conceptos_count: 0 };
    }
    
  } catch (e) {
    return { success: false, error: e.toString(), conceptos_count: 0 };
  }
}
