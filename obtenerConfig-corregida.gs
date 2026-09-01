function obtenerConfig(ss) {
  Logger.log("🔍 Buscando hoja CONFIG...");
  
  let configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) {
    const hojas = ss.getSheets();
    for (let h of hojas) {
      if (h.getName().toUpperCase() === "CONFIG") {
        configSheet = h;
        break;
      }
    }
  }
  
  if (!configSheet) {
    const nombresHojas = ss.getSheets().map(h => h.getName()).join(", ");
    throw new Error(`❌ Hoja CONFIG no encontrada. Hojas disponibles: ${nombresHojas}`);
  }
  
  Logger.log("✅ Hoja CONFIG encontrada");
  
  const data = configSheet.getDataRange().getValues();
  Logger.log(`📋 Datos de CONFIG: ${data.length} filas`);
  
  const config = {};
  
  // Debug: mostrar todas las filas
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    Logger.log(`   Fila ${i}: [${data[i][0]}] = [${data[i][1]}]`);
  }
  
  // Parsear config
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    const clave = String(row[0]).trim().toUpperCase();
    const valor = String(row[1]).trim();
    
    if (!valor) continue;
    
    Logger.log(`   Procesando: "${clave}" = "${valor}"`);
    
    if (clave === "SUPABASE_URL") {
      config.supabaseUrl = valor;
      Logger.log(`   ✅ supabaseUrl = ${valor}`);
    } else if (clave === "SUPABASE_KEY") {
      config.supabaseKey = valor;
      Logger.log(`   ✅ supabaseKey configurada`);
    } else if (clave === "INSTITUCION_ID") {
      config.institucionId = parseInt(valor);
      Logger.log(`   ✅ institucionId = ${valor}`);
    }
  }
  
  Logger.log(`\n🔍 CONFIG FINAL:`);
  Logger.log(`   supabaseUrl: ${config.supabaseUrl || "❌ NO ENCONTRADA"}`);
  Logger.log(`   supabaseKey: ${config.supabaseKey ? "✅ Configurada" : "❌ NO ENCONTRADA"}`);
  Logger.log(`   institucionId: ${config.institucionId || "❌ NO ENCONTRADA"}`);
  
  if (!config.supabaseUrl) throw new Error("❌ SUPABASE_URL no encontrada en CONFIG");
  if (!config.supabaseKey) throw new Error("❌ SUPABASE_KEY no encontrada en CONFIG");
  if (!config.institucionId) throw new Error("❌ INSTITUCION_ID no encontrada en CONFIG");
  
  return config;
}
