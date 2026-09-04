import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'src/renderer/modules/ReportesEjecutivos.tsx');

let content = fs.readFileSync(filePath, 'utf8');

const oldLogic = `let deudaEst = 0
        let tieneDeuda = false

        const conceptosDelEst = conceptosVencidos.filter(c => c.carrera_id === est.carrera_id)
        if (conceptosDelEst.length === 0) return

        conceptosDelEst.forEach(c => {
          const montoPago = pagosMap.get(\`\${est.id}-\${c.id}\`) || 0
          const deudaConcepto = Math.max(0, c.monto - montoPago)

          deudaEst += deudaConcepto
          totalRecaudable += c.monto

          if (deudaConcepto > 0) {
            tieneDeuda = true
          }
        })

        totalRecaudado += todosPagos
          .filter(p => p.estudiante_id === est.id && conceptosDelEst.some(c => c.id === p.concepto_id))
          .reduce((sum, p) => sum + p.monto_pagado, 0)

        if (tieneDeuda) {
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

const newLogic = `let conceptosPagados = 0
        let deudaTotal = 0

        const conceptosDelEst = conceptosVencidos.filter(c => c.carrera_id === est.carrera_id)
        if (conceptosDelEst.length === 0) return

        conceptosDelEst.forEach(c => {
          const montoPago = pagosMap.get(\`\${est.id}-\${c.id}\`) || 0
          totalRecaudable += c.monto

          if (montoPago >= c.monto) {
            conceptosPagados++
          } else {
            deudaTotal += (c.monto - montoPago)
          }
        })

        totalRecaudado += todosPagos
          .filter(p => p.estudiante_id === est.id && conceptosDelEst.some(c => c.id === p.concepto_id))
          .reduce((sum, p) => sum + p.monto_pagado, 0)

        if (conceptosPagados === conceptosDelEst.length) {
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

if (!content.includes(oldLogic)) {
  console.error('ERROR: No se encontró el patrón a reemplazar');
  process.exit(1);
}

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Archivo corregido exitosamente');
