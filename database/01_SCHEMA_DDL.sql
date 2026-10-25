-- ==============================================================================
-- STULZ ESPAÑA — SISTEMA DE GESTIÓN DE PERSONAL DE FABRICACIÓN (SGP-F)
-- SCRIPT DDL: BASE DE DATOS MAESTRA, HISTÓRICOS (SCD TIPO 2) Y AUDITORÍA
-- ==============================================================================
-- MOTOR: Microsoft SQL Server 2019 / 2022
-- PRINCIPIO: Single Source of Truth (SSOT). Excel queda 100% obsoleto.
-- REGLAS CUMPLIDAS: RN-1 a RN-8 (Inmutabilidad, No borrado físico, SCD2, Auditoría)
-- ==============================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SGP_FABRICA_STULZ')
BEGIN
    CREATE DATABASE SGP_FABRICA_STULZ
    COLLATE Modern_Spanish_CI_AS;
END
GO

USE SGP_FABRICA_STULZ;
GO

-- ==============================================================================
-- 1. TABLAS MAESTRAS ORGANIZATIVAS Y DE CONFIGURACIÓN
-- ==============================================================================

-- 1.1 Centros de Trabajo
IF OBJECT_ID(N'dbo.Centros', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Centros (
        IdCentro INT IDENTITY(1,1) PRIMARY KEY,
        CodigoCentro NVARCHAR(20) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Planta NVARCHAR(100) NOT NULL DEFAULT 'Planta Principal Coslada',
        Nave NVARCHAR(50) NOT NULL DEFAULT 'Nave Fabricación',
        Direccion NVARCHAR(200) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

-- 1.2 Departamentos
IF OBJECT_ID(N'dbo.Departamentos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Departamentos (
        IdDepartamento INT IDENTITY(1,1) PRIMARY KEY,
        CodigoDepartamento NVARCHAR(20) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(255) NULL,
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- 1.3 Líneas de Producción
IF OBJECT_ID(N'dbo.Lineas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Lineas (
        IdLinea INT IDENTITY(1,1) PRIMARY KEY,
        CodigoLinea NVARCHAR(20) NOT NULL UNIQUE,      -- L1, L2, L3, L4, L5, BOX 1 (Sin Baterías)
        Nombre NVARCHAR(100) NOT NULL,                 -- Línea 1 Climatizadores, etc.
        IdCentro INT NOT NULL FOREIGN KEY REFERENCES dbo.Centros(IdCentro),
        TipoLinea NVARCHAR(50) NOT NULL DEFAULT 'Gemela', -- Gemela, Box, Auxiliar
        CapacidadTargetFTE DECIMAL(4,2) NOT NULL DEFAULT 14.00, -- Lean Target: 14 FTE
        MinMecanicos INT NOT NULL DEFAULT 10,
        MinElectricos INT NOT NULL DEFAULT 4,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Operativa', -- Operativa, Mantenimiento, Parada
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- 1.4 Puestos de Trabajo
IF OBJECT_ID(N'dbo.Puestos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Puestos (
        IdPuesto INT IDENTITY(1,1) PRIMARY KEY,
        CodigoPuesto NVARCHAR(30) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,                 -- Montador Mecánico, Montador Eléctrico, Soldador, etc.
        Categoria NVARCHAR(50) NOT NULL,               -- Mecánica, Eléctrica, Logística, Calidad, Mandos
        Descripcion NVARCHAR(255) NULL,
        RequiereCertificacion BIT NOT NULL DEFAULT 0,
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- 1.5 Turnos de Trabajo
IF OBJECT_ID(N'dbo.Turnos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Turnos (
        IdTurno INT IDENTITY(1,1) PRIMARY KEY,
        CodigoTurno NVARCHAR(20) NOT NULL UNIQUE,      -- T1, T2, TN, TC
        Nombre NVARCHAR(50) NOT NULL,                  -- Mañana (06:00-14:00), Tarde (14:00-22:00)
        HoraInicio TIME(0) NOT NULL,
        HoraFin TIME(0) NOT NULL,
        HorasEfectivas DECIMAL(4,2) NOT NULL DEFAULT 7.75, -- 7,75 h efectivas por presencia
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- 1.6 Catálogo de Formaciones y Certificaciones
IF OBJECT_ID(N'dbo.Formaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Formaciones (
        IdFormacion INT IDENTITY(1,1) PRIMARY KEY,
        CodigoCurso NVARCHAR(30) NOT NULL UNIQUE,
        NombreCurso NVARCHAR(150) NOT NULL,            -- PRL, Puente Grúa, Carretilla, Riesgo Eléctrico
        Tipo NVARCHAR(50) NOT NULL,                    -- Legal, Seguridad, Técnica, Calidad
        MesesValidez INT NULL,                         -- NULL = No caduca, 12, 24, 36 meses
        Organizador NVARCHAR(150) NULL,
        Descripcion NVARCHAR(255) NULL,
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- 1.7 Matriz de Formaciones Obligatorias por Puesto
IF OBJECT_ID(N'dbo.Puesto_Formacion_Obligatoria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Puesto_Formacion_Obligatoria (
        IdPuesto INT NOT NULL FOREIGN KEY REFERENCES dbo.Puestos(IdPuesto),
        IdFormacion INT NOT NULL FOREIGN KEY REFERENCES dbo.Formaciones(IdFormacion),
        EsBloqueanteParaOperar BIT NOT NULL DEFAULT 1,
        PRIMARY KEY (IdPuesto, IdFormacion)
    );
END;
GO

-- ==============================================================================
-- 2. TABLA MAESTRA DE EMPLEADOS (ESTADO VIGENTE)
-- ==============================================================================
-- REGLA 3: Nunca se elimina físicamente. Estados: 'Activo', 'Baja', 'Pendiente'
-- ==============================================================================
IF OBJECT_ID(N'dbo.Empleados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleados (
        IdEmpleado INT IDENTITY(1,1) PRIMARY KEY,
        CodigoEmpleado NVARCHAR(20) NOT NULL UNIQUE,   -- Zucchetti ID numérico (ej. 401437)
        SiglasERP NVARCHAR(10) NOT NULL UNIQUE,        -- Siglas ERP STULZ (ej. EJAY, SDU, CGN)
        Nombre NVARCHAR(60) NOT NULL,
        Apellidos NVARCHAR(100) NOT NULL,
        NombreCompleto AS (UPPER(Apellidos + ', ' + Nombre)) PERSISTED,
        DNI_NIE NVARCHAR(20) NULL,
        EmailCorporativo NVARCHAR(100) NULL,
        Telefono NVARCHAR(25) NULL,
        
        -- Relaciones Maestras Actuales
        IdDepartamento INT NOT NULL FOREIGN KEY REFERENCES dbo.Departamentos(IdDepartamento),
        IdLineaActual INT NULL FOREIGN KEY REFERENCES dbo.Lineas(IdLinea),
        IdPuestoActual INT NULL FOREIGN KEY REFERENCES dbo.Puestos(IdPuesto),
        IdTurnoActual INT NOT NULL FOREIGN KEY REFERENCES dbo.Turnos(IdTurno),
        IdResponsableActual INT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        
        -- Ciclo de Vida y Estados
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Pendiente', 
        -- Valores permitidos: 'Pendiente', 'Activo', 'Baja', 'BajaMedica_IT', 'Permiso'
        FechaAlta DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        FechaBaja DATE NULL,
        MotivoBaja NVARCHAR(200) NULL,
        ObservacionesBaja NVARCHAR(500) NULL,
        
        -- Capacitación y Lean
        EnFormacion BIT NOT NULL DEFAULT 0,
        FactorFTE AS (CASE WHEN EnFormacion = 1 THEN CAST(0.30 AS DECIMAL(4,2)) ELSE CAST(1.00 AS DECIMAL(4,2)) END) PERSISTED,
        
        -- Trazabilidad de Auditoría
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UsuarioModificacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaModificacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        VersionFila ROWVERSION,

        CONSTRAINT CK_Empleados_Estado CHECK (Estado IN ('Pendiente', 'Activo', 'Baja', 'BajaMedica_IT', 'Permiso'))
    );

    CREATE NONCLUSTERED INDEX IX_Empleados_Linea_Estado ON dbo.Empleados(IdLineaActual, Estado);
    CREATE NONCLUSTERED INDEX IX_Empleados_Siglas ON dbo.Empleados(SiglasERP);
    CREATE NONCLUSTERED INDEX IX_Empleados_CodigoZucchetti ON dbo.Empleados(CodigoEmpleado);
END;
GO

-- ==============================================================================
-- 3. TABLAS HISTÓRICAS DE SEGUIMIENTO TEMPORAL (SLOWLY CHANGING DIMENSIONS TIPO 2)
-- ==============================================================================
-- REGLAS 1, 2, 7 y 8: Trazabilidad inmutable de cualquier fecha histórica.
-- FechaFin NULL indica la asignación vigente.
-- ==============================================================================

-- 3.1 Histórico de Asignación a Línea
IF OBJECT_ID(N'dbo.Empleado_Linea_Historico', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Linea_Historico (
        IdAsignacionLinea INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdLinea INT NOT NULL FOREIGN KEY REFERENCES dbo.Lineas(IdLinea),
        FechaInicio DATETIME2(3) NOT NULL,
        FechaFin DATETIME2(3) NULL,
        MotivoCambio NVARCHAR(255) NULL,
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    -- Índice filtrado para garantizar REGLA 1: Máximo una asignación activa por empleado
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Empleado_Linea_Activa 
    ON dbo.Empleado_Linea_Historico(IdEmpleado) 
    WHERE FechaFin IS NULL;

    CREATE NONCLUSTERED INDEX IX_Hist_Linea_Rango 
    ON dbo.Empleado_Linea_Historico(IdEmpleado, FechaInicio, FechaFin);
END;
GO

-- 3.2 Histórico de Asignación a Puesto
IF OBJECT_ID(N'dbo.Empleado_Puesto_Historico', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Puesto_Historico (
        IdAsignacionPuesto INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdPuesto INT NOT NULL FOREIGN KEY REFERENCES dbo.Puestos(IdPuesto),
        FechaInicio DATETIME2(3) NOT NULL,
        FechaFin DATETIME2(3) NULL,
        MotivoCambio NVARCHAR(255) NULL,
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE NONCLUSTERED INDEX UQ_Empleado_Puesto_Activo 
    ON dbo.Empleado_Puesto_Historico(IdEmpleado) 
    WHERE FechaFin IS NULL;
END;
GO

-- 3.3 Histórico de Turnos
IF OBJECT_ID(N'dbo.Empleado_Turno_Historico', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Turno_Historico (
        IdAsignacionTurno INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdTurno INT NOT NULL FOREIGN KEY REFERENCES dbo.Turnos(IdTurno),
        FechaInicio DATETIME2(3) NOT NULL,
        FechaFin DATETIME2(3) NULL,
        RotacionSemana NVARCHAR(10) NULL, -- Eq.1, Eq.2
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE NONCLUSTERED INDEX UQ_Empleado_Turno_Activo 
    ON dbo.Empleado_Turno_Historico(IdEmpleado) 
    WHERE FechaFin IS NULL;
END;
GO

-- 3.4 Histórico de Responsables / Mandos
IF OBJECT_ID(N'dbo.Empleado_Responsable_Historico', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Responsable_Historico (
        IdAsignacionResponsable INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdResponsable INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        FechaInicio DATETIME2(3) NOT NULL,
        FechaFin DATETIME2(3) NULL,
        MotivoCambio NVARCHAR(255) NULL,
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE NONCLUSTERED INDEX UQ_Empleado_Responsable_Activo 
    ON dbo.Empleado_Responsable_Historico(IdEmpleado) 
    WHERE FechaFin IS NULL;
END;
GO

-- ==============================================================================
-- 4. FORMACIÓN, COMPETENCIAS Y POLIVALENCIA
-- ==============================================================================

-- 4.1 Registros de Formaciones Impartidas a Empleados
IF OBJECT_ID(N'dbo.Empleado_Formacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Formacion (
        IdEmpleadoFormacion INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdFormacion INT NOT NULL FOREIGN KEY REFERENCES dbo.Formaciones(IdFormacion),
        FechaObtencion DATE NOT NULL,
        FechaCaducidad DATE NULL,                      -- Calculada o manual
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Vigente', -- Vigente, ProximaCaducar, Caducada
        Calificacion NVARCHAR(20) NULL,                -- Apto, No Apto, Sobresaliente
        HorasFormacion DECIMAL(5,2) NOT NULL DEFAULT 8.0,
        NumeroCertificado NVARCHAR(50) NULL,
        DocumentoCertificadoRuta NVARCHAR(255) NULL,   -- Almacenamiento local interno
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_EmpForm_Caducidad 
    ON dbo.Empleado_Formacion(FechaCaducidad, Estado);
END;
GO

-- 4.2 Matriz de Competencias y Polivalencia (Niveles 1 a 4)
-- Nivel 1: Novato (Requiere tutor)
-- Nivel 2: Autónomo (Operación estándar)
-- Nivel 3: Avanzado (Resuelve incidencias)
-- Nivel 4: Experto / Formador (Puede formar a otros)
IF OBJECT_ID(N'dbo.Empleado_Competencia', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Competencia (
        IdEmpleadoCompetencia INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdPuesto INT NOT NULL FOREIGN KEY REFERENCES dbo.Puestos(IdPuesto),
        NivelCompetencia INT NOT NULL CHECK (NivelCompetencia BETWEEN 1 AND 4),
        FechaEvaluacion DATE NOT NULL,
        IdEvaluador INT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        Observaciones NVARCHAR(255) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT UQ_Empleado_Puesto_Competencia UNIQUE (IdEmpleado, IdPuesto)
    );
END;
GO

-- ==============================================================================
-- 5. AUDITORÍA INMUTABLE GLOBAL
-- ==============================================================================
-- REGLA 4: Toda modificación registra Usuario, FechaHora, Tabla, Campo,
--          ValorAnterior, ValorNuevo, Accion.
-- ==============================================================================
IF OBJECT_ID(N'dbo.Auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Auditoria (
        IdAuditoria BIGINT IDENTITY(1,1) PRIMARY KEY,
        Usuario NVARCHAR(100) NOT NULL,
        FechaHora DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        Modulo NVARCHAR(50) NOT NULL,                   -- EMPLEADOS, ASIGNACIONES, RRHH, FORMACION
        Tabla NVARCHAR(50) NOT NULL,
        RegistroId NVARCHAR(50) NOT NULL,              -- Clave primaria del registro alterado
        Campo NVARCHAR(50) NOT NULL,
        ValorAnterior NVARCHAR(MAX) NULL,
        ValorNuevo NVARCHAR(MAX) NULL,
        Accion NVARCHAR(20) NOT NULL,                  -- INSERT, UPDATE, DELETE_LOGICO, REASIGNACION
        DireccionIP NVARCHAR(45) NULL,
        Aplicacion NVARCHAR(100) NOT NULL DEFAULT 'SGP-F STULZ'
    );

    CREATE NONCLUSTERED INDEX IX_Auditoria_Fecha 
    ON dbo.Auditoria(FechaHora DESC);

    CREATE NONCLUSTERED INDEX IX_Auditoria_Tabla_Registro 
    ON dbo.Auditoria(Tabla, RegistroId);
END;
GO
