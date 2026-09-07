import pandas as pd
import numpy as np

excel_file = "CUOTAS 2025 INSM vigente para cristian (2).xlsx"

hojas = ['INICIAL2026', 'PRIMARIA2026', 'SECUNDARIA2026', 'HIGIENE2026', 'ANALISTA2026']

print("\n" + "="*100)
print("ANALISIS CORRECTO: SUMA SOLO LOS NUMEROS QUE ESTAN LLENOS")
print("="*100)

for hoja in hojas:
    df = pd.read_excel(excel_file, sheet_name=hoja)
    
    # Eliminar filas que están completamente vacías
    df = df.dropna(how='all')
    
    # Eliminar la fila de encabezado si existe
    if 'ITEM' in df.columns:
        df = df[df['ITEM'].notna()]
    
    estudiantes = len(df)
    
    # Desde INSCRIPCION hacia la derecha
    # Encontrar índice de INSCRIPCION
    inscripcion_idx = list(df.columns).index('INSCRIPCION')
    
    # Columnas desde INSCRIPCION hacia la derecha (PERO EXCLUYENDO METODO, TALONARIO, OBSERVACIONES)
    cols_desde_inscripcion = df.columns[inscripcion_idx:]
    
    # Filtrar solo columnas que son conceptos (no METODO, TALONARIO, OBSERVACIONES)
    cols_conceptos = [col for col in cols_desde_inscripcion 
                     if col not in ['METODO', 'TALONARIO', 'OBSERVACIONES'] 
                     and 'METODO' not in col and 'TALONARIO' not in col]
    
    print(f"\n{hoja}:")
    print(f"  Columnas conceptos: {cols_conceptos}")
    print(f"  Estudiantes: {estudiantes}")
    
    # Sumar SOLO valores numéricos, ignorar NaN
    total_pagado = 0
    for col in cols_conceptos:
        col_sum = pd.to_numeric(df[col], errors='coerce').sum()
        total_pagado += col_sum
    
    # Desglose por tipo
    inscripciones = pd.to_numeric(df['INSCRIPCION'], errors='coerce').sum()
    
    # Sumar CUOTA (buscar todas las columnas con CUOTA)
    cuotas = 0
    for col in cols_conceptos:
        if 'CUOTA' in col and col != 'INSCRIPCION':
            cuotas += pd.to_numeric(df[col], errors='coerce').sum()
    
    # Sumar SEGURO
    seguros = 0
    for col in cols_conceptos:
        if 'SEGURO' in col:
            seguros += pd.to_numeric(df[col], errors='coerce').sum()
    
    print(f"  Total REALMENTE pagado: ${total_pagado:,.0f}")
    print(f"\n  Desglose:")
    print(f"    INSCRIPCION: ${inscripciones:,.0f}")
    print(f"    CUOTA: ${cuotas:,.0f}")
    print(f"    SEGURO: ${seguros:,.0f}")
    print(f"    VERIFICACION: ${inscripciones + cuotas + seguros:,.0f}")

print("\n" + "="*100)
print("TOTALES CORRECTOS")
print("="*100)

totales = {}
for hoja in hojas:
    df = pd.read_excel(excel_file, sheet_name=hoja)
    df = df.dropna(how='all')
    
    if 'ITEM' in df.columns:
        df = df[df['ITEM'].notna()]
    
    inscripcion_idx = list(df.columns).index('INSCRIPCION')
    cols_desde_inscripcion = df.columns[inscripcion_idx:]
    cols_conceptos = [col for col in cols_desde_inscripcion 
                     if col not in ['METODO', 'TALONARIO', 'OBSERVACIONES'] 
                     and 'METODO' not in col and 'TALONARIO' not in col]
    
    total = 0
    for col in cols_conceptos:
        total += pd.to_numeric(df[col], errors='coerce').sum()
    
    totales[hoja] = total

milagros_total = totales.get('INICIAL2026', 0) + totales.get('PRIMARIA2026', 0) + totales.get('SECUNDARIA2026', 0)
isipp_total = totales.get('HIGIENE2026', 0) + totales.get('ANALISTA2026', 0)

print(f"\nMILAGROS:")
print(f"  INICIAL: ${totales.get('INICIAL2026', 0):,.0f}")
print(f"  PRIMARIA: ${totales.get('PRIMARIA2026', 0):,.0f}")
print(f"  SECUNDARIA: ${totales.get('SECUNDARIA2026', 0):,.0f}")
print(f"  SUBTOTAL: ${milagros_total:,.0f}")

print(f"\nISIPP:")
print(f"  HIGIENE: ${totales.get('HIGIENE2026', 0):,.0f}")
print(f"  ANALISTA: ${totales.get('ANALISTA2026', 0):,.0f}")
print(f"  SUBTOTAL: ${isipp_total:,.0f}")

print(f"\nGRAND TOTAL: ${sum(totales.values()):,.0f}")
