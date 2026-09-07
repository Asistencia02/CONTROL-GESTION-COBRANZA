// ==================== FIX DNI ÚNICO v2.28 ====================
// PROBLEMA: Un mismo DNI en 2 hojas genera conceptos duplicados
// SOLUCIÓN: Validar que cada DNI sea ÚNICO por INSTITUCIÓN
// Cuando un DNI se repite en múltiples carreras de la MISMA institución,
// SOLO procesar la PRIMERA ocurrencia y descartar las demás

function normalizarExcelParaCobranza() {
  Logger.log("🚀 normalizarExcelParaCobranza() iniciado");
  
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    Logger.log("❌ Archivo no encontrado");
    return null;
  }
  
  const file = files.next();
  const fileId = file.getId();
  const tempSpreadsheet = SpreadsheetApp.openById(fileId);
  
  const datosNormalizadosPorInst = {};
  const dniYaVistosPorInst = {}; // ✅ TRACK DNI únicos por institución
  
  const hojas = tempSpreadsheet.getSheets();
  Logger.log(`Procesando ${hojas.length} hojas...`);
  
  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h];
    const nombreHoja = hoja.getName();
    
    const mapeo = MAPEO_HOJAS[nombreHoja];
    if (!mapeo) {
      Logger.log(`   ⏭️ Hoja ignorada: ${nombreHoja}`);
      continue;
    }
    
    const instId = mapeo.institucion_id;
    const carreraId = mapeo.carrera_id;
    
    if (!datosNormalizadosPorInst[instId]) {
      datosNormalizadosPorInst[instId] = {
        todosLosEstudiantes: {},
        estudiantesConPagos: {},
        carreras: [carreraId]
      };
      dniYaVistosPorInst[instId] = {}; // ✅ Inicializar tracker
    } else {
      if (!datosNormalizadosPorInst[instId].carreras.includes(carreraId)) {
        datosNormalizadosPorInst[instId].carreras.push(carreraId);
      }
    }
    
    Logger.log(`  📄 ${nombreHoja} (inst ${instId}, carrera ${carreraId})...`);
    
    procesarHojaCobranzaConValidacionDNI(
      hoja,
      nombreHoja,
      carreraId,
      instId,
      2026,
      datosNormalizadosPorInst[instId],
      dniYaVistosPorInst[instId] // ✅ Pasar tracker
    );
  }
  
  Logger.log(`✅ Normalización OK`);
  return datosNormalizadosPorInst;
}

// ==================== PROCESAR HOJA CON VALIDACIÓN DNI ÚNICO ====================

