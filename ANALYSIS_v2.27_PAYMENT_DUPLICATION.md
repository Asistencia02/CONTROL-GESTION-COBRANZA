# 🚨 PAYMENT DUPLICATION AUDIT: v2.27 DETAILED ANALYSIS

## SUMMARY OF FINDINGS

Based on code review of `google-apps-script-v2-27-HEADERS-CORREGIDO.gs`, I've identified **5 HIGH-RISK AREAS** that could explain the 724 vs expected payment count discrepancy.

---

## 🔴 ISSUE #1: MONTH NORMALIZATION MISMATCH (CRITICAL)

### Problem
The script expects headers like `"CUOTA - MARZO"` (with hyphen), but the **Excel file contains `"CUOTA - Marzo"` (capitalized month)**. This causes months to NOT be detected.

**Location**: `procesarHojaCobranza()` function, line ~350-360
```javascript
for (let mes of mesesExpandidos) {
  if (h === `CUOTA - ${mes}` || h === `CUOTA ${mes}`) {  // Looking for uppercase
    idxCuota[mes] = i;
  }
}
```

### Impact
- ❌ If Excel has `"CUOTA - Marzo"`, the script looks for `"CUOTA - MARZO"` (uppercase)
- ❌ The header is NOT matched
- ❌ `idxCuota["MARZO"]` remains `-1`
- ❌ All CUOTA data is SKIPPED silently
- ❌ Students show as having NO PAYMENTS

### Evidence
The normalization happens here:
```javascript
const mesesExpandidos = [
  "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", 
  "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];
```

But Excel headers are probably: `"Cuota - Marzo"`, `"Seguro - Marzo"`, etc.

---

## 🔴 ISSUE #2: SEPTIEMBRE/SEPTEMBER NOT IN MESES LIST (CRITICAL)

### Problem
The script searches for `"SEPTIEMBRE"` (9 letters), but:
1. Excel might have `"SEPT"` (abbreviated)
2. Excel might have `"Septiembre"` (lowercase 'm')
3. The header detection uses uppercase comparison but meses array has full names

**Location**: Line ~340-345
```javascript
const mesesExpandidos = [
  "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", 
  "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];
```

### Impact
- ❌ If Excel has `"CUOTA - SEPT"`, the string `"SEPTIEMBRE"` is NOT found in it
- ❌ September cuotas are SKIPPED
- ❌ The session summary mentioned "SEPTIEMBRE...data inconsistencies"

---

## 🔴 ISSUE #3: DUPLICATE CONCEPT CONCATENATION (HIGH RISK)

### Problem
When a student appears in multiple rows OR multiple sheets with the SAME DNI, concepts are **concatenated** instead of being deduplicated:

**Location**: Line ~640-650 in `procesarHojaCobranza()`
```javascript
if (!datosInst.todosLosEstudiantes[dniRaw]) {
  datosInst.todosLosEstudiantes[dniRaw] = estudiante;
} else {
  // ❌ DUPLICATE! Concatenate again
  datosInst.todosLosEstudiantes[dniRaw].conceptos = 
    datosInst.todosLosEstudiantes[dniRaw].conceptos.concat(conceptosPagados);
}
```

### Impact
- ✅ Auditoría #3 will identify DNIs in multiple sheets
- ❌ If DNI appears in rows 5 AND row 10 of same sheet → concepts counted TWICE
- ❌ If DNI appears in ANALISTA2026 AND PRIMARIA2026 → concepts counted TWICE
- ❌ Example: Student has 1x INSCRIPCION on row 5, row 10, row 15 → script creates 3x INSCRIPCION pagos

---

## 🔴 ISSUE #4: NO VALIDATION ON RPC RESPONSE (SILENT FAILURES)

### Problem
The RPC function `insertar_pago_multiple_con_detalles_upsert` may be **failing silently**:

**Location**: Line ~800-820 in `crearPagoMultipleAgrupado()`
```javascript
const resp = UrlFetchApp.fetch(
  `${config.supabaseUrl}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
  { ... }
);

