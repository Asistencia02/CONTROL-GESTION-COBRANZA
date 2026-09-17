export const debeContar = (concepto: any, estudiante: any): boolean => {
  if (!concepto.mes || !concepto.año) return true
  
  const mesIngreso = estudiante.mes_ingreso || 3
  const anioIngreso = estudiante.ano_ingreso || 2024
  
  return concepto.año > anioIngreso || 
         (concepto.año === anioIngreso && concepto.mes >= mesIngreso)
}
