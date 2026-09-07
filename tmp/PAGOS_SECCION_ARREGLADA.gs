  // ==================== SECCIÓN CRÍTICA: Construir dniAId y usarlo localmente ====================
  
  logConTiempo(`   🔍 Buscando IDs en BD para crear pagos...`);
  const dniAId = buscarEstudiantesById(config, estudiantesConPagos);
  logConTiempo(`   ✅ Encontrados: ${Object.keys(dniAId).length}/${estudiantesConPagos.length}`);
  
  if (Object.keys(dniAId).length === 0) {
    logConTiempo(`   ⚠️ No hay estudiantes con pagos para crear`);
    return resultados;
  }
  
  logConTiempo(`   💰 Cargando configuración (CACHED)...`);
  const config_carreras = cargarConfiguracionCarreras(config);
  const conceptos = cargarConceptos(config);
  
  logConTiempo(`\n   📚 CONCEPTOS CARGADOS POR CARRERA (CACHE):`);
  for (let car in conceptos) {
    const inscId = conceptos[car].inscripcion;
    const cuotasCount = Object.keys(conceptos[car].cuotas).length;
    const segurosCount = Object.keys(conceptos[car].seguros).length;
    logConTiempo(`      Carrera ${car}: INSC=${inscId}, CUOTAS=${cuotasCount}, SEGUROS=${segurosCount}`);
  }
  
  logConTiempo(`\n   💳 Creando pagos múltiples (PARALELIZADOS, DRY_RUN=${dryRun})...`);
  
  // DEBUG: Verificar que dniAId está disponible
  logConTiempo(`      DEBUG: dniAId map size = ${Object.keys(dniAId).length}`);
  
  // ✅ FIX: Iterar directamente sobre Object.keys() para obtener DNIs reales
  const dnisPago = Object.keys(estudiantesConPagos);
  logConTiempo(`      DEBUG: dnisPago count = ${dnisPago.length}`);
  logConTiempo(`      DEBUG: Primeros 5 DNIs reales: ${dnisPago.slice(0, 5).join(", ")}`);
  
  for (let i = 0; i < dnisPago.length; i += PAGO_PARALLEL_BATCH) {
    const lote = dnisPago.slice(i, i + PAGO_PARALLEL_BATCH);
    
    for (let dniKey of lote) {
      const estudiante = estudiantesConPagos[dniKey];
      
      // ✅ USAR dniKey (el DNI real, no el índice)
      const estId = dniAId[dniKey];
      
      logConTiempo(`      DEBUG BÚSQUEDA: dniKey='${dniKey}' (typeof=${typeof dniKey}) -> estId=${estId}`);
      
      if (!estId) {
        registrarError(
          "PAGO_SIN_ID_EN_MAPA",
          estudiante.dni,
          estudiante.apellido,
          estudiante.nombres,
          `DNI key '${dniKey}' no está en dniAId (size=${Object.keys(dniAId).length}). Claves disponibles: ${Object.keys(dniAId).slice(0, 5).join(", ")}...`
        );
        resultados.errores++;
        continue;
      }
      
      const resultado = crearPagoMultipleAgrupado(
        config,
        estId,
        estudiante,
        estudiante.conceptos,
        conceptos,
        config_carreras,
        estudiante.carrera_id,
        dryRun
      );
      
      if (resultado.success) {
        resultados.pagosMultiplesCreados += 1;
        resultados.conceptosAgrupados += resultado.conceptos_count;
        STATS_GLOBAL.pagosParalelos++;
      } else {
        resultados.errores += 1;
        STATS_GLOBAL.pagosSecuenciales++;
        registrarError(
          "PAGO_MULTIPLE_FALLO",
          estudiante.dni,
          estudiante.apellido,
          estudiante.nombres,
          resultado.error
        );
      }
    }
    
    if (i + PAGO_PARALLEL_BATCH < dnisPago.length) {
      sleepConConfig("afterBigRPC");
    }
  }
  
  return resultados;
