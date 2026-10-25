-- ==============================================================================
-- STULZ ESPAÑA — CARGA INICIAL DE DATOS MAESTROS (SEED DATA)
-- ==============================================================================
-- LÍNEAS OBJETO DE ANÁLISIS: L1, L2, L3, L4, L5 y BOX 1
-- NOTA DIRECTIVA: 'BATERÍAS' QUEDA EXCLUIDA COMPLETAMENTE DEL SISTEMA.
-- ==============================================================================

USE SGP_FABRICA_STULZ;
GO

SET NOCOUNT ON;

-- 1. Centros
IF NOT EXISTS (SELECT 1 FROM dbo.Centros WHERE CodigoCentro = 'STULZ_COS_01')
BEGIN
    INSERT INTO dbo.Centros (CodigoCentro, Nombre, Planta, Nave, Direccion)
    VALUES ('STULZ_COS_01', 'STULZ Tecnivel España S.A.', 'Planta Coslada', 'Nave 1 Fabricación', 'Calle de la Tecnología, 12, Coslada, Madrid');
END;

DECLARE @IdCentro INT = (SELECT TOP 1 IdCentro FROM dbo.Centros WHERE CodigoCentro = 'STULZ_COS_01');

-- 2. Departamentos
IF NOT EXISTS (SELECT 1 FROM dbo.Departamentos WHERE CodigoDepartamento = 'DEP_PROD')
BEGIN
    INSERT INTO dbo.Departamentos (CodigoDepartamento, Nombre, Descripcion)
    VALUES 
        ('DEP_PROD', 'Producción Climatización', 'Líneas de montaje de climatizadores de precisión'),
        ('DEP_CAL', 'Calidad y Metrología', 'Control de calidad en línea y pruebas finales'),
        ('DEP_LOG', 'Logística y Almacén', 'Abastecimiento de componentes a línea de producción'),
        ('DEP_MANT', 'Mantenimiento Industrial', 'Mantenimiento electromecánico preventivo y correctivo');
END;

-- 3. Líneas de Producción (ÚNICAMENTE L1, L2, L3, L4, L5 y BOX 1 - BATERÍAS ELIMINADA)
IF NOT EXISTS (SELECT 1 FROM dbo.Lineas WHERE CodigoLinea = 'L1')
BEGIN
    INSERT INTO dbo.Lineas (CodigoLinea, Nombre, IdCentro, TipoLinea, CapacidadTargetFTE, MinMecanicos, MinElectricos, Estado)
    VALUES 
        ('L1', 'Línea 1 - Climatizadores Gemela', @IdCentro, 'Gemela', 14.00, 10, 4, 'Operativa'),
        ('L2', 'Línea 2 - Climatizadores Gemela', @IdCentro, 'Gemela', 14.00, 10, 4, 'Operativa'),
        ('L3', 'Línea 3 - Climatizadores Gemela', @IdCentro, 'Gemela', 14.00, 10, 4, 'Operativa'),
        ('L4', 'Línea 4 - Climatizadores Gemela', @IdCentro, 'Gemela', 14.00, 10, 4, 'Operativa'),
        ('L5', 'Línea 5 - Climatizadores Gemela', @IdCentro, 'Gemela', 14.00, 10, 4, 'Operativa'),
        ('BOX 1', 'Box 1 - Unidades Especiales / Prototipos', @IdCentro, 'Box', 8.00, 6, 2, 'Operativa');
END;

-- 4. Puestos de Trabajo
IF NOT EXISTS (SELECT 1 FROM dbo.Puestos WHERE CodigoPuesto = 'P_MEC')
BEGIN
    INSERT INTO dbo.Puestos (CodigoPuesto, Nombre, Categoria, RequiereCertificacion)
    VALUES 
        ('P_MEC', 'Montador Mecánico', 'Mecánica', 0),
        ('P_ELEC', 'Montador Eléctrico', 'Eléctrica', 1),
        ('P_OPER_GRUA', 'Operador de Puente Grúa', 'Logística', 1),
        ('P_PINT', 'Pintor Industrial', 'Mecánica', 0),
        ('P_LOG', 'Operario de Logística', 'Logística', 1),
        ('P_CAL', 'Técnico de Calidad', 'Calidad', 1),
        ('P_RESP_LINEA', 'Responsable de Línea', 'Mandos', 1),
        ('P_SUPERV', 'Supervisor de Turno', 'Mandos', 1);
END;

-- 5. Turnos de Trabajo
IF NOT EXISTS (SELECT 1 FROM dbo.Turnos WHERE CodigoTurno = 'T1')
BEGIN
    INSERT INTO dbo.Turnos (CodigoTurno, Nombre, HoraInicio, HoraFin, HorasEfectivas)
    VALUES 
        ('T1', 'Turno 1 - Mañana (06:00 - 14:00)', '06:00:00', '14:00:00', 7.75),
        ('T2', 'Turno 2 - Tarde (14:00 - 22:00)', '14:00:00', '22:00:00', 7.75),
        ('TC', 'Turno Central (08:00 - 17:00)', '08:00:00', '17:00:00', 7.75);
