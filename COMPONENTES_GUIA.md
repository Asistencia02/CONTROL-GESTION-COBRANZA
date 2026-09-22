# 📚 Guía de Componentes Avanzados

## 1. Skeleton Loaders (Estados de Carga)

### Uso:
```typescript
import { SkeletonTable, SkeletonCard, SkeletonChart } from '@renderer/components/SkeletonLoader'

// En tu componente
{loading ? (
  <SkeletonTable rows={5} cols={6} />
) : (
  <TablaCompleta />
)}

{loading ? (
  <SkeletonCard count={4} />
) : (
  <KPIsCompletos />
)}

{loading ? (
  <SkeletonChart />
) : (
  <GraficoCompleto />
)}
```

**Características:**
- Animación shimmer automática
- Responsive (adapta tamaño a pantalla)
- Múltiples variantes: tabla, cards, gráfico, texto

---

## 2. Paginación

### Uso:
```typescript
import { Pagination } from '@renderer/components/Pagination'
import { useState } from 'react'

const [currentPage, setCurrentPage] = useState(1)
const [pageSize, setPageSize] = useState(10)

// Paginar datos
const startIdx = (currentPage - 1) * pageSize
const paginatedData = allData.slice(startIdx, startIdx + pageSize)

<Pagination
  total={allData.length}
  pageSize={pageSize}
  currentPage={currentPage}
  onPageChange={setCurrentPage}
  onPageSizeChange={setPageSize}
/>

{/* Mostrar datos paginados */}
<tabla>
  {paginatedData.map(row => ...)}
</tabla>
```

**Características:**
- Selector "Por página" (10, 25, 50, 100)
- Botones primera/última página
- Input para saltar a página específica
- Indicador "1-10 de 250 registros"
- Responsive en mobile

---

## 3. Búsqueda Avanzada con Filtros

### Uso:
```typescript
import { AdvancedSearch } from '@renderer/components/AdvancedSearch'
import { useState } from 'react'

const [searchText, setSearchText] = useState('')
const [filters, setFilters] = useState({})

const filteredData = allData.filter(item => {
  // Búsqueda por nombre
  const matchSearch = item.nombre.toLowerCase().includes(searchText.toLowerCase())
  // Filtros adicionales
  const matchFilters = Object.entries(filters).every(([key, value]) => 
    !value || item[key] === value
  )
  return matchSearch && matchFilters
})

<AdvancedSearch
  onSearch={setSearchText}
  onFilter={setFilters}
  placeholder="Buscar por nombre o DNI..."
  debounceMs={300}
  filterOptions={[
    {
      label: 'Estado',
      key: 'estado',
      options: [
        { label: 'Activo', value: 'ACTIVO' },
        { label: 'Inactivo', value: 'INACTIVO' },
      ]
    },
    {
      label: 'Carrera',
      key: 'carrera_id',
      options: carreras.map(c => ({ label: c.nombre, value: c.id }))
    }
  ]}
/>
```

**Características:**
- Búsqueda debounced (300ms por defecto)
- Filtros combinables
- Botón "Limpiar" automático
- Badge con cantidad de filtros activos
- Panel de filtros expandible

---

## 4. Exportación Excel/PDF/CSV

### Uso:
```typescript
import { ExportButton } from '@renderer/components/ExportButton'

<ExportButton
  filename="reporte-pagos"
  data={pagosList}
  columns={[
    { key: 'fecha_pago', label: 'Fecha' },
    { key: 'monto_pagado', label: 'Monto' },
    { key: 'metodo_pago', label: 'Método' },
    { key: 'estudiante_nombre', label: 'Estudiante' },
  ]}
/>

// Genera archivos con fecha actual
// reporte-pagos-2024-01-15.xlsx
// reporte-pagos-2024-01-15.csv
// reporte-pagos-2024-01-15.pdf
```

**Características:**
- Excel (.xlsx) - con formato
- CSV (.csv) - para Excel o Google Sheets
- PDF (.pdf) - con tabla simple y fecha
- Nombre de archivo automático con fecha
- 3 botones en una fila compacta

---

## 5. Validaciones en Tiempo Real

### Uso:
```typescript
import { useFormValidation } from '@renderer/hooks/useFormValidation'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(3, 'Mínimo 3 caracteres'),
  monto: z.number().positive('Debe ser mayor a 0'),
})

const { errors, handleChange, handleBlur, getFieldError, validate } = useFormValidation({
  schema,
  mode: 'onChange' // 'onChange' | 'onBlur' | 'onSubmit'
})

// En el form
<input
  name="email"
  onChange={handleChange}
  onBlur={handleBlur}
  className={getFieldError('email') ? 'border-red-500' : ''}
/>
{getFieldError('email') && (
  <p className="text-red-400 text-sm mt-1">{getFieldError('email')}</p>
)}

// Al submit
const handleSubmit = async (e) => {
  e.preventDefault()
  const isValid = await validate(formData)
  if (isValid) {
    // Enviar datos
  }
}
```

**Características:**
- Schema validation con Zod
- Modos: onChange, onBlur, onSubmit
- Tracking de campos tocados
- Errores solo en campos visitados
- TypeScript seguro

---

## 6. Gráficos Interactivos con Recharts

