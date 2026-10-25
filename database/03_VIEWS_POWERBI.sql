-- ==============================================================================
-- STULZ ESPAÑA — VISTAS OPTIMIZADAS PARA POWER BI (IMPORT / DIRECTQUERY)
-- ==============================================================================
-- REGLA 5: Power BI NUNCA lee Excel. Solo consulta estas vistas SQL Server.
-- ==============================================================================

USE SGP_FABRICA_STULZ;
GO

-- 1. Vista de Plantilla Actual (Dim_Empleado / Fact_Plantilla)
CREATE OR ALTER VIEW dbo.vw_PBI_PlantillaActual
AS
SELECT 
    e.IdEmpleado,
    e.CodigoEmpleado AS [Codigo Zucchetti],
    e.SiglasERP AS [Siglas ERP],
    e.NombreCompleto AS [Operario],
    e.Estado,
    e.FechaAlta,
    e.FechaBaja,
    e.EnFormacion,
    e.FactorFTE,
    
    -- Organización
    d.Nombre AS [Departamento],
    ISNULL(l.CodigoLinea, 'SIN_LINEA') AS [Codigo Linea],
    ISNULL(l.Nombre, 'Sin Línea Asignada') AS [Linea Produccion],
    l.TipoLinea AS [Tipo Linea],
    ISNULL(p.Nombre, 'Sin Puesto Asignado') AS [Puesto Trabajo],
    p.Categoria AS [Categoria Puesto],
    t.CodigoTurno AS [Codigo Turno],
    t.Nombre AS [Turno],
    t.HorasEfectivas AS [Horas Efectivas Turno],
    c.Nombre AS [Centro],
    c.Planta AS [Planta],
    ISNULL(resp.NombreCompleto, 'Sin Responsable') AS [Responsable Directo]
FROM dbo.Empleados e
INNER JOIN dbo.Departamentos d ON e.IdDepartamento = d.IdDepartamento
INNER JOIN dbo.Turnos t ON e.IdTurnoActual = t.IdTurno
LEFT JOIN dbo.Lineas l ON e.IdLineaActual = l.IdLinea
LEFT JOIN dbo.Centros c ON l.IdCentro = c.IdCentro
LEFT JOIN dbo.Puestos p ON e.IdPuestoActual = p.IdPuesto
LEFT JOIN dbo.Empleados resp ON e.IdResponsableActual = resp.IdEmpleado;
GO

-- 2. Vista de Balance Lean de Líneas (FTE Actual vs 14 Target)
CREATE OR ALTER VIEW dbo.vw_PBI_LeanBalanceLineas
AS
SELECT 
    l.IdLinea,
    l.CodigoLinea,
    l.Nombre AS LineaNombre,
    l.CapacidadTargetFTE,
    l.MinMecanicos,
    l.MinElectricos,
    COUNT(CASE WHEN e.Estado = 'Activo' THEN e.IdEmpleado END) AS TotalOperariosAsignados,
    SUM(CASE WHEN e.Estado = 'Activo' THEN e.FactorFTE ELSE 0 END) AS TotalFTEActual,
    SUM(CASE WHEN e.Estado = 'Activo' AND p.Categoria = 'Mecánica' THEN 1 ELSE 0 END) AS TotalMecanicos,
    SUM(CASE WHEN e.Estado = 'Activo' AND p.Categoria = 'Eléctrica' THEN 1 ELSE 0 END) AS TotalElectricos,
    SUM(CASE WHEN e.Estado = 'Activo' AND e.EnFormacion = 1 THEN 1 ELSE 0 END) AS TotalEnFormacion,
    -- Desviación
    CAST(SUM(CASE WHEN e.Estado = 'Activo' THEN e.FactorFTE ELSE 0 END) - l.CapacidadTargetFTE AS DECIMAL(4,2)) AS GapFTE,
    CASE 
        WHEN SUM(CASE WHEN e.Estado = 'Activo' THEN e.FactorFTE ELSE 0 END) >= l.CapacidadTargetFTE THEN 'Balanceada'
        WHEN SUM(CASE WHEN e.Estado = 'Activo' THEN e.FactorFTE ELSE 0 END) >= (l.CapacidadTargetFTE - 2) THEN 'Alerta Leve'
        ELSE 'Cuello de Botella Crítico'
    END AS EstadoBalanceo
FROM dbo.Lineas l
LEFT JOIN dbo.Empleados e ON l.IdLinea = e.IdLineaActual AND e.Estado = 'Activo'
LEFT JOIN dbo.Puestos p ON e.IdPuestoActual = p.IdPuesto
WHERE l.Activo = 1
GROUP BY l.IdLinea, l.CodigoLinea, l.Nombre, l.CapacidadTargetFTE, l.MinMecanicos, l.MinElectricos;
GO

