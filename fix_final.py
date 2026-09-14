with open('src/renderer/modules/ReportesFinancierosModerno.tsx.clean', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Buscar la línea con el último import
for i, line in enumerate(lines):
    if 'import { useConfiguracion }' in line:
        lines.insert(i + 1, 'import { useReportesAvanzados } from \'@renderer/hooks/useReportesAvanzados\'\n')
        break

# Buscar dónde agregar la variable del hook
for i, line in enumerate(lines):
    if 'const { configuraciones, cargarConfiguracionesPorInstitucion }' in line:
        lines.insert(i + 1, '  const { ingresosPorMetodo, realVsTeoricoCarrera } = useReportesAvanzados(institucionActiva.id)\n')
        break

with open('src/renderer/modules/ReportesFinancierosModerno.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('✅ Imports agregados')