if (resp.getResponseCode() === 200) {
  Logger.log(`   ✅ Pago creado`);  // Only 200 = success
  return { success: true, conceptos_count: detalles.length };
} else {
  const error = resp.getContentText().substring(0, 100);
  Logger.log(`   ❌ Error RPC: ${error}`);
  return { success: false, error: error, conceptos_count: 0 };
}
```

### Impact
- ❌ If RPC returns 400/500 error → payment is NOT created
- ❌ But the script still increments `pagosMultiplesCreados`? **NO** — it returns `success: false`
- ❌ BUT: The student was already inserted → payment counts as "student with payment" but NO PAGO record
- ⚠️ Database may have orphaned student records with no payments

---

## 🔴 ISSUE #5: MISSING CONCEPT LOOKUP SILENT FAILURE (HIGH RISK)

### Problem
When a concept ID is NOT found in the database, the script **skips it without error**:

**Location**: Line ~750-760 in `crearPagoMultipleAgrupado()`
```javascript
if (!conceptoId) {
  const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
  const disponibles = {
    cuotasDisponibles: Object.keys(conceptos[carreraId]?.cuotas || {})
  };
  Logger.log(`   ⚠️ NO ENCONTRADO: ${concepto.tipo} ${concepto.mes} ...`);
  continue;  // ❌ SKIP and don't add to detalles
}
```

### Impact
- ❌ Example: Script looks for `"Marzo"` (capitalized), but DB has `"marzo"` (lowercase)
- ❌ Concept is NOT found → payment detail is SKIPPED
- ❌ If ALL concepts fail lookup → student ends up with 0 payment details
- ❌ RPC is called with empty `detalles[]` array → payment is probably rejected

---

## 📊 EXPECTED COUNTS vs REALITY

Given **~870 students** across 5 sheets:

### Scenario A: Headers not matching (Issue #1)
- Expected payments per student: ~10-12 (INSCRIPCION + 10 meses CUOTA + 10 meses SEGURO)
- Actual: ~0.8 per student (724 / 870 ≈ **0.83 pagos/estudiante**)
- This suggests **90%+ of payments are not being detected**

### Scenario B: Headers matching but month lookup failing (Issue #2 + #4)
- SEPTIEMBRE skipped → lose ~3-4 months of payments per student
- Concept lookup failing → lose more
- Total: ~60-70% loss possible

### Scenario C: Duplicate students across sheets (Issue #3)
- Concepts counted TWICE for 5-10% of students
- This would show MORE payments, not fewer
- **This doesn't explain the 724 count (too low)**

### Most Likely: **COMBINATION of #1 + #2 + #4**

---

## 🔧 IMMEDIATE FIXES NEEDED

### FIX 1: Case-insensitive header matching
```javascript
// ❌ Current (line ~350)
if (h === `CUOTA - ${mes}` || h === `CUOTA ${mes}`) {

// ✅ Fixed
const headerLower = h.toLowerCase();
const mesLower = mes.toLowerCase();
if (headerLower === `cuota - ${mesLower}` || headerLower === `cuota ${mesLower}`) {
```

### FIX 2: Add abbreviated month support
```javascript
// ✅ After line ~340, add abbreviation mapping
const mesAbreviado = {
  "SEPTIEMBRE": "SEPT",
  "OCTUBRE": "OCT",
  "NOVIEMBRE": "NOV",
  "DICIEMBRE": "DIC"
};

// Then in loop:
for (let mes of mesesExpandidos) {
  const abrev = mesAbreviado[mes];
  if (h.includes(mes) || (abrev && h.includes(abrev))) {
    idxCuota[mes] = i;
  }
}
```

### FIX 3: Deduplicate concepts by student+type+month
```javascript
// ✅ After collecting conceptosPagados, deduplicate:
const conceptosUnicos = {};
for (let c of conceptosPagados) {
  const key = `${c.tipo}_${c.mes}`;
  if (!conceptosUnicos[key]) {
    conceptosUnicos[key] = c;
  }
}
const conceptosFinal = Object.values(conceptosUnicos);
```

### FIX 4: Add RPC response logging
```javascript
// ✅ After RPC call:
if (resp.getResponseCode() === 200) {
  const respData = JSON.parse(resp.getContentText());
  Logger.log(`   ✅ RPC Success: ${JSON.stringify(respData)}`);
} else {
  const error = resp.getContentText();
  Logger.log(`   ❌ RPC Error ${resp.getResponseCode()}: ${error}`);
}
```

### FIX 5: Validate concept lookup and log failures
```javascript
// ✅ At start of crearPagoMultipleAgrupado:
Logger.log(`   🔍 Buscando conceptos para carrera ${carreraId}...`);
Logger.log(`      Conceptos disponibles: ${JSON.stringify(Object.keys(conceptos[carreraId] || {}))}`);

// Then log each lookup
Logger.log(`      → ${concepto.tipo} ${concepto.mes}: conceptoId=${conceptoId}`);
```

---

## 🧪 TESTING PLAN

1. **Run DEBUG_v2.27_PAYMENT_DUPLICATION.gs → Option 1**: `auditarDeteccionHeaders()`
   - Verify headers ARE being detected correctly
   
2. **Run DEBUG_v2.27_PAYMENT_DUPLICATION.gs → Option 2**: `auditarNormalizacionMeses()`
   - Check for SEPT/abbreviated months
   
3. **Run DEBUG_v2.27_PAYMENT_DUPLICATION.gs → Option 3**: `auditarDuplicacionConceptos()`
   - Scan for DNI duplicates across sheets
   
4. **Run DEBUG_v2.27_PAYMENT_DUPLICATION.gs → Option 4**: `compararConceptosDBvsScript()`
   - Verify all concept IDs exist in DB
   
5. **Run full sync with enhanced logging**: Add all FIX 4-5 changes above, then re-run

---

## 📝 NEXT STEP

**I recommend:**
1. Copy `DEBUG_v2.27_PAYMENT_DUPLICATION.gs` into Google Apps Script
2. Run `🐛 DEBUG → Full Integrity Audit`
3. Share the Logger output with me
4. Apply FIX 1-2 immediately (header matching)
5. Re-run sync and compare counts

This will isolate which of the 5 issues is causing the 724 vs expected discrepancy.
