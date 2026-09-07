import pandas as pd
import json

# Leer CSV
df = pd.read_csv("SYNC_NORMALIZADO_INSM_2026 - AUDIT_CONCEPTOS_GRABADOS (2).csv")

print("=" * 90)
print("ANÁLISIS DETALLADO: AUDIT_CONCEPTOS_GRABADOS")
print("=" * 90)

print(f"\nTotal de filas: {len(df)}")
print(f"Columnas: {df.columns.tolist()}")

# Mapeo de HOJA a institución y carrera
MAPEO_HOJAS = {
    "ANALISTA2026": {"institucion_id": 1, "institucion": "ISIPP", "carrera_id": 1, "carrera": "Analista en Sistemas"},
    "HIGIENE2026": {"institucion_id": 1, "institucion": "ISIPP", "carrera_id": 3, "carrera": "Seguridad e Higiene"},
    "INICIAL2026": {"institucion_id": 2, "institucion": "MILAGROS", "carrera_id": 4, "carrera": "Nivel Inicial"},
    "PRIMARIA2026": {"institucion_id": 2, "institucion": "MILAGROS", "carrera_id": 5, "carrera": "Nivel Primaria"},
    "SECUNDARIA2026": {"institucion_id": 2, "institucion": "MILAGROS", "carrera_id": 6, "carrera": "Nivel Secundaria"},
}

# Agregar columnas de institución y carrera
df['INSTITUCION_ID'] = df['HOJA'].map(lambda x: MAPEO_HOJAS[x]['institucion_id'])
df['INSTITUCION'] = df['HOJA'].map(lambda x: MAPEO_HOJAS[x]['institucion'])
df['CARRERA_ID'] = df['HOJA'].map(lambda x: MAPEO_HOJAS[x]['carrera_id'])
df['CARRERA'] = df['HOJA'].map(lambda x: MAPEO_HOJAS[x]['carrera'])

print("\n" + "=" * 90)
print("RESUMEN POR INSTITUCIÓN Y CARRERA")
print("=" * 90)

for inst_id in sorted(df['INSTITUCION_ID'].unique()):
    df_inst = df[df['INSTITUCION_ID'] == inst_id]
    inst_name = df_inst['INSTITUCION'].iloc[0]
    
    print(f"\n🏫 {inst_name} (ID: {inst_id})")
    print(f"   Total registros: {len(df_inst)}")
    print(f"   Total monto: ${df_inst['MONTO'].sum():,.2f}")
    
    print(f"\n   Por CARRERA:")
    for carr_id in sorted(df_inst['CARRERA_ID'].unique()):
        df_carr = df_inst[df_inst['CARRERA_ID'] == carr_id]
        carr_name = df_carr['CARRERA'].iloc[0]
        estudiantes_unicos = df_carr['DNI'].nunique()
        
        print(f"\n     📚 {carr_name} (ID: {carr_id})")
        print(f"        Estudiantes únicos: {estudiantes_unicos}")
        print(f"        Registros totales: {len(df_carr)}")
        print(f"        Monto total: ${df_carr['MONTO'].sum():,.2f}")
        
        print(f"        Por tipo de concepto:")
        for tipo in sorted(df_carr['CONCEPTO_TIPO'].unique()):
            df_tipo = df_carr[df_carr['CONCEPTO_TIPO'] == tipo]
            registros = len(df_tipo)
            monto_total = df_tipo['MONTO'].sum()
            
            if tipo == "INSCRIPCION":
                # INSCRIPCION no tiene mes
                print(f"          {tipo}: {registros} registros × {registros//estudiantes_unicos if estudiantes_unicos > 0 else 0} por estudiante = ${monto_total:,.2f}")
            else:
                # CUOTA y SEGURO tienen mes
                meses = sorted([m for m in df_tipo['CONCEPTO_MES'].unique() if pd.notna(m)])
                print(f"          {tipo}: {len(meses)} meses ({', '.join(meses)}) = {registros} registros = ${monto_total:,.2f}")

print("\n" + "=" * 90)
print("DETALLE ESPECÍFICO MILAGROS")
print("=" * 90)

df_milagros = df[df['INSTITUCION_ID'] == 2]
print(f"\nMILAGROS - TOTAL: ${df_milagros['MONTO'].sum():,.2f}")

for carr_id in sorted(df_milagros['CARRERA_ID'].unique()):
    df_carr = df_milagros[df_milagros['CARRERA_ID'] == carr_id]
    carr_name = df_carr['CARRERA'].iloc[0]
    est_unicos = df_carr['DNI'].nunique()
    
    print(f"\n  {carr_name}: {est_unicos} estudiantes")
    
    insc_total = 0
    cuota_total = 0
    seguro_total = 0
    
    for tipo in df_carr['CONCEPTO_TIPO'].unique():
        df_tipo = df_carr[df_carr['CONCEPTO_TIPO'] == tipo]
        monto_total = df_tipo['MONTO'].sum()
        
        if tipo == "INSCRIPCION":
            insc_total = monto_total
            print(f"    INSCRIPCION: {est_unicos} × $10,000 = ${monto_total:,.2f}")
        elif tipo == "CUOTA":
            cuota_total = monto_total
            meses = len(df_tipo['CONCEPTO_MES'].unique())
            print(f"    CUOTA: {meses} meses × {est_unicos} est. = ${monto_total:,.2f}")
        elif tipo == "SEGURO":
            seguro_total = monto_total
            meses = len(df_tipo['CONCEPTO_MES'].unique())
            print(f"    SEGURO: {meses} meses × {est_unicos} est. = ${monto_total:,.2f}")
    
    subtotal = insc_total + cuota_total + seguro_total
    print(f"    SUBTOTAL: ${subtotal:,.2f}")