function procesarHojaCobranzaConValidacionDNI(hoja, nombreHoja, carreraId, instId, año, datosInst, dniYaVistosEnInstitucion) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  Logger.log(`   📄 Headers fila 1: ${headers.slice(0, 10).join(" | ")}...`);
  
  const mesesExpandidos = [
    "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", 
    "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];
  
  let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1, idxTelefono = -1;
  let idxInsc = -1, idxInscMetodo = -1, idxInscTalonario = -1;
  
  const idxCuota = {}, idxCuotaMetodo = {}, idxCuotaTalonario = {};
  const idxSeguro = {}, idxSeguroMetodo = {}, idxSeguroTalonario = {};
  
  // BÚSQUEDA DE HEADERS
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    
    if (h.includes("ITEM")) idxItem = i;
    else if (h === "APELLIDO") idxApellido = i;
    else if (h === "NOMBRES") idxNombres = i;
    else if (h === "DNI") idxDNI = i;
    else if (h === "TELEFONO") idxTelefono = i;
    else if (h === "INSCRIPCION") {
      idxInsc = i;
      Logger.log(`   ✅ INSCRIPCION en índice ${i}`);
    }
    
    for (let mes of mesesExpandidos) {
      if (h === `CUOTA - ${mes}` || h === `CUOTA ${mes}`) {
        idxCuota[mes] = i;
      }
      if (h === `SEGURO - ${mes}` || h === `SEGURO ${mes}`) {
        idxSeguro[mes] = i;
      }
    }
  }
  
  // Buscar METODO y TALONARIO
  if (idxInsc >= 0) {
    for (let i = idxInsc + 1; i < Math.min(idxInsc + 5, headers.length); i++) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "METODO") idxInscMetodo = i;
      else if (h === "TALONARIO") idxInscTalonario = i;
    }
  }
  
  for (let mes in idxCuota) {
    const idx = idxCuota[mes];
    for (let i = idx + 1; i < Math.min(idx + 5, headers.length); i++) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "METODO") idxCuotaMetodo[mes] = i;
      else if (h === "TALONARIO") idxCuotaTalonario[mes] = i;
    }
  }
  
  for (let mes in idxSeguro) {
    const idx = idxSeguro[mes];
    for (let i = idx + 1; i < Math.min(idx + 5, headers.length); i++) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "METODO") idxSeguroMetodo[mes] = i;
      else if (h === "TALONARIO") idxSeguroTalonario[mes] = i;
    }
  }
  
  Logger.log(`   📊 CUOTAS encontradas: ${Object.keys(idxCuota).join(", ")}`);
  Logger.log(`   📊 SEGUROS encontrados: ${Object.keys(idxSeguro).join(", ")}`);
  
  let procesados = 0;
  let conConceptos = 0;
  let duplicadosRechazados = 0; // ✅ CONTAR DUPLICADOS
  
  // PROCESAR FILAS
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    const numeroFila = r + 1;
    
    let dniRaw = String(fila[idxDNI] || "").replace(/\./g, "").trim();
    const apellido = String(fila[idxApellido] || "").trim();
    const nombre = String(fila[idxNombres] || "").trim();
    const telefono = String(fila[idxTelefono] || "").trim().substring(0, 20);
    
    if (!apellido || !nombre) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido || "(VACÍO)",
        nombres: nombre || "(VACÍO)",
        motivo: "APELLIDO o NOMBRES VACÍO"
      });
      continue;
    }
    
    if (!dniRaw || dniRaw === "00000000") {
      dniRaw = generarDNISinDuplicados("", datosInst.todosLosEstudiantes, instId);
      if (!dniRaw) {
        SKIPPED_DETAILS.push({
          hoja: nombreHoja,
          fila: numeroFila,
          dni: "(GENERADO FALLA)",
          apellido: apellido,
          nombres: nombre,
          motivo: "Rango DNI agotado"
        });
        continue;
      }
    }
    
    // ✅ VALIDACIÓN: DNI ÚNICO POR INSTITUCIÓN
    if (dniYaVistosEnInstitucion[dniRaw]) {
      duplicadosRechazados++;
      Logger.log(`   ⚠️ DNI DUPLICADO RECHAZADO: ${dniRaw} en ${nombreHoja} (ya registrado en otra carrera)`);
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido,
        nombres: nombre,
        motivo: `DNI DUPLICADO (ya en otra carrera de INST ${instId})`
      });
      continue; // ✅ SALTAR este registro
    }
    
    // ✅ MARCAR DNI COMO VISTO EN ESTA INSTITUCIÓN
    dniYaVistosEnInstitucion[dniRaw] = {
      carrera: carreraId,
      nombres: nombre,
      apellido: apellido,
      fila: numeroFila,
      hoja: nombreHoja
    };
    
    if (String(dniRaw).length > 20) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido,
        nombres: nombre,
        motivo: "DNI > 20 caracteres"
      });
      continue;
    }
    
    procesados++;
    
    const conceptosPagados = [];
    
    // INSCRIPCION
    const montoPagadoInsc = parseInt(fila[idxInsc]) || 0;
    if (montoPagadoInsc > 0) {
      const metodoInsc = String(fila[idxInscMetodo] || "EFECTIVO").trim().toUpperCase();
      const talonarioInsc = String(fila[idxInscTalonario] || "").trim();
      
      conceptosPagados.push({
        tipo: "INSCRIPCION",
        mes: null,
        montoPagado: montoPagadoInsc,
        metodo: metodoInsc,
        talonario: talonarioInsc
      });
    }
    
    // CUOTAS
    for (let mes in idxCuota) {
      const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
      if (montoPagado > 0) {
        const metodoCuota = String(fila[idxCuotaMetodo[mes]] || "EFECTIVO").trim().toUpperCase();
        const talonarioCuota = String(fila[idxCuotaTalonario[mes]] || "").trim();
        
        conceptosPagados.push({
          tipo: "CUOTA",
          mes: mes,
          montoPagado: montoPagado,
          metodo: metodoCuota,
          talonario: talonarioCuota
        });
      }
    }
    
    // SEGUROS
    for (let mes in idxSeguro) {
      const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
      if (montoPagado > 0) {
        const metodoSeguro = String(fila[idxSeguroMetodo[mes]] || "EFECTIVO").trim().toUpperCase();
        const talonarioSeguro = String(fila[idxSeguroTalonario[mes]] || "").trim();
        
        conceptosPagados.push({
          tipo: "SEGURO",
          mes: mes,
          montoPagado: montoPagado,
          metodo: metodoSeguro,
          talonario: talonarioSeguro
        });
      }
    }
    
    // AGREGAR ESTUDIANTE
    const estudiante = {
      dni: dniRaw,
      apellido: apellido,
      nombres: nombre,
      telefono: telefono,
      carrera_id: carreraId,
      item: fila[idxItem] || "",
      conceptos: conceptosPagados
    };
    
    datosInst.todosLosEstudiantes[dniRaw] = estudiante; // ✅ SIN DUPLICAR
    
    if (conceptosPagados.length > 0) {
      conConceptos++;
      datosInst.estudiantesConPagos[dniRaw] = estudiante; // ✅ SIN DUPLICAR
    }
  }
  
  Logger.log(`   📊 Total: ${procesados}, Con pagos: ${conConceptos}, Duplicados rechazados: ${duplicadosRechazados}`);
}

// ==================== EXPORTAR PARA USAR EN SCRIPT ====================
// COPIAR ESTA FUNCIÓN Y LA FUNCIÓN procesarHojaCobranzaConValidacionDNI
// AL SCRIPT EXISTENTE, REEMPLAZANDO LA FUNCIÓN procesarHojaCobranza()
