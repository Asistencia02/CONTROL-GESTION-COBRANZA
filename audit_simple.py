import pandas as pd

df = pd.read_csv('SYNC_NORMALIZADO_INSM_2026 - AUDIT_CONCEPTOS_GRABADOS (2).csv')

MAPEO = {
    'ANALISTA2026': {'inst': 1},
    'HIGIENE2026': {'inst': 1},
    'INICIAL2026': {'inst': 2},
    'PRIMARIA2026': {'inst': 2},
    'SECUNDARIA2026': {'inst': 2},
}

df['inst'] = df['HOJA'].map(lambda x: MAPEO.get(x, {}).get('inst', 0))

print("\nAUDIT ANALISIS")
print("="*80)

for inst_id in [1, 2]:
    df_inst = df[df['inst'] == inst_id]
    if len(df_inst) == 0:
        continue
    
    inst_name = 'ISIPP' if inst_id == 1 else 'MILAGROS'
    print(f"\n{inst_name} (institucion {inst_id})")
    print(f"  Total: {df_inst['MONTO'].sum():,.0f}")
    
    hojas_unicas = df_inst['HOJA'].unique()
    for hoja in sorted(hojas_unicas):
        df_hoja = df_inst[df_inst['HOJA'] == hoja]
        estudiantes = df_hoja['DNI'].nunique()
        total = df_hoja['MONTO'].sum()
        registros = len(df_hoja)
        
        print(f"\n  {hoja}: {estudiantes} estudiantes, {registros} registros, Total {total:,.0f}")
        
        for tipo in sorted(df_hoja['CONCEPTO_TIPO'].unique()):
            df_tipo = df_hoja[df_hoja['CONCEPTO_TIPO'] == tipo]
            monto = df_tipo['MONTO'].sum()
            regs = len(df_tipo)
            print(f"    {tipo:15}: {monto:>12,.0f} ({regs} registros)")

df_isipp = df[df['inst'] == 1]
df_milagros = df[df['inst'] == 2]

print("\n" + "="*80)
print(f"ISIPP TOTAL:     {df_isipp['MONTO'].sum():>15,.0f}")
print(f"MILAGROS TOTAL:  {df_milagros['MONTO'].sum():>15,.0f}")
print(f"AUDIT TOTAL:     {df['MONTO'].sum():>15,.0f}")
print("="*80)
