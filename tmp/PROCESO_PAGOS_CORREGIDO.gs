// ==================== SECCIÓN CORREGIDA: procesarCobranzaPorInstitucionInteligente ====================
// REEMPLAZA TODO DESDE LA LÍNEA "const pagosConId = Object.entries(estudiantesConPagos)"
// HASTA "return resultados;" AL FINAL DE LA FUNCIÓN

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
  
  // DEBUG: verificar que dniAId está disponible aquí
  logConTiempo(`      DEBUG: dniAId tiene ${Object.keys(dniAId).length} entries`);
  logConTiempo(`      DEBUG: dniAId keys sample: ${Object.keys(dniAId).slice(0, 5).join(", ")}`);
  
  const pagosConId = Object.entries(estudiantesConPagos).map(([dni, estudiante]) => ({
    dni,
    estudiante: estudiante
  })).filter(p => p.estudiante);
  
  logConTiempo(`      DEBUG: pagosConId tiene ${pagosConId.length} registros`);
  logConTiempo(`      DEBUG: Primeros 3 pagos a procesar: ${pagosConId.slice(0, 3).map(p => p.dni).join(", ")}`);
  
  for (let i = 0; i < pagosConId.length; i += PAGO_PARALLEL_BATCH) {
    const lote = pagosConId.slice(i, i + PAGO_PARALLEL_BATCH);
    
    for (let pago of lote) {
      // ✅ USAR ID REAL DE BD (dniAId), NO EL ITEM DEL EXCEL
      const estId = dniAId[pago.dni];
      
      logConTiempo(`      DEBUG BÚSQUEDA: pago.dni='${pago.dni}' -> estId=${estId}`);
      
      if (!estId) {
        registrarError(
          "PAGO_SIN_ID_EN_MAPA",
          pago.estudiante.dni,
          pago.estudiante.apellido,
          pago.estudiante.nombres,
          `DNI en búsqueda pero NO en dniAId map - dniAId.keys=${Object.keys(dniAId).length}`
        );
        resultados.errores++;
        continue;
      }
      
      const resultado = crearPagoMultipleAgrupado(
        config,
        estId,
        pago.estudiante,
        pago.estudiante.conceptos,
        conceptos,
        config_carreras,
        pago.estudiante.carrera_id,
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
          pago.estudiante.dni,
          pago.estudiante.apellido,
          pago.estudiante.nombres,
          resultado.error
        );
      }
    }
    
    if (i + PAGO_PARALLEL_BATCH < pagosConId.length) {
      sleepConConfig("afterBigRPC");
    }
  }
  
  return resultados;
