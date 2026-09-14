import codecs

# Detectar y limpiar encoding
with open('src/renderer/modules/ReportesFinancierosModerno.tsx', 'rb') as f:
    raw_data = f.read()

# Intentar con iso-8859-1 (es más permisivo)
try:
    content = raw_data.decode('iso-8859-1')
    
    # Reescribir en UTF-8 limpio
    with open('src/renderer/modules/ReportesFinancierosModerno.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ Archivo normalizado a UTF-8')
except Exception as e:
    print(f'Error: {e}')
