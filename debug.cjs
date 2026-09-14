const fs = require('fs');

const content = fs.readFileSync('src/renderer/modules/ReportesFinancierosModerno.tsx', 'utf-8');
const lines = content.split('\n');

// Buscar "// ISIP: Solo Ingresos" (línea 601)
const isipLineIdx = lines.findIndex(l => l.includes('// ISIP: Solo Ingresos'));
console.log(`ISIP encontrado en línea: ${isipLineIdx + 1}`);

// Buscar "case 'desglose':" para saber dónde termina comparativa
const desgloseLineIdx = lines.findIndex(l => l.includes("case 'desglose':"));
console.log(`DESGLOSE encontrado en línea: ${desgloseLineIdx + 1}`);

// Buscar "case 'aldia':" para saber dónde termina desglose
const aldiaLineIdx = lines.findIndex(l => l.includes("case 'aldia':"));
console.log(`ALDIA encontrado en línea: ${aldiaLineIdx + 1}`);

// Mostrar contexto alrededor de ISIP
console.log('\n=== CONTEXTO ISIP ===');
for (let i = isipLineIdx; i < Math.min(isipLineIdx + 50, lines.length); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

console.log('\n=== FINAL DE DESGLOSE ===');
for (let i = Math.max(0, aldiaLineIdx - 10); i < Math.min(aldiaLineIdx + 5, lines.length); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
