# STULZ ESPAÑA — MODELO SEMÁNTICO Y DAX POWER BI (SGP-F)

> **REGLA FUNDAMENTAL (RN-5):** Power BI **NUNCA** se conecta a archivos Excel.  
> Consume **exclusivamente** las vistas y tablas de **SQL Server** (`SGP_FABRICA_STULZ`) en modo **DirectQuery** o **Import Programado**.  
> **Líneas objeto de análisis:** `L1`, `L2`, `L3`, `L4`, `L5`, `BOX 1` (Baterías excluida).

---

## 1. Arquitectura de Datos: Esquema en Estrella

```
                    ┌─────────────────────────┐
                    │      Dim_Fecha          │
                    │   (Calendario Planta)   │
                    └───────────┬─────────────┘
                                │ 1
                                │
                                │ *
┌────────────────────────┐  *   │   1  ┌────────────────────────┐
│      Dim_Lineas        ├──────┼──────┤     Dim_Puestos        │
│ (L1..L5, BOX 1)        │      │      │ (Mecánicos, Eléctricos)│
└───────────┬────────────┘      │      └───────────┬────────────┘
            │ 1                 │                  │ 1
            │                   │                  │
            │ *                 │ *                │ *
┌───────────┴───────────────────┴──────────────────┴────────────┐
│                  Fact_Plantilla_Actual                        │
│          (Origen: dbo.vw_PBI_PlantillaActual)                 │
└───────────────────────────────┬───────────────────────────────┘
                                │ 1
                                │
                                │ *
┌───────────────────────────────┴───────────────────────────────┐
│              Fact_Historico_Asignaciones_SCD2                 │
│         (Origen: dbo.vw_PBI_HistoricoAsignaciones)            │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Vistas SQL Server Consumidas

| Vista en SQL Server | Propósito Power BI | Modo de Almacenamiento |
| :--- | :--- | :--- |
| `dbo.vw_PBI_PlantillaActual` | Tabla de Hechos de plantilla y asignaciones vigentes | DirectQuery / Dual |
| `dbo.vw_PBI_LeanBalanceLineas` | Monitor de balanceo Lean de 14 FTE (10 Mec + 4 Elec) | DirectQuery |
| `dbo.vw_PBI_HistoricoAsignaciones` | Análisis de rotación y permanencia temporal (SCD2) | Import Programado |
| `dbo.vw_PBI_CaducidadFormacion` | Radar de prevención y caducidad de certificaciones | DirectQuery |
| `dbo.vw_PBI_MatrizCompetencias` | Polivalencia y niveles de competencia (1 a 4) | Dual |
| `dbo.vw_PBI_Auditoria` | Trazabilidad de cumplimiento y seguridad | Import Diario |

---

## 3. Catálogo de Medidas DAX Oficiales

### 3.1 Presencia y Capacidad Efectiva (7,75 h)

```dax
// Total de operarios activos en planta
[Total Operarios Activos] = 
CALCULATE(
    COUNTROWS('vw_PBI_PlantillaActual'),
    'vw_PBI_PlantillaActual'[Estado] = "Activo"
)
```

```dax
// Total FTE efectivo considerando factor 0.30 para operarios en formación
[Total FTE Efectivo] = 
SUM('vw_PBI_PlantillaActual'[FactorFTE])
```

```dax
// Horas efectivas computadas por presencia en línea (7,75 h por turno)
[Horas Efectivas Imputadas] = 
[Total Operarios Activos] * 7.75
```

```dax
// Operarios en periodo de formación inicial (FTE = 0.3)
[Operarios en Formacion] = 
CALCULATE(
    COUNTROWS('vw_PBI_PlantillaActual'),
    'vw_PBI_PlantillaActual'[EnFormacion] = TRUE(),
    'vw_PBI_PlantillaActual'[Estado] = "Activo"
)
```

---

### 3.2 Balanceo Lean Manufacturing (14 FTE Target)

```dax
// Target FTE fijado para la línea seleccionada (14 FTE en Gemelas, 8 FTE en Box 1)
[Target FTE Linea] = 
SELECTEDVALUE('vw_PBI_LeanBalanceLineas'[CapacidadTargetFTE], 14.00)
```

```dax
// Desviación respecto al objetivo Lean
[Gap FTE Linea] = 
[Total FTE Efectivo] - [Target FTE Linea]
```

```dax
// Indicador de Semáforo de Balanceo Lean
[Estado Balanceo Linea] = 
VAR _gap = [Gap FTE Linea]
RETURN
    SWITCH(
        TRUE(),
        _gap < -2.0, "Cuello de Botella Crítico (Rojo)",
        _gap < 0.0,  "Alerta Leve de Refuerzo (Ámbar)",
        "Línea Balanceada (Verde)"
    )
