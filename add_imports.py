import sys

with open('src/renderer/modules/ReportesFinancierosModerno.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Buscar la línea con el último import
import_found = False
for i, line in enumerate(lines):
    if line.startswith('import { useConfiguracion }'):
        # Agregar el nuevo import después de esta línea
        lines.insert(i + 1, 'import { useReportesAvanzados } from \'@renderer/hooks/useReportesAvanzados\'\n')
        import_found = True
        break

# Buscar dónde agregar la variable del hook en el componente
if import_found:
    for i, line in enumerate(lines):
        if 'const { configuraciones, cargarConfiguracionesPorInstitucion }' in line:
            # Agregar después de esta línea el hook
            lines.insert(i + 1, '  const { ingresosPorMetodo, realVsTeoricoCarrera } = useReportesAvanzados(institucionActiva.id)\n')
            break

with open('src/renderer/modules/ReportesFinancierosModerno.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('✅ Imports agregados correctamente')