print("\n" + "=" * 90)
print("DETALLE ESPECÍFICO ISIPP")
print("=" * 90)

df_isipp = df[df['INSTITUCION_ID'] == 1]
print(f"\nISIPP - TOTAL: ${df_isipp['MONTO'].sum():,.2f}")

for carr_id in sorted(df_isipp['CARRERA_ID'].unique()):
    df_carr = df_isipp[df_isipp['CARRERA_ID'] == carr_id]
    carr_name = df_carr['CARRERA'].iloc[0]
    est_unicos = df_carr['DNI'].nunique()
    
    print(f"\n  {carr_name}: {est_unicos} estudiantes")
    
    insc_total = 0
    cuota_total = 0
    seguro_total = 0
    
    for tipo in df_carr['CONCEPTO_TIPO'].unique():
        df_tipo = df_carr[df_carr['CONCEPTO_TIPO'] == tipo]
        monto_total = df_tipo['MONTO'].sum()
        
        if tipo == "INSCRIPCION":
            insc_total = monto_total
            print(f"    INSCRIPCION: {est_unicos} × ${monto_total/est_unicos:,.0f} = ${monto_total:,.2f}")
        elif tipo == "CUOTA":
            cuota_total = monto_total
            meses = len(df_tipo['CONCEPTO_MES'].unique())
            print(f"    CUOTA: {meses} meses × {est_unicos} est. = ${monto_total:,.2f}")
        elif tipo == "SEGURO":
            seguro_total = monto_total
            meses = len(df_tipo['CONCEPTO_MES'].unique())
            print(f"    SEGURO: {meses} meses × {est_unicos} est. = ${monto_total:,.2f}")
    
    subtotal = insc_total + cuota_total + seguro_total
    print(f"    SUBTOTAL: ${subtotal:,.2f}")

print("\n" + "=" * 90)
print("COMPARATIVA: AUDIT vs BD ACTUAL")
print("=" * 90)

comparativa = [
    ("MILAGROS - INICIAL", 2, 4),
    ("MILAGROS - PRIMARIA", 2, 5),
    ("MILAGROS - SECUNDARIA", 2, 6),
    ("ISIPP - ANALISTA", 1, 1),
    ("ISIPP - HIGIENE", 1, 3),
]

bd_data = {
    (2, 4): {"INSCRIPCION": 279000, "CUOTA": 818500, "SEGURO": 94500},
    (2, 5): {"INSCRIPCION": 3364500, "CUOTA": 11188568, "SEGURO": 1202500},
    (2, 6): {"INSCRIPCION": 2104500, "CUOTA": 6576000, "SEGURO": 657100},
}

print("\nCarrera | Concepto | AUDIT | BD | Diferencia | %")
print("-" * 90)

for nombre, inst_id, carr_id in comparativa:
    df_carr = df[(df['INSTITUCION_ID'] == inst_id) & (df['CARRERA_ID'] == carr_id)]
    
    if len(df_carr) == 0:
        continue
    
    total_audit = df_carr['MONTO'].sum()
    
    if (inst_id, carr_id) in bd_data:
        total_bd = sum(bd_data[(inst_id, carr_id)].values())
        diferencia = total_bd - total_audit
        pct = (total_bd / total_audit * 100) if total_audit > 0 else 0
        print(f"{nombre:25} | {'TOTAL':12} | ${total_audit:>12,.0f} | ${total_bd:>12,.0f} | ${diferencia:>12,.0f} | {pct:>5.1f}%")
    else:
        print(f"{nombre:25} | {'TOTAL':12} | ${total_audit:>12,.0f} | {'NO DATA':>12} | {'N/A':>12} | N/A")

print("\n" + "=" * 90)
print("TOTALES GLOBALES")
print("=" * 90)

print(f"\nAUDIT ISIPP total: ${df_isipp['MONTO'].sum():,.2f}")
print(f"AUDIT MILAGROS total: ${df_milagros['MONTO'].sum():,.2f}")
print(f"AUDIT GRAND TOTAL: ${df['MONTO'].sum():,.2f}")

# Calcular totales esperados por carrera
print("\n" + "=" * 90)
print("RESUMEN ESPERADO SEGÚN AUDIT")
print("=" * 90)

resumen = {}
for _, row in df.iterrows():
    key = f"{row['INSTITUCION']}-{row['CARRERA']}"
    if key not in resumen:
        resumen[key] = {"monto": 0, "registros": 0, "estudiantes": set()}
    resumen[key]["monto"] += row['MONTO']
    resumen[key]["registros"] += 1
    resumen[key]["estudiantes"].add(row['DNI'])

for key in sorted(resumen.keys()):
    data = resumen[key]
    print(f"\n{key}: ${data['monto']:,.2f} ({data['registros']} registros, {len(data['estudiantes'])} estudiantes)")
