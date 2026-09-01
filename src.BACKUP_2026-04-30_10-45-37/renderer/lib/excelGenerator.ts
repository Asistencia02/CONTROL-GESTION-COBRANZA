import * as XLSX from 'xlsx'

export interface DatosExcelReferencia {
  carreras: Array<{ id: number; nombre: string }>
  conceptos: Array<{ id: number; nombre: string; tipo: string }>
}

/**
 * Genera un archivo Excel de referencia para carga masiva de estudiantes
 * Incluye dos hojas: una vacía para llenar y otra con ejemplos
 */
export const generarExcelReferencia = (datos: DatosExcelReferencia) => {
  // Hoja 1: Vacía con estructura
  const hoja1Data = [
    [
      'DNI',
      'Nombre',
      'Apellido',
      'Carrera/Nivel',
      'Email',
      'Telefono',
      ...datos.conceptos.map((c) => c.nombre),
    ],
    // Fila vacía de ejemplo
    ['', '', '', '', '', '', ...Array(datos.conceptos.length).fill('')],
  ]

  // Hoja 2: Ejemplo con datos de referencia
  const hoja2Data = [
    [
      'DNI',
      'Nombre',
      'Apellido',
      'Carrera/Nivel',
      'Email',
      'Telefono',
      ...datos.conceptos.map((c) => c.nombre),
    ],
    // Ejemplos
    [
      '12345678',
      'Juan',
      'Pérez',
      datos.carreras[0]?.nombre || 'Carrera 1',
      'juan@mail.com',
      '3624123456',
      'SI',
      'SI',
      'SI',
      ...Array(Math.max(0, datos.conceptos.length - 3)).fill(''),
    ],
    [
      '87654321',
      'María',
      'García',
      datos.carreras[1]?.nombre || 'Carrera 2',
      'maria@mail.com',
      '3624654321',
      'SI',
      '',
      'SI',
      ...Array(Math.max(0, datos.conceptos.length - 3)).fill(''),
    ],
    [
      '11223344',
      'Carlos',
      'López',
      datos.carreras[0]?.nombre || 'Carrera 1',
      'carlos@mail.com',
      '3624789012',
      '',
      'SI',
      '',
      ...Array(Math.max(0, datos.conceptos.length - 3)).fill(''),
    ],
  ]

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Agregar hojas
  const sheet1 = XLSX.utils.aoa_to_sheet(hoja1Data)
  const sheet2 = XLSX.utils.aoa_to_sheet(hoja2Data)

  // Configurar anchos de columna
  const columnWidths = [
    { wch: 12 }, // DNI
    { wch: 15 }, // Nombre
    { wch: 15 }, // Apellido
    { wch: 25 }, // Carrera/Nivel
    { wch: 20 }, // Email
    { wch: 15 }, // Teléfono
    ...datos.conceptos.map(() => ({ wch: 15 })), // Conceptos
  ]

  sheet1['!cols'] = columnWidths
  sheet2['!cols'] = columnWidths

  // Formato para header (fila 1) - negrita y fondo gris
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  }

  // Aplicar estilo a headers
  for (let col = 0; col < hoja1Data[0].length; col++) {
    const cellAddress1 = XLSX.utils.encode_col(col) + '1'
    const cellAddress2 = XLSX.utils.encode_col(col) + '1'

    if (sheet1[cellAddress1]) sheet1[cellAddress1].s = headerStyle
    if (sheet2[cellAddress2]) sheet2[cellAddress2].s = headerStyle
  }

  XLSX.utils.book_append_sheet(workbook, sheet1, 'Cargar Datos')
  XLSX.utils.book_append_sheet(workbook, sheet2, 'Ejemplo')

  // Generar archivo
  XLSX.writeFile(workbook, 'Carga_Masiva_Estudiantes.xlsx')
}
