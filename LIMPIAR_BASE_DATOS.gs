/**
 * ========================================================================
 * SCRIPT DE LIMPIEZA - TRUNCAR TABLAS DE PAGOS
 * ========================================================================
 * 
 * Este script ELIMINA COMPLETAMENTE:
 * - Todos los registros de pago_detalles
 * - Todos los registros de pagos
 * 
 * ⚠️  DESTRUCTIVO - No se puede deshacer
 * 
 * ========================================================================
 */

const CONFIG_LIMPIEZA = {
  supabaseUrl: "https://xyzabc.supabase.co", // ← CAMBIAR
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // ← CAMBIAR
};

/**
 * FUNCIÓN PRINCIPAL - LIMPIAR TODO
 */
function limpiarBaseDatos() {
  try {
    Logger.log("=" * 80);
    Logger.log("🗑️  INICIANDO LIMPIEZA DE BASE DE DATOS");
    Logger.log("=" * 80);
    Logger.log("");
    Logger.log("⚠️  ADVERTENCIA: Esta operación es DESTRUCTIVA");
    Logger.log("    Se eliminarán TODOS los registros de:");
    Logger.log("    - pago_detalles");
    Logger.log("    - pagos");
    Logger.log("");
    Logger.log("Continuando en 3 segundos...\n");
    
    Utilities.sleep(3000);
    
    // PASO 1: Eliminar pago_detalles
    Logger.log("📋 PASO 1: Truncando pago_detalles...");
    const respDetalles = UrlFetchApp.fetch(
      `${CONFIG_LIMPIEZA.supabaseUrl}/rest/v1/pago_detalles`,
      {
        method: "delete",
        headers: {
          "apikey": CONFIG_LIMPIEZA.supabaseKey,
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CONFIG_LIMPIEZA.supabaseKey}`
        },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    const codeDetalles = respDetalles.getResponseCode();
    Logger.log(`   Respuesta: ${codeDetalles}`);
    
    if (codeDetalles === 204 || codeDetalles === 200) {
      Logger.log("   ✅ pago_detalles eliminados");
    } else {
      Logger.log(`   ❌ ERROR: ${respDetalles.getContentText()}`);
      return false;
    }
    
    Utilities.sleep(2000);
    
    // PASO 2: Eliminar pagos
    Logger.log("📋 PASO 2: Truncando pagos...");
    const respPagos = UrlFetchApp.fetch(
      `${CONFIG_LIMPIEZA.supabaseUrl}/rest/v1/pagos`,
      {
        method: "delete",
        headers: {
          "apikey": CONFIG_LIMPIEZA.supabaseKey,
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CONFIG_LIMPIEZA.supabaseKey}`
        },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    const codePagos = respPagos.getResponseCode();
    Logger.log(`   Respuesta: ${codePagos}`);
    
    if (codePagos === 204 || codePagos === 200) {
      Logger.log("   ✅ pagos eliminados");
    } else {
      Logger.log(`   ❌ ERROR: ${respPagos.getContentText()}`);
      return false;
    }
    
    Utilities.sleep(2000);
    
    // PASO 3: Verificar que está vacío
    Logger.log("📋 PASO 3: Verificando estado...");
    const verifyPagos = UrlFetchApp.fetch(
      `${CONFIG_LIMPIEZA.supabaseUrl}/rest/v1/pagos?select=count()`,
      {
        method: "get",
        headers: {
          "apikey": CONFIG_LIMPIEZA.supabaseKey,
          "Content-Type": "application/json"
        },
        muteHttpExceptions: true,
        timeout: 30
      }
    );
    
    if (verifyPagos.getResponseCode() === 200) {
      const countPagos = JSON.parse(verifyPagos.getContentText())[0];
      Logger.log(`   Pagos en BD: ${countPagos.count}`);
    }
    
    const verifyDetalles = UrlFetchApp.fetch(
      `${CONFIG_LIMPIEZA.supabaseUrl}/rest/v1/pago_detalles?select=count()`,
      {
        method: "get",
        headers: {
          "apikey": CONFIG_LIMPIEZA.supabaseKey,
          "Content-Type": "application/json"
        },
        muteHttpExceptions: true,
        timeout: 30
      }
    );
    
    if (verifyDetalles.getResponseCode() === 200) {
      const countDetalles = JSON.parse(verifyDetalles.getContentText())[0];
      Logger.log(`   Detalles en BD: ${countDetalles.count}`);
    }
    
    Logger.log("");
    Logger.log("=" * 80);
    Logger.log("✅ LIMPIEZA COMPLETADA CON ÉXITO");
    Logger.log("=" * 80);
    Logger.log("");
    Logger.log("La base de datos está lista para reprocesar desde cero.");
    Logger.log("Próximo paso: Ejecutar procesarPagosMultiplesV3Final()");
    Logger.log("");
    
    return true;
    
  } catch (e) {
    Logger.log(`❌ ERROR CRÍTICO: ${e}`);
    Logger.log(`   Stack: ${e.stack}`);
    return false;
  }
}

/**
 * FUNCIÓN ALTERNATIVA - Limpieza SQL (si tienes acceso directo)
 * 
 * Ejecuta esto en SQL Editor de Supabase:
 * 
 * -- Truncar y resetear secuencias
 * TRUNCATE TABLE pago_detalles CASCADE;
 * TRUNCATE TABLE pagos CASCADE;
 * 
 * -- Resetear auto-increment
 * ALTER SEQUENCE pago_detalles_id_seq RESTART WITH 1;
 * ALTER SEQUENCE pagos_id_seq RESTART WITH 1;
 */

function mostrarSQLAlternativo() {
  Logger.log("=" * 80);
  Logger.log("🔧 SQL ALTERNATIVA PARA LIMPIAR DIRECTAMENTE EN SUPABASE");
  Logger.log("=" * 80);
  Logger.log("");
  Logger.log("Ve a: Supabase → SQL Editor → Nueva query");
  Logger.log("");
  Logger.log("Copia esto:");
  Logger.log("");
  Logger.log("-- Truncar tablas");
  Logger.log("TRUNCATE TABLE pago_detalles CASCADE;");
  Logger.log("TRUNCATE TABLE pagos CASCADE;");
  Logger.log("");
  Logger.log("-- Resetear secuencias (auto-increment)");
  Logger.log("ALTER SEQUENCE pago_detalles_id_seq RESTART WITH 1;");
  Logger.log("ALTER SEQUENCE pagos_id_seq RESTART WITH 1;");
  Logger.log("");
  Logger.log("Luego: RUN");
  Logger.log("");
  Logger.log("=" * 80);
}
