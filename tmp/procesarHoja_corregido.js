function procesarHoja(hoja, carreraId, config, año, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];
  
  let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1, idxTelefono = -1, idxInsc = -1;
  const idxCuota = {}, idxSeguro = {};
  
  // Encontrar índices básicos
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    if (h.includes("ITEM")) idxItem = i;
    else if (h === "APELLIDO") idxApellido = i;
    else if (h === "NOMBRES") idxNombres = i;
    else if (h === "DNI") idxDNI = i;
    else if (h === "TELEFONO") idxTelefono = i;
    else if (h === "INSCRIPCION") idxInsc = i;
  }
  
  Logger.log(`   📊 Headers (primeros 15): ${headers.slice(0, 15).join(" | ")}`);
  
  // ✅ NUEVA LÓGICA: Detectar meses y SEGUROS alternados
  // Estructura: MES | SEGURO | MES | SEGURO | ...
  for (let i = 0; i < headers.length - 1; i++) {
    const hActual = String(headers[i]).toUpperCase().trim();
    const hProx = String(headers[i + 1]).toUpperCase().trim();
    
    for (let mes of meses) {
      // Si la columna actual es un MES y la próxima es SEGURO
      if (hActual === mes && hProx.includes("SEGURO")) {
        idxCuota[mes] = i;        // Columna del mes para CUOTA
        idxSeguro[mes] = i + 1;   // Columna siguiente para SEGURO
        Logger.log(`   ✅ ${mes}: Cuota en col ${i}, Seguro en col ${i + 1}`);
      }
    }
  }
  
  Logger.log(`   📋 Meses cuota encontrados: ${Object.keys(idxCuota).join(", ")}`);
  Logger.log(`   📋 Meses seguro encontrados: ${Object.keys(idxSeguro).join(", ")}`);
  
  // Procesar filas
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    
    let dni = String(fila[idxDNI] || "").split(".")[0].trim();
    if (!dni) continue;
    
    const apellido = String(fila[idxApellido] || "").trim();
    if (!apellido) continue;
    
    // Estudiante
    if (!estudiantes[dni]) {
      estudiantes[dni] = {
        item: fila[idxItem] || "",
        dni: dni,
        apellido: apellido,
        nombres: String(fila[idxNombres] || "").trim(),
        telefono: String(fila[idxTelefono] || "").trim(),
        carrera_id: carreraId,
        estado: "ACTIVO"
      };
    }
    
    // Inscripción
    const montoPagadoInsc = parseInt(fila[idxInsc]) || 0;
    if (montoPagadoInsc > 0) {
      const montoConfigInsc = config.monto_inscripcion;
      const montoAdeudado = Math.max(0, montoConfigInsc - montoPagadoInsc);
      const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
      
      pagosInscripcion.push([
        fila[idxItem] || "", dni, apellido, estudiantes[dni].nombres, carreraId,
        montoPagadoInsc, montoConfigInsc, montoAdeudado,
        "", "EFECTIVO", "", "", estado, ""
      ]);
    }
    
    // Cuotas
    for (let mes of meses) {
      if (idxCuota[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
        if (montoPagado > 0) {
          const montoConfig = config.monto_cuota;
          const montoAdeudado = Math.max(0, montoConfig - montoPagado);
          const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
          
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          
          pagosCuota.push([
            fila[idxItem] || "", dni, apellido, estudiantes[dni].nombres, carreraId, mesCompleto, año,
            montoPagado, montoConfig, montoAdeudado,
            "", "EFECTIVO", "", estado, ""
          ]);
        }
      }
    }
    
    // ✅ SEGURO ANUAL (ahora detecta correctamente)
    let totalSeguro = 0, mesesConPago = [];
    for (let mes of meses) {
      if (idxSeguro[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
        if (montoPagado > 0) {
          totalSeguro += montoPagado;
          mesesConPago.push(mes);
        }
      }
    }
    
    if (totalSeguro > 0) {
      const montoConfig = config.monto_seguro;
      const montoAdeudado = Math.max(0, montoConfig - totalSeguro);
      const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
      
      pagosSeguro.push([
        fila[idxItem] || "", dni, apellido, estudiantes[dni].nombres, carreraId,
        "ANUAL", año,
        totalSeguro, montoConfig, montoAdeudado,
        mesesConPago.length + " cuotas", "EFECTIVO", "", estado,
        "Cuotas: " + mesesConPago.join(", ")
      ]);
    }
  }
}
