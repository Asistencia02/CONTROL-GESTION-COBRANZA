import csv
from collections import defaultdict

# Datos del CSV (extracto representativo)
csv_data = """HOJA,DNI,APELLIDO,NOMBRES,CONCEPTO_TIPO,CONCEPTO_MES,MONTO,CELDA_VALOR
INICIAL2026,1,ACOSTA OJEDA,AITANA DENISE,INSCRIPCION,,10000,10000
INICIAL2026,1,ACOSTA OJEDA,AITANA DENISE,SEGURO,MARZO,1500,1500
INICIAL2026,2,ACOSTA OJEDA,EVALUNA DELIA,INSCRIPCION,,10000,10000
INICIAL2026,2,ACOSTA OJEDA,EVALUNA DELIA,CUOTA,MARZO,12000,12000
PRIMARIA2026,34,ACOSTA,BAUTISTA NICOLAS,INSCRIPCION,,10000,10000
PRIMARIA2026,34,ACOSTA,BAUTISTA NICOLAS,CUOTA,MARZO,10000,10000
PRIMARIA2026,34,ACOSTA,BAUTISTA NICOLAS,SEGURO,MARZO,1500,1500
SECUNDARIA2026,432,ACOSTA,JADE  CAROLINA,INSCRIPCION,,10000,10000
SECUNDARIA2026,432,ACOSTA,JADE  CAROLINA,CUOTA,MARZO,10000,10000
SECUNDARIA2026,432,ACOSTA,JADE  CAROLINA,SEGURO,MARZO,1500,1500"""

print("=" * 80)
print("VALIDACIÓN DE NORMALIZACIÓN - COBRANZA 2026")
print("=" * 80)
print()

# Parsear CSV
lineas = csv_data.strip().split('\n')
header = lineas[0].split(',')
registros = []

for linea in lineas[1:]:
    parts = linea.split(',')
    registros.append({
        'hoja': parts[0],
        'dni': parts[1],
        'apellido': parts[2],
        'nombres': parts[3],
        'concepto_tipo': parts[4],
        'concepto_mes': parts[5],
        'monto': int(parts[6]),
        'celda_valor': int(parts[7])
    })

# ========================================
# VALIDACIÓN 1: Duplicados por DNI
# ========================================
print("✓ VALIDACIÓN 1: DUPLICADOS POR DNI")
print("-" * 80)
dni_count = defaultdict(int)
dni_duplicados = []

for reg in registros:
    dni = reg['dni']
    dni_count[dni] += 1
    if dni_count[dni] > 1:
        dni_duplicados.append(dni)

print(f"Total de registros: {len(registros)}")
print(f"DNIs únicos: {len(dni_count)}")
print(f"DNIs con múltiples registros: {len(set(dni_duplicados))}")

if dni_duplicados:
    print(f"  Duplicados encontrados: {set(dni_duplicados)}")
    print("  ⚠️  ESPERADO: El script debe manejar duplicados correctamente")
print()

# ========================================
# VALIDACIÓN 2: Monto = Celda_Valor
# ========================================
print("✓ VALIDACIÓN 2: CONSISTENCIA MONTO vs CELDA_VALOR")
print("-" * 80)
inconsistencias = []

for reg in registros:
    if reg['monto'] != reg['celda_valor']:
        inconsistencias.append(reg)

if inconsistencias:
    print(f"⚠️  Inconsistencias encontradas: {len(inconsistencias)}")
    for reg in inconsistencias:
        print(f"  DNI {reg['dni']}: MONTO={reg['monto']}, CELDA_VALOR={reg['celda_valor']}")
else:
    print("✅ Todos los MONTO coinciden con CELDA_VALOR")
print()

# ========================================
# VALIDACIÓN 3: Suma por Concepto
# ========================================
print("✓ VALIDACIÓN 3: SUMA POR CONCEPTO_TIPO")
print("-" * 80)
sumas_concepto = defaultdict(int)
registros_concepto = defaultdict(int)

