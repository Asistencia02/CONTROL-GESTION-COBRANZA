import pandas as pd
from io import StringIO

# Leer el CSV que compartiste (primeras líneas como ejemplo)
csv_text = """HOJA,DNI,APELLIDO,NOMBRES,CONCEPTO_TIPO,CONCEPTO_MES,MONTO,CELDA_VALOR
INICIAL2026,1,ACOSTA OJEDA,AITANA DENISE,INSCRIPCION,,10000,10000
INICIAL2026,1,ACOSTA OJEDA,AITANA DENISE,SEGURO,MARZO,1500,1500
INICIAL2026,1,ACOSTA OJEDA,AITANA DENISE,SEGURO,ABRIL,1500,1500"""

# Cargar desde archivo completo
df = pd.read_csv('/dev/stdin', encoding='utf-8')

print("=" * 80)
print("ANÁLISIS DEL AUDIT - DETECTAR DUPLICADOS Y ERRORES")
print("=" * 80)

# 1. CONTAR POR INSTITUCIÓN
print("\n1️⃣ TOTALES POR INSTITUCIÓN:")
print(df.groupby('HOJA')['MONTO'].agg(['count', 'sum']).to_string())

# 2. VERIFICAR DUPLICADOS EXACTOS
print("\n\n2️⃣ DUPLICADOS (mismo DNI + concepto + mes):")
duplicados = df[df.duplicated(subset=['DNI', 'CONCEPTO_TIPO', 'CONCEPTO_MES'], keep=False)]
if len(duplicados) > 0:
    print(f"⚠️  Encontrados {len(duplicados)} registros duplicados:")
    print(duplicados[['HOJA', 'DNI', 'NOMBRES', 'CONCEPTO_TIPO', 'CONCEPTO_MES', 'MONTO']].to_string())
else:
    print("✅ No hay duplicados exactos")

# 3. VERIFICAR MONTOS INCONSISTENTES
print("\n\n3️⃣ MONTOS SOSPECHOSOS (muy bajos o muy altos):")
sospechosos = df[(df['MONTO'] < 1000) | (df['MONTO'] > 50000)]
print(f"Total: {len(sospechosos)} registros")
print(sospechosos[['HOJA', 'DNI', 'NOMBRES', 'CONCEPTO_TIPO', 'MONTO']].head(20).to_string())

# 4. ANÁLISIS POR INSTITUCIÓN Y CONCEPTO
print("\n\n4️⃣ DESGLOSE: Institución + Concepto")
resumen = df.groupby(['HOJA', 'CONCEPTO_TIPO'])['MONTO'].agg(['count', 'sum']).reset_index()
resumen.columns = ['INSTITUCIÓN', 'TIPO', 'CANTIDAD', 'TOTAL']
print(resumen.to_string())

# 5. ESTUDIANTES ÚNICOS POR INSTITUCIÓN
print("\n\n5️⃣ ESTUDIANTES ÚNICOS POR INSTITUCIÓN:")
estudiantes = df.groupby('HOJA')['DNI'].nunique()
print(estudiantes.to_string())

# 6. MONTO ESPERADO vs REAL
print("\n\n6️⃣ ANÁLISIS: Si hay 347 en Primaria (aprox):")
primaria = df[df['HOJA'] == 'PRIMARIA2026']
print(f"Registros totales Primaria: {len(primaria)}")
print(f"Estudiantes únicos: {primaria['DNI'].nunique()}")
print(f"Monto total reportado: ${primaria['MONTO'].sum():,}")
print(f"Monto promedio/estudiante: ${primaria['MONTO'].sum() / primaria['DNI'].nunique():,.0f}")

# 7. DETECTAR SI HAY CUOTAS REPETIDAS POR MES
print("\n\n7️⃣ CUOTAS POR ESTUDIANTE (detectar si se repiten):")
cuotas_dup = df[(df['CONCEPTO_TIPO'] == 'CUOTA')].groupby(['HOJA', 'DNI', 'CONCEPTO_MES']).size()
cuotas_mult = cuotas_dup[cuotas_dup > 1]
if len(cuotas_mult) > 0:
    print(f"⚠️  ALERTA: {len(cuotas_mult)} cuotas contadas MÚLTIPLES VECES:")
    print(cuotas_mult.to_string())
else:
    print("✅ Sin cuotas duplicadas por mes")

print("\n" + "=" * 80)
