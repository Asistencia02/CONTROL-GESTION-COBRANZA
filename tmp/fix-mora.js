const fs = require('fs');
const path = 'src/renderer/hooks/useReportesEjecutivos.ts';
let content = fs.readFileSync(path, 'utf8');

const oldSection = `      // Calcular deuda por estudiante PRIMERO para identificar quiénes están en mora
      const deudaPorEstudiante = new Map<number, number>()
      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        conceptosVencidos.forEach(concepto => {
          if (concepto.carrera_id !== est.carrera_id) return
          const tienePago = pagosValidos.some(p => p.estudiante_id === est.id && p.concepto_id === concepto.id && p.monto_pagado >= concepto.monto)
          if (!tienePago) {
            deudaEst += concepto.monto
          }
        })
        deudaPorEstudiante.set(est.id, deudaEst)
        if (deudaEst > 0) {
          estudiantesEnMora++
        }
      })`;

const newSection = `      // Calcular deuda: AL DIA = pago TODOS los conceptos vencidos
      const deudaPorEstudiante = new Map<number, number>()
      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        let tieneDeuda = false
        conceptosVencidos.forEach(concepto => {
          if (concepto.carrera_id !== est.carrera_id) return
          const totalPagado = pagosValidos.filter(p => p.estudiante_id === est.id && p.concepto_id === concepto.id).reduce((sum, p) => sum + p.monto_pagado, 0)
          const deudaConcepto = Math.max(0, concepto.monto - totalPagado)
          deudaEst += deudaConcepto
          if (deudaConcepto > 0) tieneDeuda = true
        })
        deudaPorEstudiante.set(est.id, deudaEst)
        if (tieneDeuda) {
          estudiantesEnMora++
        }
      })`;

content = content.replace(oldSection, newSection);
fs.writeFileSync(path, content);
console.log('Cambio realizado');