END;

-- 6. Catálogo de Formaciones
IF NOT EXISTS (SELECT 1 FROM dbo.Formaciones WHERE CodigoCurso = 'FORM_PRL')
BEGIN
    INSERT INTO dbo.Formaciones (CodigoCurso, NombreCurso, Tipo, MesesValidez, Organizador)
    VALUES 
        ('FORM_PRL', 'PRL Básico Planta Climatización', 'Legal', 36, 'Servicio Prevención STULZ'),
        ('FORM_GRUA', 'Operador Puente Grúa 10T', 'Seguridad', 24, 'Centro de Formación Homologado'),
        ('FORM_CARRET', 'Carretillas Elevadoras UNE 58451', 'Seguridad', 36, 'Autoescuela Industrial'),
        ('FORM_ELEC_BT', 'Riesgo Eléctrico RD 614/2001 (Baja Tensión)', 'Seguridad', 24, 'Ingeniería y Seguridad'),
        ('FORM_AUXILIOS', 'Primeros Auxilios y DEA', 'Seguridad', 12, 'Cruz Roja Española');
END;

-- 7. Carga de Empleados de Producción
DECLARE @IdDepProd INT = (SELECT IdDepartamento FROM dbo.Departamentos WHERE CodigoDepartamento = 'DEP_PROD');
DECLARE @IdT1 INT = (SELECT IdTurno FROM dbo.Turnos WHERE CodigoTurno = 'T1');
DECLARE @IdT2 INT = (SELECT IdTurno FROM dbo.Turnos WHERE CodigoTurno = 'T2');
DECLARE @IdL1 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L1');
DECLARE @IdL2 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L2');
DECLARE @IdL3 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L3');
DECLARE @IdL4 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L4');
DECLARE @IdL5 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L5');
DECLARE @IdBox1 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'BOX 1');

DECLARE @IdPMec INT = (SELECT IdPuesto FROM dbo.Puestos WHERE CodigoPuesto = 'P_MEC');
DECLARE @IdPElec INT = (SELECT IdPuesto FROM dbo.Puestos WHERE CodigoPuesto = 'P_ELEC');
DECLARE @IdPResp INT = (SELECT IdPuesto FROM dbo.Puestos WHERE CodigoPuesto = 'P_RESP_LINEA');

-- Supervisor / Responsable Base
IF NOT EXISTS (SELECT 1 FROM dbo.Empleados WHERE SiglasERP = 'CGN')
BEGIN
    INSERT INTO dbo.Empleados (CodigoEmpleado, SiglasERP, Nombre, Apellidos, IdDepartamento, IdLineaActual, IdPuestoActual, IdTurnoActual, Estado, FechaAlta)
    VALUES ('401001', 'CGN', 'CARLOS', 'GOMEZ NAVARRO', @IdDepProd, @IdL1, @IdPResp, @IdT1, 'Activo', '2024-01-15');
END;

DECLARE @IdRespCGN INT = (SELECT IdEmpleado FROM dbo.Empleados WHERE SiglasERP = 'CGN');

-- Operarios de Línea (15 Operarios Auténticos de Fábrica)
DECLARE @OperariosData TABLE (
    CodZucchetti NVARCHAR(20),
    Siglas NVARCHAR(10),
    Nombre NVARCHAR(60),
    Apellidos NVARCHAR(100),
    LineaId INT,
    PuestoId INT,
    TurnoId INT,
    EnFormacion BIT,
    Estado NVARCHAR(20)
);

INSERT INTO @OperariosData VALUES
('401002', 'JAPE', 'JOSE ANTONIO', 'PICHARDO ESPINA', @IdL1, @IdPResp, @IdT1, 0, 'Activo'),
('401437', 'EJAY', 'EDUARDO', 'JIMENEZ AYALA', @IdL1, @IdPElec, @IdT1, 0, 'Activo'),
('401438', 'SDU', 'SAMUEL', 'DORADO UBEDA', @IdL1, @IdPMec, @IdT1, 1, 'Activo'), -- En formación (0.3 FTE)
('401439', 'JMVM', 'JUAN MAURICIO', 'VICENTE MARTIN', @IdL1, @IdPMec, @IdT1, 0, 'Activo'),
('401440', 'DFM', 'DAVID', 'FERNANDEZ MORALES', @IdL2, @IdPElec, @IdT1, 0, 'Activo'),
('401441', 'ERM', 'ENRIQUE', 'RODRIGUEZ MARIN', @IdL2, @IdPMec, @IdT1, 0, 'Baja'), -- Baja médica IT
('401442', 'MSP', 'MANUEL', 'SANCHEZ PRIETO', @IdL3, @IdPMec, @IdT1, 1, 'Activo'), -- En formación (0.3 FTE)
('401443', 'LBC', 'LUIS', 'BENITEZ CASTRO', @IdL3, @IdPElec, @IdT1, 0, 'Activo'),
('401444', 'DMV', 'DANIEL', 'MARTIN VEGA', @IdL4, @IdPMec, @IdT1, 0, 'Activo'),
('401522', 'EJAY', 'EDDY JONATHAN', 'ACEVEDO YURI', @IdL4, @IdPElec, @IdT2, 0, 'Activo'),
('401445', 'RIO', 'ROBERTO', 'IGLESIAS ORTIZ', @IdL5, @IdPElec, @IdT2, 0, 'Activo'),
('401520', 'DMV', 'DAVID', 'MORENO VEGA', @IdL5, @IdPMec, @IdT1, 0, 'Activo'),
('401446', 'JPL', 'JAVIER', 'PEREZ LOPEZ', @IdBox1, @IdPMec, @IdT1, 0, 'Activo'),
('401447', 'MSP', 'MARCOS', 'SANZ PAREDES', @IdBox1, @IdPMec, @IdT1, 0, 'Activo');