-- 3. Vista de Histórico Completo de Asignaciones (SCD Tipo 2)
CREATE OR ALTER VIEW dbo.vw_PBI_HistoricoAsignaciones
AS
SELECT 
    lh.IdAsignacionLinea,
    e.IdEmpleado,
    e.CodigoEmpleado,
    e.SiglasERP,
    e.NombreCompleto AS Operario,
    l.CodigoLinea,
    l.Nombre AS LineaNombre,
    lh.FechaInicio,
    ISNULL(lh.FechaFin, '2099-12-31 23:59:59') AS FechaFin,
    CASE WHEN lh.FechaFin IS NULL THEN 1 ELSE 0 END AS EsAsignacionVigente,
    DATEDIFF(DAY, lh.FechaInicio, ISNULL(lh.FechaFin, SYSUTCDATETIME())) AS DiasEnLinea,
    lh.MotivoCambio,
    lh.UsuarioCreacion
FROM dbo.Empleado_Linea_Historico lh
INNER JOIN dbo.Empleados e ON lh.IdEmpleado = e.IdEmpleado
INNER JOIN dbo.Lineas l ON lh.IdLinea = l.IdLinea;
GO

-- 4. Vista de Matriz de Formación y Alertas de Caducidad
CREATE OR ALTER VIEW dbo.vw_PBI_CaducidadFormacion
AS
SELECT 
    ef.IdEmpleadoFormacion,
    e.CodigoEmpleado,
    e.SiglasERP,
    e.NombreCompleto AS Operario,
    e.Estado AS EstadoEmpleado,
    l.CodigoLinea AS LineaActual,
    f.CodigoCurso,
    f.NombreCurso,
    f.Tipo AS TipoFormacion,
    ef.FechaObtencion,
    ef.FechaCaducidad,
    DATEDIFF(DAY, CAST(GETDATE() AS DATE), ef.FechaCaducidad) AS DiasHastaCaducidad,
    CASE 
        WHEN ef.FechaCaducidad IS NULL THEN 'Permanente'
        WHEN ef.FechaCaducidad < CAST(GETDATE() AS DATE) THEN 'CADUCADO'
        WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), ef.FechaCaducidad) <= 30 THEN 'URGENTE (<30d)'
        WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), ef.FechaCaducidad) <= 60 THEN 'PROXIMA (<60d)'
        ELSE 'Vigente'
    END AS EstadoSemaforoCaducidad,
    ef.Calificacion,
    ef.HorasFormacion
FROM dbo.Empleado_Formacion ef
INNER JOIN dbo.Empleados e ON ef.IdEmpleado = e.IdEmpleado
INNER JOIN dbo.Formaciones f ON ef.IdFormacion = f.IdFormacion
LEFT JOIN dbo.Lineas l ON e.IdLineaActual = l.IdLinea;
GO

-- 5. Vista de Matriz de Competencias y Polivalencia
CREATE OR ALTER VIEW dbo.vw_PBI_MatrizCompetencias
AS
SELECT 
    e.IdEmpleado,
    e.CodigoEmpleado,
    e.SiglasERP,
    e.NombreCompleto AS Operario,
    p.CodigoPuesto,
    p.Nombre AS PuestoNombre,
    p.Categoria AS CategoriaPuesto,
    ec.NivelCompetencia,
    CASE ec.NivelCompetencia
        WHEN 1 THEN '1 - Novato (Con tutor)'
        WHEN 2 THEN '2 - Autónomo'
        WHEN 3 THEN '3 - Avanzado'
        WHEN 4 THEN '4 - Experto / Formador'
        ELSE 'No evaluado'
    END AS NivelDescripcion,
    ec.FechaEvaluacion,
    eval.NombreCompleto AS Evaluador
FROM dbo.Empleado_Competencia ec
INNER JOIN dbo.Empleados e ON ec.IdEmpleado = e.IdEmpleado
INNER JOIN dbo.Puestos p ON ec.IdPuesto = p.IdPuesto
LEFT JOIN dbo.Empleados eval ON ec.IdEvaluador = eval.IdEmpleado
WHERE ec.Activo = 1;
GO

-- 6. Vista de Auditoría Trazable
CREATE OR ALTER VIEW dbo.vw_PBI_Auditoria
AS
SELECT 
    IdAuditoria,
    Usuario,
    FechaHora,
    CAST(FechaHora AS DATE) AS Fecha,
    Modulo,
    Tabla,
    RegistroId,
    Campo,
    ValorAnterior,
    ValorNuevo,
    Accion,
    DireccionIP
FROM dbo.Auditoria;
GO
