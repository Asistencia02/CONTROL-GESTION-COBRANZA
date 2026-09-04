const fs = require('fs');
const path = require('path');

const filePath = path.join('src/renderer/modules/ReportesEjecutivos.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazo 1: Cambiar variables de deuda
content = content.replace(
  'let deudaEst = 0\n        let tieneDeuda = false',
  'let conceptosPagados = 0\n        let deudaTotal = 0'
);

// Reemplazo 2: Cambiar lógica dentro del forEach
const oldForEach = `conceptosDelEst.forEach(c => {
          const montoPago = pagosMap.get(\`\${est.id}-\${c.id}\`) || 0
          const deudaConcepto = Math.max(0, c.monto - montoPago)

          deudaEst += deudaConcepto
          totalRecaudable += c.monto

          if (deudaConcepto > 0) {
            tieneDeuda = true
          }
        })`;

const newForEach = `conceptosDelEst.forEach(c => {
          const montoPago = pagosMap.get(\`\${est.id}-\${c.id}\`) || 0
          totalRecaudable += c.monto

          if (montoPago >= c.monto) {
            conceptosPagados++
          } else {
            deudaTotal += (c.monto - montoPago)
          }
        })`;

content = content.replace(oldForEach, newForEach);

// Reemplazo 3: Cambiar filtro totalRecaudado
content = content.replace(
  '.filter(p => p.estudiante_id === est.id)',
  '.filter(p => p.estudiante_id === est.id && conceptosDelEst.some(c => c.id === p.concepto_id))'
);

// Reemplazo 4: Cambiar condicional if
const oldIf = `if (tieneDeuda) {
          estudiantesEnMora++
          if (deudaEst > 0) {
            topMorosos.push({
              dni: est.dni,
              nombre: \`\${est.nombre} \${est.apellido}\`,
              carrera: (est as any).carreras?.nombre || '',
              deuda: deudaEst,
            })
          }
        } else {
          estudiantesAlDia++
        }`;

const newIf = `if (conceptosPagados === conceptosDelEst.length) {
          estudiantesAlDia++
        } else {
          estudiantesEnMora++
          if (deudaTotal > 0) {
            topMorosos.push({
              dni: est.dni,
              nombre: \`\${est.nombre} \${est.apellido}\`,
              carrera: (est as any).carreras?.nombre || '',
              deuda: deudaTotal,
            })
          }
        }`;

content = content.replace(oldIf, newIf);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Archivo corregido exitosamente');
