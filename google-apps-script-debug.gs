// ==================== GOOGLE APPS SCRIPT - FULL AUTO v2.9 - DEBUG ====================
// VERSIÓN DE PRUEBA PARA IDENTIFICAR EL PROBLEMA

const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";

// ==================== FUNCIÓN HTTP - VERSIÓN DEBUG ====================

function doPost(e) {
  try {
    Logger.log("📍 doPost LLAMADO");
    Logger.log("Request body: " + e.postData.contents);
    
    const resultado = {
      exito: true,
      mensaje: "DEBUG: doPost funcionando",
      timestamp: new Date().toISOString(),
      test: "OK"
    };
    
    Logger.log("📤 Devolviendo: " + JSON.stringify(resultado));
    
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("❌ ERROR en doPost: " + error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        exito: false, 
        mensaje: "ERROR: " + error.toString(),
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    Logger.log("📍 doGet LLAMADO");
    
    const resultado = {
      exito: true,
      mensaje: "DEBUG: doGet funcionando",
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("❌ ERROR en doGet: " + error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        exito: false, 
        mensaje: "ERROR: " + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== FUNCIÓN MANUAL DE PRUEBA ====================

function testDesdeTuConsola() {
  Logger.log("🧪 TEST INICIADO");
  
  const resultado = {
    exito: true,
    mensaje: "TEST OK",
    timestamp: new Date().toISOString(),
    data: {
      estudiantesInsertados: 10,
      pagosInscInsertados: 5
    }
  };
  
  Logger.log("Resultado: " + JSON.stringify(resultado));
}

// ==================== FUNCIÓN HTTP CON LOGS ====================

function ejecutarFullAutoHTTP() {
  try {
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 FULL AUTO INICIADO VÍA HTTP");
    Logger.log("=".repeat(70));
    
    // TEST simple
    const resultado = {
      exito: true,
      mensaje: "Sincronización completada",
      data: {
        estudiantesInsertados: 100,
        pagosInscInsertados: 50,
        pagosCuotaInsertados: 200,
        pagosSeguroInsertados: 75
      }
    };
    
    Logger.log("✅ RESULTADO: " + JSON.stringify(resultado));
    return resultado;
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    return { 
      exito: false, 
      mensaje: error.toString() 
    };
  }
}
