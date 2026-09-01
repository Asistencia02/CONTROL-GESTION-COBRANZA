// ==================== COMPONENTES VISUALES PARA REPORTES ====================
// Estructura de datos y componentes para mostrar los reportes de gestión de cobro
// Fácil de entender para cualquier persona

// ==================== 1. COMPONENTE: RESUMEN EJECUTIVO ====================
// Muestra: Lo que debería cobrar vs lo que cobró vs lo que falta

const ComponenteResumenEjecutivo = () => {
  const data = {
    deberia_recaudarse_hasta_hoy: 53500000.00,
    recaudado_hasta_hoy: 32929136.00,
    pendiente_hasta_hoy: 20570864.00,
    porcentaje_cobro: 61.55,
    porcentaje_pendiente: 38.45
  };

  return (
    <div className="resumen-ejecutivo">
      <h2>📊 SITUACIÓN ACTUAL (hasta hoy)</h2>
      
      <div className="comparativa">
        <div className="card deberia">
          <h3>DEBERÍA COBRAR</h3>
          <p className="monto">${data.deberia_recaudarse_hasta_hoy.toLocaleString()}</p>
          <p className="submonto">Hasta el mes actual</p>
        </div>

        <div className="card recaudado verde">
          <h3>✅ REALMENTE COBRÉ</h3>
          <p className="monto">${data.recaudado_hasta_hoy.toLocaleString()}</p>
          <p className="submonto">{data.porcentaje_cobro}% del objetivo</p>
        </div>

        <div className="card pendiente rojo">
          <h3>❌ ME FALTA COBRAR</h3>
          <p className="monto">${data.pendiente_hasta_hoy.toLocaleString()}</p>
          <p className="submonto">{data.porcentaje_pendiente}% por cobrar</p>
        </div>
      </div>

      {/* Gráfico de barras horizontal */}
      <div className="grafico-barra">
        <div className="barra-completa">
          <div 
            className="barra-cobrada verde" 
            style={{width: `${data.porcentaje_cobro}%`}}
          >
            {data.porcentaje_cobro}%
          </div>
          <div 
            className="barra-pendiente rojo" 
            style={{width: `${data.porcentaje_pendiente}%`}}
          >
            {data.porcentaje_pendiente}%
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 2. COMPONENTE: POR CARRERA ====================
// Muestra: Cada carrera, su deuda, cobro y eficiencia

const ComponentePorCarrera = () => {
  const carreras = [
    {
      nombre: "Nivel Primaria",
      recaudable_año: 48210000.00,
      deberia_hasta_hoy: 31490000.00,
      recaudado_hasta_hoy: 35567636.00,
      pendiente: -4077636.00,
      porcentaje_cobro: 112.95,
      total_estudiantes: 363,
      pagadores: 330,
      en_mora: 33
    },
    {
      nombre: "Nivel Secundaria",
      recaudable_año: 29260000.00,
      deberia_hasta_hoy: 19240000.00,
      recaudado_hasta_hoy: 17921500.00,
      pendiente: 1318500.00,
      porcentaje_cobro: 93.15,
      total_estudiantes: 228,
      pagadores: 212,
      en_mora: 16
    },
    {
      nombre: "Nivel Inicial",
      recaudable_año: 4210000.00,
      deberia_hasta_hoy: 2770000.00,
      recaudado_hasta_hoy: 2982500.00,
      pendiente: -212500.00,
      porcentaje_cobro: 107.67,
      total_estudiantes: 33,
      pagadores: 30,
      en_mora: 3
    }
  ];

  return (
    <div className="por-carrera">
      <h2>🏫 DESEMPEÑO POR CARRERA</h2>
      
      <table className="tabla-carreras">
        <thead>
          <tr>
            <th>Carrera</th>
            <th>Recaudable Año</th>
            <th>Debería Cobrar<br/>(hasta hoy)</th>
            <th>Cobré<br/>(hasta hoy)</th>
            <th>Eficiencia</th>
            <th>Estudiantes</th>
            <th>En Mora</th>
          </tr>
        </thead>
        <tbody>
          {carreras.map((carrera, idx) => (
            <tr key={idx} className={carrera.porcentaje_cobro >= 100 ? 'verde' : 'amarillo'}>
              <td className="carrera-nombre">{carrera.nombre}</td>
              <td>${carrera.recaudable_año.toLocaleString()}</td>
              <td>${carrera.deberia_hasta_hoy.toLocaleString()}</td>
              <td className="monto-cobrado">${carrera.recaudado_hasta_hoy.toLocaleString()}</td>
              <td>
                <div className="badge" style={{
                  backgroundColor: carrera.porcentaje_cobro >= 100 ? '#4CAF50' : carrera.porcentaje_cobro >= 80 ? '#FFC107' : '#F44336'
                }}>
                  {carrera.porcentaje_cobro}%
                </div>
              </td>
              <td>{carrera.total_estudiantes}</td>
              <td className="en-mora">
                {carrera.en_mora} 
                <span className="porcentaje">
                  ({((carrera.en_mora / carrera.total_estudiantes) * 100).toFixed(1)}%)
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="leyenda">
        <p>🟢 Verde = Eficiencia ≥ 100% (cobró más de lo esperado)</p>
        <p>🟡 Amarillo = Eficiencia 80-99% (normal)</p>
        <p>🔴 Rojo = Eficiencia < 80% (necesita acción)</p>
      </div>
    </div>
  );
};

// ==================== 3. COMPONENTE: META DEL MES ====================
// Muestra: Qué debería cobrar este mes vs qué cobró

const ComponenteMetaMes = () => {
  // Datos del mes actual (AGOSTO)
  const mesActual = {
    nombre: "AGOSTO",
    deberia_cobrar: 5000000.00, // Ejemplo: (53500000 - meses anteriores)
    realmente_cobro: 3500000.00,
    falta: 1500000.00,
    porcentaje: 70
  };

  return (
    <div className="meta-mes">
      <h2>🎯 META DE ESTE MES ({mesActual.nombre})</h2>
      
      <div className="contenedor-meta">
        <div className="meta-card">
          <h3>Meta del Mes</h3>
          <p className="numero grande">${mesActual.deberia_cobrar.toLocaleString()}</p>
        </div>

        <div className="meta-card logrado">
          <h3>Logrado</h3>
          <p className="numero grande verde">${mesActual.realmente_cobro.toLocaleString()}</p>
          <p className="porcentaje">{mesActual.porcentaje}%</p>
        </div>

        <div className="meta-card falta">
          <h3>Falta</h3>
          <p className="numero grande rojo">${mesActual.falta.toLocaleString()}</p>
          <p className="dias">Días para cumplir: 5</p>
        </div>
      </div>

      {/* Barra de progreso circular */}
      <div className="progreso-circular">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" className="circulo-fondo" />
          <circle 
            cx="100" 
            cy="100" 
            r="90" 
            className="circulo-progreso" 
            style={{
              strokeDasharray: `${mesActual.porcentaje * 5.65} 565`
            }}
          />
        </svg>
        <p className="porcentaje-centro">{mesActual.porcentaje}%</p>
      </div>
    </div>
  );
};

// ==================== 4. COMPONENTE: TOP 20 EN MORA ====================
// Muestra: Los estudiantes que más deben

const ComponenteTopMora = () => {
  const estudiantes_mora = [
    { nombre: "Juan García", dni: "35123456", carrera: "Primaria", deuda: 850000, meses: "MAR, ABR, MAY" },
    { nombre: "María López", dni: "35654321", carrera: "Secundaria", deuda: 720000, meses: "ABR, MAY, JUN" },
    { nombre: "Pedro Martínez", dni: "35987654", carrera: "Inicial", deuda: 580000, meses: "MAR, ABR" },
    // ... más estudiantes
  ];

  return (
    <div className="top-mora">
      <h2>⚠️ TOP 20 ESTUDIANTES EN MORA</h2>
      
      <table className="tabla-mora">
        <thead>
          <tr>
            <th>#</th>
            <th>Estudiante</th>
            <th>DNI</th>
            <th>Carrera</th>
            <th>Deuda</th>
            <th>Meses Adeudados</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes_mora.map((est, idx) => (
            <tr key={idx} className="rojo-suave">
              <td className="ranking">#{idx + 1}</td>
              <td className="nombre">{est.nombre}</td>
              <td className="dni">{est.dni}</td>
              <td>{est.carrera}</td>
              <td className="deuda">${est.deuda.toLocaleString()}</td>
              <td className="meses">{est.meses}</td>
              <td className="accion">
                <button>📞 Contactar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="nota">
        Total en mora: 254 estudiantes (40.71% del total)
      </p>
    </div>
  );
};

// ==================== 5. COMPONENTE: EFICIENCIA VISUAL ====================
// Muestra: Gráfico de barras comparativa por carrera

const ComponenteEficiencia = () => {
  const carreras = [
    { nombre: "Primaria", eficiencia: 112.95, color: "#4CAF50" },
    { nombre: "Secundaria", eficiencia: 93.15, color: "#FFC107" },
    { nombre: "Inicial", eficiencia: 107.67, color: "#4CAF50" }
  ];

  return (
    <div className="eficiencia">
      <h2>📈 EFICIENCIA DE COBRO POR CARRERA</h2>
      
      <div className="grafico-barras">
        {carreras.map((carrera, idx) => (
          <div key={idx} className="barra-item">
            <p className="label">{carrera.nombre}</p>
            <div className="barra-contenedor">
              <div 
                className="barra-lleno" 
                style={{
                  width: `${Math.min(carrera.eficiencia, 120)}%`,
                  backgroundColor: carrera.color
                }}
              />
              <p className="valor">{carrera.eficiencia}%</p>
            </div>
          </div>
        ))}
      </div>

      <div className="linea-referencia">
        <p>📍 100% = Cumplió el objetivo del mes</p>
        <p>↑ Mayor a 100% = Cobró más de lo esperado ✅</p>
        <p>↓ Menor a 100% = Falta cobrar ⚠️</p>
      </div>
    </div>
  );
};

// ==================== 6. COMPONENTE: PROYECCIÓN ====================
// Muestra: Si sigue así, cuánto cobrará el año?

const ComponenteProyeccion = () => {
  const proyeccion = {
    recaudado_hasta_hoy: 32929136.00,
    mes_actual: 8, // Agosto
    proyeccion_final: 41161420.00, // Proyección si sigue al mismo ritmo
    recaudable_año: 62400000.00,
    porcentaje_proyeccion: 65.92
  };

  return (
    <div className="proyeccion">
      <h2>🔮 PROYECCIÓN DEL AÑO</h2>
      
      <div className="contenedor-proyeccion">
        <div className="card">
          <h3>Recaudado hasta hoy</h3>
          <p className="numero">${proyeccion.recaudado_hasta_hoy.toLocaleString()}</p>
          <p className="mes">Mes {proyeccion.mes_actual} de 10</p>
        </div>

        <div className="flecha">→</div>

        <div className="card proyectado">
          <h3>Si sigue así, recaudará</h3>
          <p className="numero amarillo">${proyeccion.proyeccion_final.toLocaleString()}</p>
          <p className="porcentaje">{proyeccion.porcentaje_proyeccion}% del total</p>
        </div>

        <div className="card objetivo">
          <h3>Total Recaudable Año</h3>
          <p className="numero">${proyeccion.recaudable_año.toLocaleString()}</p>
          <p className="falta">Faltarían: ${(proyeccion.recaudable_año - proyeccion.proyeccion_final).toLocaleString()}</p>
        </div>
      </div>

      <div className="recomendacion">
        <p className="titulo">💡 RECOMENDACIÓN:</p>
        <p className="texto">
          Si mantiene el ritmo actual, solo cobrará {proyeccion.porcentaje_proyeccion}% del total anual. 
          Necesita aumentar la recaudación un 34% para cumplir el objetivo.
        </p>
      </div>
    </div>
  );
};

// ==================== ESTILOS (CSS) ====================

const estilos = `
/* RESUMEN EJECUTIVO */
.resumen-ejecutivo {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 10px;
  margin-bottom: 20px;
}

.comparativa {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.card.verde {
  border-left: 5px solid #4CAF50;
}

.card.rojo {
  border-left: 5px solid #F44336;
}

.monto {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 10px 0;
}

.grafico-barra {
  margin-top: 20px;
}

.barra-completa {
  display: flex;
  height: 40px;
  border-radius: 20px;
  overflow: hidden;
  background: #ddd;
}

.barra-cobrada {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4CAF50;
  color: white;
  font-weight: bold;
}

.barra-pendiente {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F44336;
  color: white;
  font-weight: bold;
}

/* TABLA DE CARRERAS */
.tabla-carreras {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.tabla-carreras th {
  background: #333;
  color: white;
  padding: 15px;
  text-align: left;
  font-weight: bold;
}

.tabla-carreras td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.tabla-carreras tr.verde {
  background: #E8F5E9;
}

.tabla-carreras tr.amarillo {
  background: #FFF9C4;
}

.badge {
  padding: 5px 10px;
  border-radius: 20px;
  color: white;
  font-weight: bold;
  display: inline-block;
}

/* INDICADORES */
.en-mora {
  color: #F44336;
  font-weight: bold;
}

.en-mora .porcentaje {
  font-size: 12px;
  color: #999;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .comparativa {
    grid-template-columns: 1fr;
  }
  
  .tabla-carreras {
    font-size: 12px;
  }
}
`;

export {
  ComponenteResumenEjecutivo,
  ComponentePorCarrera,
  ComponenteMetaMes,
  ComponenteTopMora,
  ComponenteEficiencia,
  ComponenteProyeccion
};
