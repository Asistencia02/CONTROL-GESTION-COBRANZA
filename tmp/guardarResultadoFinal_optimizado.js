function guardarResultadoFinal(hojaSync, resultado) {
  try {
    let logSheet = hojaSync.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = hojaSync.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "ESTADO", "RESUMEN", "ERRORES", "OMITIDOS"]);
    }
    
    // Crear fila de log
    const row = [
      new Date().toLocaleString('es-AR'),
      resultado.exito ? "✅ OK" : "⚠️ ERRORES",
      `EST:${resultado.contadores.estudiantesInsertados} INSC:${resultado.contadores.pagosInscInsertados} CUOT:${resultado.contadores.pagosCuotaInsertados} SEG:${resultado.contadores.pagosSeguroInsertados}`,
      resultado.contadores.errores,
      resultado.contadores.pagosSkipped
    ];
    
    // Agregar sin recalcular (más rápido)
    logSheet.getRange(logSheet.getLastRow() + 1, 1, 1, 5).setValues([row]);
    
    Logger.log("✅ Log guardado");
  } catch (e) {
    Logger.log("⚠️ Error guardando log: " + e);
  }
}