```

```dax
// Ratio de Cobertura de Especialidad Eléctrica (Mínimo 4 por línea gemela)
[Cobertura Electricos] = 
VAR _electr = CALCULATE(COUNTROWS('vw_PBI_PlantillaActual'), 'vw_PBI_PlantillaActual'[Categoria Puesto] = "Eléctrica", 'vw_PBI_PlantillaActual'[Estado] = "Activo")
VAR _target = SELECTEDVALUE('vw_PBI_LeanBalanceLineas'[MinElectricos], 4)
RETURN
    DIVIDE(_electr, _target, 0)
```

---

### 3.3 Formación, Seguridad y Absentismo

```dax
// Tasa oficial de absentismo
[Tasa Absentismo %] = 
VAR _totalPlantilla = COUNTROWS('vw_PBI_PlantillaActual')
VAR _bajas = CALCULATE(
    COUNTROWS('vw_PBI_PlantillaActual'),
    'vw_PBI_PlantillaActual'[Estado] IN {"Baja", "BajaMedica_IT"}
)
RETURN
    DIVIDE(_bajas, _totalPlantilla, 0)
```

```dax
// Cursos caducados que bloquean la operación
[Certificaciones Caducadas] = 
CALCULATE(
    COUNTROWS('vw_PBI_CaducidadFormacion'),
    'vw_PBI_CaducidadFormacion'[DiasHastaCaducidad] < 0
)
```

```dax
// Alerta preventiva de formación (< 30 días para caducar)
[Certificaciones Proximas Caducar (<30d)] = 
CALCULATE(
    COUNTROWS('vw_PBI_CaducidadFormacion'),
    'vw_PBI_CaducidadFormacion'[DiasHastaCaducidad] >= 0,
    'vw_PBI_CaducidadFormacion'[DiasHastaCaducidad] <= 30
)
```

---

## 4. Consulta Histórica Time Machine en DAX (Regla 7)

Para responder a la pregunta de negocio:  
*«¿En qué línea estaba asignado un empleado en una fecha arbitraria seleccionada por el usuario (ej. 15/04/2026)?»*

```dax
[Linea en Fecha Seleccionada] = 
VAR _fechaFiltro = SELECTEDVALUE('Dim_Fecha'[Fecha])
RETURN
    CALCULATE(
        FIRSTNONBLANK('vw_PBI_HistoricoAsignaciones'[CodigoLinea], 1),
        FILTER(
            'vw_PBI_HistoricoAsignaciones',
            'vw_PBI_HistoricoAsignaciones'[FechaInicio] <= _fechaFiltro &&
            ('vw_PBI_HistoricoAsignaciones'[FechaFin] >= _fechaFiltro || ISBLANK('vw_PBI_HistoricoAsignaciones'[FechaFin]))
        )
    )
```

---

## 5. Parámetros de Cadena de Conexión en Power BI Desktop

Al configurar el origen en Power BI Desktop:
- **Tipo de Origen:** SQL Server Database
- **Servidor:** `localhost:1433` (o nombre de host del servidor de planta)
- **Base de Datos:** `SGP_FABRICA_STULZ`
- **Modo de Conectividad de Datos:** `DirectQuery`
- **Opciones Avanzadas:** Sin sentencias SQL personalizadas; vincular directamente a las vistas `dbo.vw_PBI_*`.
