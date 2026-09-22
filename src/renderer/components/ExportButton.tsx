import React from 'react'
import { Download, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import Papa from 'papaparse'

interface ExportData {
  filename: string
  data: any[]
  columns: { key: string; label: string }[]
}

export const ExportButton: React.FC<ExportData> = ({ filename, data, columns }) => {
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      data.map(row =>
        columns.reduce((acc, col) => ({
          ...acc,
          [col.label]: row[col.key]
        }), {})
      )
    )
    
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos')
    XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToCSV = () => {
    const csv = Papa.unparse({
      fields: columns.map(c => c.label),
      data: data.map(row =>
        columns.map(col => row[col.key])
      )
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Título
    doc.setFontSize(16)
    doc.text(filename, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Tabla simplificada
    doc.setFontSize(10)
    const columnWidth = (pageWidth - 40) / columns.length
    
    // Headers
    doc.setTextColor(59, 130, 246)
    columns.forEach((col, i) => {
      doc.text(col.label, 20 + i * columnWidth, yPosition, { maxWidth: columnWidth - 2 })
    })
    yPosition += 10

    // Datos
    doc.setTextColor(200, 200, 200)
    data.slice(0, 50).forEach(row => {
      if (yPosition > pageHeight - 20) {
        doc.addPage()
        yPosition = 20
      }
      
      columns.forEach((col, i) => {
        const value = String(row[col.key] || '').substring(0, 20)
        doc.text(value, 20 + i * columnWidth, yPosition, { maxWidth: columnWidth - 2 })
      })
      yPosition += 8
    })

    doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="flex gap-1 sm:gap-2">
      <button
        onClick={exportToExcel}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/50 rounded-lg text-xs sm:text-sm font-bold transition"
        title="Exportar a Excel"
      >
        <Download size={14} className="sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Excel</span>
      </button>

      <button
        onClick={exportToCSV}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/50 rounded-lg text-xs sm:text-sm font-bold transition"
        title="Exportar a CSV"
      >
        <Download size={14} className="sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">CSV</span>
      </button>

      <button
        onClick={exportToPDF}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50 rounded-lg text-xs sm:text-sm font-bold transition"
        title="Exportar a PDF"
      >
        <FileText size={14} className="sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  )
}
