function generarDNISinDuplicados(dniBase, estudiantesMap, instId) {
  const dniRaw = String(dniBase || "").replace(/\./g, "").trim();
  const dniTrimmed = dniRaw.trim();
  const esVacio = !dniRaw || dniRaw === "";
  const esEspacios = dniTrimmed === "";
  const esCeros = dniRaw === "00000000" || dniRaw === "0";
  
  if (dniRaw && dniRaw !== "" && dniRaw !== "00000000" && dniRaw !== "0") {
    Logger.log(`   ✅ DNI VÁLIDO: "${dniRaw}" (tipo: ${typeof dniBase}, raw: "${dniBase}")`);
    return dniRaw;
  }
  
  const motivo = esVacio ? "VACÍO" : (esEspacios ? "ESPACIOS" : (esCeros ? "CEROS" : "INVÁLIDO"));
  Logger.log(`   📍 DNI INVÁLIDO para INST${instId} - MOTIVO: ${motivo} | Raw: "${dniBase}" | Type: ${typeof dniBase} | Trimmed: "${dniTrimmed}"`);
  
  const offset = (parseInt(instId) - 1) * 100000;
  let contador = offset;
  let dniGenerado = String(contador).padStart(8, '0');
  
  while (estudiantesMap[dniGenerado]) {
    contador++;
    if (contador >= offset + 100000) {
      Logger.log(`   ❌ ERROR: Se agotaron DNIs para institución ${instId}`);
      return null;
    }
    dniGenerado = String(contador).padStart(8, '0');
  }
  
  Logger.log(`   ⚠️ DNI GENERADO para INST${instId}: ${dniGenerado} (razón: ${motivo})`);
  return dniGenerado;
}
