import pandas as pd
import numpy as np

excel_file = "CUOTAS 2025 INSM vigente para cristian (2).xlsx"

hojas = ['INICIAL2026', 'PRIMARIA2026', 'SECUNDARIA2026', 'HIGIENE2026', 'ANALISTA2026']

print("\n" + "="*100)
print("ANALISIS: CUANTO ESTA PAGADO EN CADA HOJA")
print("="*100)

for hoja in hojas:
    df = pd.read_excel(excel_file, sheet_name=hoja)
    
    # Eliminar filas que están completamente vacías
    df = df.dropna(how='all')
    
    estudiantes = len(df)
    
    # Columnas de pago (excluir ITEM, APELLIDO, NOMBRES, DNI, TELEFONO, OBSERVACIONES, y columnas METODO y TALONARIO)
    cols_conceptos = [col for col in df.columns if col not in 
                     ['ITEM', 'APELLIDO', 'NOMBRES', 'DNI', 'TELEFONO', 'OBSERVACIONES', 'METODO', 'TALONARIO'] 
                     and 'METODO' not in col and 'TALONARIO' not in col]
    
    # Sumar todos los pagos (ignorar NaN)
    total_pagado = df[cols_conceptos].sum().sum()
    
    # Contar cuántas celdas tienen valores (pagos)
    celdas_con_pago = df[cols_conceptos].notna().sum().sum()
    
    # Conceptos pagados por tipo
    inscripciones = 0
    cuotas = 0
    seguros = 0
    
    for col in cols_conceptos:
        if 'INSCRIPCION' in col:
            inscripciones += df[col].sum()
        elif 'CUOTA' in col:
            cuotas += df[col].sum()
        elif 'SEGURO' in col:
            seguros += df[col].sum()
    
    print(f"\n{hoja}:")
    print(f"  Estudiantes: {estudiantes}")
    print(f"  Total pagado: ${total_pagado:,.0f}")
    print(f"  Celdas con pago: {celdas_con_pago}")
    print(f"\n  Desglose:")
    print(f"    INSCRIPCION: ${inscripciones:,.0f}")
    print(f"    CUOTA: ${cuotas:,.0f}")
    print(f"    SEGURO: ${seguros:,.0f}")

print("\n" + "="*100)
print("TOTALES")
print("="*100)

totales = {}
for hoja in hojas:
    df = pd.read_excel(excel_file, sheet_name=hoja)
    df = df.dropna(how='all')
    
    cols_conceptos = [col for col in df.columns if col not in 
                     ['ITEM', 'APELLIDO', 'NOMBRES', 'DNI', 'TELEFONO', 'OBSERVACIONES', 'METODO', 'TALONARIO'] 
                     and 'METODO' not in col and 'TALONARIO' not in col]
    
    total = df[cols_conceptos].sum().sum()
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
