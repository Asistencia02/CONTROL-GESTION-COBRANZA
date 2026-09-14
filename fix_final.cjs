const fs = require('fs');

const content = fs.readFileSync('src/renderer/modules/ReportesFinancierosModerno.tsx', 'utf-8');
const lines = content.split('\n');

// Agregar import
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("import { useConfiguracion }")) {
    lines.splice(i + 1, 0, "import { useReportesAvanzados } from '@renderer/hooks/useReportesAvanzados'");
    break;
  }
}

// Agregar hook
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const { configuraciones, cargarConfiguracionesPorInstitucion }')) {
    lines.splice(i + 1, 0, "  const { ingresosPorMetodo, realVsTeoricoCarrera } = useReportesAvanzados(institucionActiva.id)");
    break;
  }
}

fs.writeFileSync('src/renderer/modules/ReportesFinancierosModerno.tsx', lines.join('\n'), 'utf-8');
console.log('✅ Imports agregados');