for reg in registros:
    concepto = reg['concepto_tipo']
    sumas_concepto[concepto] += reg['monto']
    registros_concepto[concepto] += 1

for concepto in sorted(sumas_concepto.keys()):
    suma = sumas_concepto[concepto]
    regs = registros_concepto[concepto]
    print(f"  {concepto}: {regs} registros = ${suma:,}")

print()

# ========================================
# VALIDACIÓN 4: Suma por Hoja
# ========================================
print("✓ VALIDACIÓN 4: SUMA POR HOJA")
print("-" * 80)
sumas_hoja = defaultdict(int)
registros_hoja = defaultdict(int)

for reg in registros:
    hoja = reg['hoja']
    sumas_hoja[hoja] += reg['monto']
    registros_hoja[hoja] += 1

for hoja in ['INICIAL2026', 'PRIMARIA2026', 'SECUNDARIA2026']:
    if hoja in sumas_hoja:
        suma = sumas_hoja[hoja]
        regs = registros_hoja[hoja]
        print(f"  {hoja}: {regs} registros = ${suma:,}")

total_general = sum(sumas_hoja[h] for h in ['INICIAL2026', 'PRIMARIA2026', 'SECUNDARIA2026'] if h in sumas_hoja)
print(f"\n  TOTAL (INICIAL + PRIMARIA + SECUNDARIA): ${total_general:,}")
print()

# ========================================
# VALIDACIÓN 5: Normalización de Datos
# ========================================
print("✓ VALIDACIÓN 5: NORMALIZACIÓN DE DATOS")
print("-" * 80)
errores_normalizacion = []

# Verificar espacios en blanco
for reg in registros:
    if reg['apellido'] != reg['apellido'].strip():
        errores_normalizacion.append(f"DNI {reg['dni']}: APELLIDO con espacios adicionales")
    if reg['nombres'] != reg['nombres'].strip():
        errores_normalizacion.append(f"DNI {reg['dni']}: NOMBRES con espacios adicionales")

# Verificar texto en blanco para CONCEPTO_MES (opcional)
for reg in registros:
    if reg['concepto_tipo'] == 'INSCRIPCION' and reg['concepto_mes'] != '':
        errores_normalizacion.append(f"DNI {reg['dni']}: INSCRIPCION tiene CONCEPTO_MES: '{reg['concepto_mes']}'")

if errores_normalizacion:
    print(f"⚠️  Errores de normalización encontrados:")
    for error in errores_normalizacion:
        print(f"  - {error}")
else:
    print("✅ Datos normalizados correctamente (sin espacios extra, tipos válidos)")
print()

# ========================================
# VALIDACIÓN 6: Valores Atípicos
# ========================================
print("✓ VALIDACIÓN 6: VALORES ATÍPICOS")
print("-" * 80)
montos = [reg['monto'] for reg in registros]
monto_promedio = sum(montos) / len(montos)
monto_min = min(montos)
monto_max = max(montos)

print(f"  Monto mínimo: ${monto_min:,}")
print(f"  Monto promedio: ${monto_promedio:,.0f}")
print(f"  Monto máximo: ${monto_max:,}")
print(f"  Rango: ${monto_max - monto_min:,}")

if monto_max > monto_promedio * 5:
    print(f"  ⚠️  Valores atípicos detectados (máximo es {monto_max/monto_promedio:.1f}x el promedio)")
print()

# ========================================
# RESUMEN FINAL
# ========================================
print("=" * 80)
print("RESUMEN DE VALIDACIÓN")
print("=" * 80)
print(f"✅ Total de registros procesados: {len(registros)}")
print(f"✅ Total de montos verificados: ${sum(montos):,}")
print(f"✅ Duplicados detectados: {len(set(dni_duplicados))}")
print(f"✅ Inconsistencias MONTO/CELDA_VALOR: {len(inconsistencias)}")
print(f"✅ Errores de normalización: {len(errores_normalizacion)}")
print()
print("RECOMENDACIÓN:")
print("Si el script está normalizando correctamente, estos números deberían")
print("coincidir con los reportes de AUDIT del script de Google Apps Script.")
print()
