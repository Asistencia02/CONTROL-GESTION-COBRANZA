import ExcelJS from 'exceljs'

interface ReporteExcelConfig {
  nombreArchivo: string
  titulo: string
  fechaReporte: string
}

interface TablaDatos {
  nombre: string
  encabezados: string[]
  datos: any[][]
  esMoneda?: boolean[]
}

export const useExcelExport = () => {
  const exportarReporte = async (
    config: ReporteExcelConfig,
    tablas: TablaDatos[],
    institucion: string
  ) => {
    const workbook = new ExcelJS.Workbook()
    let filaActual = 1

    tablas.forEach((tabla) => {
      const worksheet = workbook.addWorksheet(tabla.nombre)

      // Título del reporte
      const titleRow = worksheet.getRow(filaActual)
      titleRow.getCell(1).value = config.titulo
      titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFF' } }
      titleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0066CC' }
      }
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'center' }
      worksheet.mergeCells(filaActual, 1, filaActual, tabla.encabezados.length)
      filaActual++

      // Subtítulo con institución y fecha
      const subtitleRow = worksheet.getRow(filaActual)
      subtitleRow.getCell(1).value = `${institucion} - ${config.fechaReporte}`
      subtitleRow.getCell(1).font = { italic: true, size: 11, color: { argb: '666666' } }
      worksheet.mergeCells(filaActual, 1, filaActual, tabla.encabezados.length)
      filaActual++

      // Espaciador
      filaActual++

      // Encabezados de tabla
      const headerRow = worksheet.getRow(filaActual)
      tabla.encabezados.forEach((encabezado, index) => {
        const cell = headerRow.getCell(index + 1)
        cell.value = encabezado
        cell.font = { bold: true, color: { argb: 'FFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '333333' }
        }
        cell.alignment = { horizontal: 'center', vertical: 'center' }
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      })
      filaActual++

      // Datos
      tabla.datos.forEach((fila) => {
        const dataRow = worksheet.getRow(filaActual)
        fila.forEach((valor, index) => {
          const cell = dataRow.getCell(index + 1)

          // Formatear moneda si aplica
          if (tabla.esMoneda && tabla.esMoneda[index]) {
            if (typeof valor === 'number') {
              cell.value = valor
              cell.numFmt = '$#,##0.00'
            } else {
              cell.value = valor
            }
          } else {
            cell.value = valor
          }

          cell.alignment = { horizontal: index === 0 ? 'left' : 'right', vertical: 'center' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
            left: { style: 'thin', color: { argb: 'CCCCCC' } },
            right: { style: 'thin', color: { argb: 'CCCCCC' } }
          }

          // Alternar colores de filas
          if (filaActual % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F5F5F5' }
            }
          }
        })
        filaActual++
      })

      // Auto-ajustar ancho de columnas
      tabla.encabezados.forEach((_, index) => {
        let maxLength = tabla.encabezados[index].length
        tabla.datos.forEach((fila) => {
          const cellValue = fila[index]?.toString() || ''
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length
          }
        })
        worksheet.getColumn(index + 1).width = maxLength + 5
      })

      filaActual = 1
    })

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${config.nombreArchivo}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return { exportarReporte }
}
