import fs from 'fs';

const filePath = 'src/renderer/modules/ReportesEjecutivos.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Buscar la sección de cálculo de deudas (aproximadamente línea 227-255)
// Reemplazar la lógica antigua con la nueva
const buscar = `        let deudaEst = 0
        let tieneDeuda = false

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
          .filter(p => p.estudiante_id === est.id)
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

const reemplazar = `        let conceptosPagados = 0
        let deudaTotal = 0

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

if (content.includes(buscar)) {
  content = content.replace(buscar, reemplazar);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('✅ Archivo corregido exitosamente');
} else {
  console.error('❌ No se encontró el patrón exacto a reemplazar');
  process.exit(1);
}