### Uso:
```typescript
import { InteractiveChart } from '@renderer/components/InteractiveChart'

// Gráfico de línea
<InteractiveChart
  type="line"
  data={[
    { fecha: '2024-01-01', pagos: 5000, gastos: 2000 },
    { fecha: '2024-01-02', pagos: 7000, gastos: 2500 },
  ]}
  dataKey={['pagos', 'gastos']}
  xAxisDataKey="fecha"
  title="Últimos 7 días"
  height={300}
/>

// Gráfico de barras
<InteractiveChart
  type="bar"
  data={[
    { concepto: 'Matrícula', monto: 50000 },
    { concepto: 'Cuota', monto: 30000 },
  ]}
  dataKey="monto"
  xAxisDataKey="concepto"
  title="Conceptos Top"
/>

// Gráfico circular
<InteractiveChart
  type="pie"
  data={[
    { name: 'Activos', value: 45 },
    { name: 'Becado 50%', value: 20 },
    { name: 'Becado 100%', value: 35 },
  ]}
  dataKey="value"
  xAxisDataKey="name"
  title="Distribución Estudiantes"
/>
```

**Características:**
- Tooltips interactivos al hover
- Colores personalizables
- Responsive (se adapta al contenedor)
- 3 tipos: line, bar, pie
- Leyenda automática
- Zoom en gráficos complejos

---

## 7. Dark Mode Toggle

### Uso:
```typescript
import { DarkModeToggle } from '@renderer/components/DarkModeToggle'

// En header o sidebar
<header>
  <DarkModeToggle />
</header>

// O usar el hook directamente
import { useDarkMode } from '@renderer/hooks/useDarkMode'

const { isDark, toggleDarkMode, mode } = useDarkMode()

<button onClick={toggleDarkMode}>
  {isDark ? 'Claro' : 'Oscuro'}
</button>
```

**Características:**
- Guarda preferencia en localStorage
- Detecta preferencia del sistema
- Animación suave
- Toggle button con iconos
- Modos: light, dark, system

---

## 8. Tooltips de Ayuda

### Uso:
```typescript
import { Tooltip, HelpIcon } from '@renderer/components/Tooltip'

<div className="flex items-center gap-2">
  <label>Monto a cobrar</label>
  <HelpIcon text="Ingresa el monto total sin centavos" />
</div>

{/* O tooltip personalizado */}
<Tooltip text="Haz clic para exportar datos" position="top">
  <button>Exportar</button>
</Tooltip>
```

**Características:**
- Posiciones: top, bottom, left, right
- Hover automático
- Icono de ayuda (?) personalizado
- Animación fade-in

---

## 9. Breadcrumbs Navegación

### Uso:
```typescript
import { Breadcrumb } from '@renderer/components/Breadcrumb'

<Breadcrumb
  items={[
    { label: 'Inicio', onClick: () => navigate('/') },
    { label: 'Deudas', onClick: () => navigate('/deudas') },
    { label: 'Estudiante Juan' },
  ]}
/>
```

**Características:**
- Navegación visual
- Último item sin click (actual)
- Items anteriores clickeables
- Separadores automáticos
- Responsive

---

## 📋 Ejemplo Completo: Tabla con Todo Integrado

```typescript
import React, { useState, useMemo } from 'react'
import { Pagination } from '@renderer/components/Pagination'
import { AdvancedSearch } from '@renderer/components/AdvancedSearch'
import { SkeletonTable } from '@renderer/components/SkeletonLoader'
import { ExportButton } from '@renderer/components/ExportButton'

export const TablaCompleta = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [filters, setFilters] = useState({})

  // Filtrar datos
  const filtered = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.nombre.toLowerCase().includes(searchText)
      const matchFilters = Object.entries(filters).every(
        ([key, value]) => !value || item[key] === value
      )
      return matchSearch && matchFilters
    })
  }, [data, searchText, filters])

  // Paginar
  const startIdx = (currentPage - 1) * pageSize
  const paginatedData = filtered.slice(startIdx, startIdx + pageSize)

  return (
    <div className="space-y-4">
      {/* Búsqueda y Filtros */}
      <AdvancedSearch
        onSearch={setSearchText}
        onFilter={setFilters}
        placeholder="Buscar estudiante..."
        filterOptions={[
          {
            label: 'Estado',
            key: 'estado',
            options: [
              { label: 'Activo', value: 'ACTIVO' },
              { label: 'Inactivo', value: 'INACTIVO' },
            ]
          }
        ]}
      />

      {/* Tabla */}
      {loading ? (
        <SkeletonTable rows={10} cols={5} />
      ) : (
        <div>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.email}</td>
                  <td>{item.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <Pagination
        total={filtered.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Exportar */}
      <ExportButton
        filename="estudiantes"
        data={filtered}
        columns={[
          { key: 'nombre', label: 'Nombre' },
          { key: 'email', label: 'Email' },
          { key: 'estado', label: 'Estado' },
        ]}
      />
    </div>
  )
}
```

---

## 🎯 Checklist de Integración

- [ ] Importar componente
- [ ] Pasar props requeridas
- [ ] Conectar con state/hooks
- [ ] Manejar eventos (onChange, onFilter, etc.)
- [ ] Aplicar estilos Tailwind si es necesario
- [ ] Testar en mobile (320px) y desktop (1280px+)
- [ ] Verificar accesibilidad (alt text, labels, etc.)

---

## 📊 Performance Tips

1. **Paginación**: Limita a 10-50 items por página en tablas grandes
2. **Búsqueda**: Debounce de 300ms para no saturar búsquedas en tiempo real
3. **Gráficos**: Limita a máx 1000 data points por gráfico
4. **Exportación**: Máx 10k filas por archivo PDF
5. **Validaciones**: Usa `mode: 'onBlur'` para formularios con muchos campos

---

**Última actualización**: 2024
**Versión componentes**: 1.0