MERGE dbo.Empleados AS TARGET
USING @OperariosData AS SOURCE
ON (TARGET.CodigoEmpleado = SOURCE.CodZucchetti)
WHEN NOT MATCHED THEN
    INSERT (CodigoEmpleado, SiglasERP, Nombre, Apellidos, IdDepartamento, IdLineaActual, IdPuestoActual, IdTurnoActual, IdResponsableActual, Estado, EnFormacion, FechaAlta)
    VALUES (SOURCE.CodZucchetti, SOURCE.Siglas, SOURCE.Nombre, SOURCE.Apellidos, @IdDepProd, SOURCE.LineaId, SOURCE.PuestoId, SOURCE.TurnoId, @IdRespCGN, SOURCE.Estado, SOURCE.EnFormacion, '2025-01-10');

-- 8. Poblar Asignaciones Históricas Activas (SCD Tipo 2)
INSERT INTO dbo.Empleado_Linea_Historico (IdEmpleado, IdLinea, FechaInicio, FechaFin, MotivoCambio, UsuarioCreacion)
SELECT e.IdEmpleado, e.IdLineaActual, '2026-01-01 06:00:00', NULL, 'Asignación Inicial de Cuadrante', 'SISTEMA_SEED'
FROM dbo.Empleados e
WHERE e.IdLineaActual IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Empleado_Linea_Historico h WHERE h.IdEmpleado = e.IdEmpleado AND h.FechaFin IS NULL);

INSERT INTO dbo.Empleado_Puesto_Historico (IdEmpleado, IdPuesto, FechaInicio, FechaFin, MotivoCambio, UsuarioCreacion)
SELECT e.IdEmpleado, e.IdPuestoActual, '2026-01-01 06:00:00', NULL, 'Puesto Vigente de Cuadrante', 'SISTEMA_SEED'
FROM dbo.Empleados e
WHERE e.IdPuestoActual IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Empleado_Puesto_Historico h WHERE h.IdEmpleado = e.IdEmpleado AND h.FechaFin IS NULL);

-- 9. Registrar Formaciones de Ejemplo
DECLARE @IdFormPRL INT = (SELECT IdFormacion FROM dbo.Formaciones WHERE CodigoCurso = 'FORM_PRL');
DECLARE @IdFormGrua INT = (SELECT IdFormacion FROM dbo.Formaciones WHERE CodigoCurso = 'FORM_GRUA');
DECLARE @IdFormElec INT = (SELECT IdFormacion FROM dbo.Formaciones WHERE CodigoCurso = 'FORM_ELEC_BT');

INSERT INTO dbo.Empleado_Formacion (IdEmpleado, IdFormacion, FechaObtencion, FechaCaducidad, Estado, Calificacion, HorasFormacion)
SELECT e.IdEmpleado, @IdFormPRL, '2025-02-01', '2028-02-01', 'Vigente', 'Apto', 8.0
FROM dbo.Empleados e
WHERE NOT EXISTS (SELECT 1 FROM dbo.Empleado_Formacion f WHERE f.IdEmpleado = e.IdEmpleado AND f.IdFormacion = @IdFormPRL);

-- Simular una formación próxima a caducar (< 30 días) para probar alertas
INSERT INTO dbo.Empleado_Formacion (IdEmpleado, IdFormacion, FechaObtencion, FechaCaducidad, Estado, Calificacion, HorasFormacion)
SELECT TOP 2 e.IdEmpleado, @IdFormGrua, '2024-11-20', DATEADD(DAY, 15, CAST(GETDATE() AS DATE)), 'ProximaCaducar', 'Apto', 16.0
FROM dbo.Empleados e
WHERE NOT EXISTS (SELECT 1 FROM dbo.Empleado_Formacion f WHERE f.IdEmpleado = e.IdEmpleado AND f.IdFormacion = @IdFormGrua);

PRINT N'Carga inicial completada exitosamente. Líneas operativas: L1, L2, L3, L4, L5, BOX 1 (Baterías eliminada).';
GO
