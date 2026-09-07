import pandas as pd
import numpy as np

excel_file = "CUOTAS 2025 INSM vigente para cristian (2).xlsx"

# Analizar PRIMARIA en detalle
hoja = 'PRIMARIA2026'
df = pd.read_excel(excel_file, sheet_name=hoja)

# Eliminar filas completamente vacías
df = df.dropna(how='all')

# Mostrar estructura
print("="*100)
print(f"PRIMARIA2026 - Estructura del Excel")
print("="*100)

print(f"\nTotal de filas: {len(df)}")
print(f"\nPrimeras 5 filas (primeras 10 columnas):")
print(df.iloc[:5, :10].to_string())

print(f"\n\nColumnas disponibles:")
for i, col in enumerate(df.columns):
    print(f"  {i}: {col}")

# Encontrar INSCRIPCION
inscripcion_idx = list(df.columns).index('INSCRIPCION')
print(f"\n\nINSCRIPCION está en posición: {inscripcion_idx}")

# Ver qué columnas estoy sumando
print(f"\nColumnas desde INSCRIPCION hacia la derecha:")
cols_desde_inscripcion = df.columns[inscripcion_idx:]
print(f"Total: {len(cols_desde_inscripcion)} columnas")
for i, col in enumerate(cols_desde_inscripcion[:25]):  # Mostrar primeras 25
    print(f"  {i}: {col}")

# Filtrar conceptos
cols_conceptos = [col for col in cols_desde_inscripcion 
                 if col not in ['METODO', 'TALONARIO', 'OBSERVACIONES'] 
                 and 'METODO' not in col and 'TALONARIO' not in col]

print(f"\n\nColumnas de CONCEPTOS (sin METODO ni TALONARIO):")
print(f"Total: {len(cols_conceptos)} columnas")
for i, col in enumerate(cols_conceptos):
    print(f"  {i}: {col}")

# Mostrar un estudiante ejemplo con todos sus pagos
print(f"\n\n{'='*100}")
print(f"EJEMPLO: Estudiante #1")
print(f"{'='*100}")

estudiante_0 = df.iloc[0]
print(f"\nNombre: {estudiante_0['NOMBRES']} {estudiante_0['APELLIDO']}")
print(f"DNI: {estudiante_0['DNI']}")

print(f"\nVALORES EN CADA CONCEPTO:")
total_estudiante = 0
for col in cols_conceptos:
    valor = estudiante_0[col]
    if pd.notna(valor) and valor != '' and valor != 0:
        print(f"  {col:20}: {valor:>10}")
        total_estudiante += valor
    else:
        # Mostrar también los que están vacíos/cero
        pass

print(f"\nTOTAL PAGADO ESTE ESTUDIANTE: ${total_estudiante:,.0f}")

# Ahora sumar TODA LA COLUMNA PRIMARIA
print(f"\n\n{'='*100}")
print(f"SUMA DE CADA CONCEPTO EN PRIMARIA")
print(f"{'='*100}")

total_general = 0
for col in cols_conceptos:
    col_values = pd.to_numeric(df[col], errors='coerce')
    col_sum = col_values.sum()
    if col_sum > 0:
        print(f"{col:20}: ${col_sum:>15,.0f}")
        total_general += col_sum

print(f"\n{'TOTAL PRIMARIA':20}: ${total_general:>15,.0f}")
