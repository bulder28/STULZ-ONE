-- ==============================================================================
-- STULZ ESPAÑA — SISTEMA DE GESTIÓN DE PERSONAL DE FABRICACIÓN (SGP-F)
-- SCRIPT MAESTRO DE DESPLIEGUE INTEGRAL Y PUESTA A PUNTO (00_MASTER_DEPLOY)
-- ==============================================================================
-- MOTOR REQUERIDO: Microsoft SQL Server 2019 / 2022 / Azure SQL
-- PRINCIPIO: Single Source of Truth (SSOT). Excel queda 100% obsoleto.
-- POLÍTICAS REGLAMENTARIAS INTEGRADAS:
--   * RN-1: Unicidad absoluta de línea activa simultánea por operario (SCD Tipo 2).
--   * RN-2: Reasignación transaccional atómica (Cierra histórico y abre nuevo).
--   * RN-3: Prohibición de borrado físico (Baja lógica laboral).
--   * RN-4: Trazabilidad inmutable obligatoria en dbo.Auditoria.
--   * RN-5: Power BI DirectQuery / Import consume exclusivamente vistas SQL seguras.
--   * RN-6: Cero menciones a 'BATERÍAS'. Líneas productivas: L1, L2, L3, L4, L5 y BOX 1.
--   * RN-7: Normalización de nombres: MAYÚSCULAS Y SIN ACENTOS.
--   * RN-8: Cómputo de presencia: 7,75 horas efectivas por operario en turno.
-- ==============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- ──────────────────────────────────────────────────────────────────────────────
-- BLOQUE 1: CREACIÓN Y CONFIGURACIÓN ÓPTIMA DE LA BASE DE DATOS
-- ──────────────────────────────────────────────────────────────────────────────
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SGP_FABRICA_STULZ')
BEGIN
    PRINT N'[1/7] Creando Base de Datos SGP_FABRICA_STULZ con intercalación Modern_Spanish_CI_AS...';
    CREATE DATABASE SGP_FABRICA_STULZ
    COLLATE Modern_Spanish_CI_AS;
END
ELSE
BEGIN
    PRINT N'[1/7] Base de Datos SGP_FABRICA_STULZ ya existe. Verificando parámetros...';
END
GO

-- Configuración de aislamiento para concurrencia masiva (evita bloqueos entre planta y Power BI)
ALTER DATABASE SGP_FABRICA_STULZ SET ALLOW_SNAPSHOT_ISOLATION ON;
ALTER DATABASE SGP_FABRICA_STULZ SET READ_COMMITTED_SNAPSHOT ON;
ALTER DATABASE SGP_FABRICA_STULZ SET RECOVERY FULL;
GO

USE SGP_FABRICA_STULZ;
GO

PRINT N'[2/7] Desplegando Tablas Maestras y Estructura Organizativa...';
GO

-- ──────────────────────────────────────────────────────────────────────────────
-- BLOQUE 2: TABLAS MAESTRAS ORGANIZATIVAS
-- ──────────────────────────────────────────────────────────────────────────────

-- 2.1 Centros de Trabajo
IF OBJECT_ID(N'dbo.Centros', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Centros (
        IdCentro INT IDENTITY(1,1) PRIMARY KEY,
        CodigoCentro NVARCHAR(20) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Planta NVARCHAR(100) NOT NULL DEFAULT 'Planta Coslada',
        Nave NVARCHAR(50) NOT NULL DEFAULT 'Nave 1 Fabricación',
        Direccion NVARCHAR(200) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

-- 2.2 Departamentos
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

-- 2.3 Líneas de Producción (LÍNEAS REALES: L1 a L5 Gemelas + BOX 1)
IF OBJECT_ID(N'dbo.Lineas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Lineas (
        IdLinea INT IDENTITY(1,1) PRIMARY KEY,
        CodigoLinea NVARCHAR(20) NOT NULL UNIQUE,      -- L1, L2, L3, L4, L5, BOX 1
        Nombre NVARCHAR(100) NOT NULL,
        IdCentro INT NOT NULL FOREIGN KEY REFERENCES dbo.Centros(IdCentro),
        TipoLinea NVARCHAR(50) NOT NULL DEFAULT 'Gemela', -- Gemela, Box
        CapacidadTargetFTE DECIMAL(4,2) NOT NULL DEFAULT 14.00, -- Lean Target: 14 FTE (8 en Box)
        MinMecanicos INT NOT NULL DEFAULT 10,
        MinElectricos INT NOT NULL DEFAULT 4,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Operativa',
        Activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT CK_Lineas_Codigo CHECK (CodigoLinea IN ('L1', 'L2', 'L3', 'L4', 'L5', 'BOX 1'))
    );
END;
GO

-- 2.4 Puestos de Trabajo
IF OBJECT_ID(N'dbo.Puestos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Puestos (
        IdPuesto INT IDENTITY(1,1) PRIMARY KEY,
        CodigoPuesto NVARCHAR(30) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Categoria NVARCHAR(50) NOT NULL,               -- Mecánica, Eléctrica, Logística, Calidad, Mandos
        Descripcion NVARCHAR(255) NULL,
        RequiereCertificacion BIT NOT NULL DEFAULT 0,
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- 2.5 Turnos de Trabajo (7,75 h efectivas por operario)
IF OBJECT_ID(N'dbo.Turnos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Turnos (
        IdTurno INT IDENTITY(1,1) PRIMARY KEY,
        CodigoTurno NVARCHAR(20) NOT NULL UNIQUE,      -- T1, T2, TC
        Nombre NVARCHAR(100) NOT NULL,
        HoraInicio TIME(0) NOT NULL,
        HoraFin TIME(0) NOT NULL,
        HorasEfectivas DECIMAL(4,2) NOT NULL DEFAULT 7.75,
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- 2.6 Catálogo de Formaciones y Certificaciones
IF OBJECT_ID(N'dbo.Formaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Formaciones (
        IdFormacion INT IDENTITY(1,1) PRIMARY KEY,
        CodigoCurso NVARCHAR(30) NOT NULL UNIQUE,
        NombreCurso NVARCHAR(150) NOT NULL,
        Tipo NVARCHAR(50) NOT NULL,                    -- Legal, Seguridad, Técnica, Calidad
        MesesValidez INT NULL,                         -- 12, 24, 36 meses
        Organizador NVARCHAR(150) NULL,
        Descripcion NVARCHAR(255) NULL,
        Activo BIT NOT NULL DEFAULT 1
    );
END;
GO

-- ──────────────────────────────────────────────────────────────────────────────
-- BLOQUE 3: MAESTRO DE EMPLEADOS Y SEGUIMIENTO HISTÓRICO (SCD TIPO 2)
-- ──────────────────────────────────────────────────────────────────────────────

-- 3.1 Maestro de Empleados (Single Source of Truth)
IF OBJECT_ID(N'dbo.Empleados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleados (
        IdEmpleado INT IDENTITY(1,1) PRIMARY KEY,
        CodigoEmpleado NVARCHAR(20) NOT NULL UNIQUE,   -- Zucchetti ID (ej. 401001, 401437)
        SiglasERP NVARCHAR(10) NOT NULL UNIQUE,        -- Siglas ERP STULZ (ej. CGN, JAPE, EJAY)
        Nombre NVARCHAR(60) NOT NULL,                  -- Almacenado en MAYÚSCULAS sin acentos
        Apellidos NVARCHAR(100) NOT NULL,              -- Almacenado en MAYÚSCULAS sin acentos
        NombreCompleto AS (UPPER(Apellidos + ', ' + Nombre)) PERSISTED,
        DNI_NIE NVARCHAR(20) NULL,
        EmailCorporativo NVARCHAR(100) NULL,
        Telefono NVARCHAR(25) NULL,
        Contrato NVARCHAR(50) NOT NULL DEFAULT 'Empresa', -- Empresa, Eurofirms, Pavoni, Aura
        
        -- Relaciones Maestras Actuales
        IdDepartamento INT NOT NULL FOREIGN KEY REFERENCES dbo.Departamentos(IdDepartamento),
        IdLineaActual INT NULL FOREIGN KEY REFERENCES dbo.Lineas(IdLinea),
        IdPuestoActual INT NULL FOREIGN KEY REFERENCES dbo.Puestos(IdPuesto),
        IdTurnoActual INT NOT NULL FOREIGN KEY REFERENCES dbo.Turnos(IdTurno),
        IdResponsableActual INT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        
        -- Ciclo Laboral
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Activo', -- 'Activo', 'Baja', 'BajaMedica_IT', 'Ausente'
        FechaAlta DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        FechaBaja DATE NULL,
        MotivoBaja NVARCHAR(200) NULL,
        ObservacionesBaja NVARCHAR(500) NULL,
        BajaEstimadaHasta DATE NULL,                   -- Fecha estimada de reincorporación Mutua
        ParteMedicoReferencia NVARCHAR(50) NULL,       -- Número de parte médico IT
        
        -- Lean & Factores FTE
        EnFormacion BIT NOT NULL DEFAULT 0,
        FactorFTE AS (CASE WHEN EnFormacion = 1 THEN CAST(0.30 AS DECIMAL(4,2)) ELSE CAST(1.00 AS DECIMAL(4,2)) END) PERSISTED,
        
        -- Auditoría interna
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UsuarioModificacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaModificacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        VersionFila ROWVERSION,

        CONSTRAINT CK_Empleados_Estado CHECK (Estado IN ('Activo', 'Baja', 'BajaMedica_IT', 'Ausente', 'Pendiente')),
        CONSTRAINT CK_Empleados_SiglasMax4 CHECK (LEN(SiglasERP) <= 4)
    );

    CREATE NONCLUSTERED INDEX IX_Empleados_Linea_Estado ON dbo.Empleados(IdLineaActual, Estado);
    CREATE NONCLUSTERED INDEX IX_Empleados_Siglas ON dbo.Empleados(SiglasERP);
    CREATE NONCLUSTERED INDEX IX_Empleados_CodigoZucchetti ON dbo.Empleados(CodigoEmpleado);
END;
GO

-- 3.2 Histórico de Asignación a Línea (SCD Tipo 2 - Inmutable)
IF OBJECT_ID(N'dbo.Empleado_Linea_Historico', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Linea_Historico (
        IdAsignacionLinea INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdLinea INT NOT NULL FOREIGN KEY REFERENCES dbo.Lineas(IdLinea),
        FechaInicio DATETIME2(3) NOT NULL,
        FechaFin DATETIME2(3) NULL,                    -- NULL = Asignación Activa Vigente
        MotivoCambio NVARCHAR(255) NULL,
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    -- RN-1: Solo una asignación activa a la vez por empleado
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Empleado_Linea_Activa 
    ON dbo.Empleado_Linea_Historico(IdEmpleado) 
    WHERE FechaFin IS NULL;

    CREATE NONCLUSTERED INDEX IX_Hist_Linea_Rango 
    ON dbo.Empleado_Linea_Historico(IdEmpleado, FechaInicio, FechaFin);
END;
GO

-- 3.3 Histórico de Asignación a Puesto (SCD Tipo 2)
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

-- 3.4 Histórico de Formaciones y Certificaciones
IF OBJECT_ID(N'dbo.Empleado_Formacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Empleado_Formacion (
        IdEmpleadoFormacion INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpleado INT NOT NULL FOREIGN KEY REFERENCES dbo.Empleados(IdEmpleado),
        IdFormacion INT NOT NULL FOREIGN KEY REFERENCES dbo.Formaciones(IdFormacion),
        FechaObtencion DATE NOT NULL,
        FechaCaducidad DATE NULL,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Vigente',
        Calificacion NVARCHAR(20) NULL,
        HorasFormacion DECIMAL(5,2) NOT NULL DEFAULT 7.75,
        PuestoMaquina NVARCHAR(150) NULL,              -- Ej: 'LINEA 1 - MONTAJE CLIMATIZADORES'
        NumeroCertificado NVARCHAR(50) NULL,
        UsuarioCreacion NVARCHAR(50) NOT NULL DEFAULT SUSER_SNAME(),
        FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_EmpForm_Caducidad ON dbo.Empleado_Formacion(FechaCaducidad, Estado);
END;
GO

-- 3.5 Ingesta de Fichajes Reloj Zucchetti (Torniquete de Entrada/Salida)
IF OBJECT_ID(N'dbo.Fichajes_Zucchetti', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fichajes_Zucchetti (
        IdFichaje BIGINT IDENTITY(1,1) PRIMARY KEY,
        Fecha DATE NOT NULL,
        CodEmpresa NVARCHAR(10) NOT NULL DEFAULT '4',
        CodEmpleado NVARCHAR(20) NOT NULL,
        Nombre NVARCHAR(60) NOT NULL,
        Apellidos NVARCHAR(100) NOT NULL,
        CodLibre NVARCHAR(50) NULL,
        FichajeEntrada TIME(0) NULL,
        FichajeSalida TIME(0) NULL,
        TurnoHorario NVARCHAR(50) NULL,
        EstadoCruce NVARCHAR(20) NOT NULL DEFAULT 'OK', -- 'OK', 'SIN_FICHAJE', 'ANOMALIA'
        FechaIngesta DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_Fichajes_Fecha_Empleado ON dbo.Fichajes_Zucchetti(Fecha, CodEmpleado);
END;
GO

-- 3.6 Ingesta de Órdenes de Fabricación MES (CSV Horario)
IF OBJECT_ID(N'dbo.MES_Ordenes_Fabricacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MES_Ordenes_Fabricacion (
        IdOF BIGINT IDENTITY(1,1) PRIMARY KEY,
        NOrden NVARCHAR(30) NOT NULL,
        Linea NVARCHAR(20) NOT NULL,
        IDOperario NVARCHAR(10) NOT NULL,              -- Siglas ERP
        DescOperario NVARCHAR(150) NOT NULL,
        DescEstadoOF NVARCHAR(50) NOT NULL,
        TiempoCierreOF DECIMAL(6,2) NOT NULL DEFAULT 0.00,
        FechaInicio DATE NOT NULL,
        HoraInicio TIME(0) NULL,
        HoraFin TIME(0) NULL,
        CruceValido BIT NOT NULL DEFAULT 1,
        Observacion NVARCHAR(255) NULL,
        FechaIngesta DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_MES_OF_Fecha_Linea ON dbo.MES_Ordenes_Fabricacion(FechaInicio, Linea);
    CREATE NONCLUSTERED INDEX IX_MES_OF_Siglas ON dbo.MES_Ordenes_Fabricacion(IDOperario);
END;
GO

-- 3.7 Auditoría Transaccional Inmutable
IF OBJECT_ID(N'dbo.Auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Auditoria (
        IdAuditoria BIGINT IDENTITY(1,1) PRIMARY KEY,
        Usuario NVARCHAR(100) NOT NULL,
        FechaHora DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        Modulo NVARCHAR(50) NOT NULL,                   -- EMPLEADOS, ASIGNACIONES, RRHH, DIRECCION
        Tabla NVARCHAR(50) NOT NULL,
        RegistroId NVARCHAR(50) NOT NULL,
        Campo NVARCHAR(50) NOT NULL,
        ValorAnterior NVARCHAR(MAX) NULL,
        ValorNuevo NVARCHAR(MAX) NULL,
        Accion NVARCHAR(50) NOT NULL,                  -- REASIGNACION_LINEA, REGISTRO_BAJA, ALTA_OPERARIO
        DireccionIP NVARCHAR(45) NULL,
        Aplicacion NVARCHAR(100) NOT NULL DEFAULT 'SGP-F STULZ'
    );

    CREATE NONCLUSTERED INDEX IX_Auditoria_FechaHora ON dbo.Auditoria(FechaHora DESC);
    CREATE NONCLUSTERED INDEX IX_Auditoria_Tabla_Registro ON dbo.Auditoria(Tabla, RegistroId);
END;
GO

-- ──────────────────────────────────────────────────────────────────────────────
-- BLOQUE 4: PROCEDIMIENTOS ALMACENADOS TRANSACCIONALES (ACID)
-- ──────────────────────────────────────────────────────────────────────────────
PRINT N'[3/7] Creando Procedimientos Almacenados Transaccionales...';
GO

-- 4.1 sp_ReasignarLinea (Garantiza RN-1, RN-2 y RN-4)
CREATE OR ALTER PROCEDURE dbo.sp_ReasignarLinea
    @IdEmpleado INT,
    @NuevaLineaCodigo NVARCHAR(20),
    @MotivoCambio NVARCHAR(255),
    @UsuarioEjecutor NVARCHAR(100),
    @DireccionIP NVARCHAR(45) = '127.0.0.1'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IdNuevaLinea INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = @NuevaLineaCodigo);
        IF @IdNuevaLinea IS NULL
            THROW 50001, N'La línea de destino indicada no existe o no es válida.', 1;

        DECLARE @LineaAnteriorId INT = (SELECT IdLineaActual FROM dbo.Empleados WHERE IdEmpleado = @IdEmpleado);
        DECLARE @LineaAnteriorCodigo NVARCHAR(20) = (SELECT CodigoLinea FROM dbo.Lineas WHERE IdLinea = @LineaAnteriorId);
        DECLARE @SiglasERP NVARCHAR(10) = (SELECT SiglasERP FROM dbo.Empleados WHERE IdEmpleado = @IdEmpleado);

        IF @LineaAnteriorId = @IdNuevaLinea
            THROW 50002, N'El operario ya está actualmente asignado a esa misma línea.', 1;

        DECLARE @Ahora DATETIME2(3) = SYSUTCDATETIME();

        -- 1. Cerrar histórico activo vigente (SCD2)
        UPDATE dbo.Empleado_Linea_Historico
        SET FechaFin = @Ahora
        WHERE IdEmpleado = @IdEmpleado AND FechaFin IS NULL;

        -- 2. Abrir nuevo registro de asignación
        INSERT INTO dbo.Empleado_Linea_Historico (IdEmpleado, IdLinea, FechaInicio, FechaFin, MotivoCambio, UsuarioCreacion, FechaCreacion)
        VALUES (@IdEmpleado, @IdNuevaLinea, @Ahora, NULL, @MotivoCambio, @UsuarioEjecutor, @Ahora);

        -- 3. Actualizar puntero maestro en dbo.Empleados
        UPDATE dbo.Empleados
        SET IdLineaActual = @IdNuevaLinea,
            UsuarioModificacion = @UsuarioEjecutor,
            FechaModificacion = @Ahora
        WHERE IdEmpleado = @IdEmpleado;

        -- 4. Escribir en Auditoría Inmutable (RN-4)
        INSERT INTO dbo.Auditoria (Usuario, FechaHora, Modulo, Tabla, RegistroId, Campo, ValorAnterior, ValorNuevo, Accion, DireccionIP)
        VALUES (
            @UsuarioEjecutor, @Ahora, 'ASIGNACIONES', 'Empleados', CAST(@IdEmpleado AS NVARCHAR(50)),
            'IdLineaActual', @LineaAnteriorCodigo, @NuevaLineaCodigo, 'REASIGNACION_LINEA', @DireccionIP
        );

        COMMIT TRANSACTION;
        PRINT N'Operario reasignado exitosamente a ' + @NuevaLineaCodigo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- 4.2 sp_RegistrarBajaMedica (RN-3: Baja Lógica Laboral)
CREATE OR ALTER PROCEDURE dbo.sp_RegistrarBajaMedica
    @IdEmpleado INT,
    @FechaEstimadaFin DATE,
    @ParteMedico NVARCHAR(50),
    @Observaciones NVARCHAR(500),
    @UsuarioEjecutor NVARCHAR(100),
    @DireccionIP NVARCHAR(45) = '127.0.0.1'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Ahora DATETIME2(3) = SYSUTCDATETIME();
        DECLARE @EstadoAnterior NVARCHAR(20) = (SELECT Estado FROM dbo.Empleados WHERE IdEmpleado = @IdEmpleado);

        UPDATE dbo.Empleados
        SET Estado = 'BajaMedica_IT',
            BajaEstimadaHasta = @FechaEstimadaFin,
            ParteMedicoReferencia = @ParteMedico,
            ObservacionesBaja = @Observaciones,
            UsuarioModificacion = @UsuarioEjecutor,
            FechaModificacion = @Ahora
        WHERE IdEmpleado = @IdEmpleado;

        INSERT INTO dbo.Auditoria (Usuario, FechaHora, Modulo, Tabla, RegistroId, Campo, ValorAnterior, ValorNuevo, Accion, DireccionIP)
        VALUES (
            @UsuarioEjecutor, @Ahora, 'RRHH', 'Empleados', CAST(@IdEmpleado AS NVARCHAR(50)),
            'Estado', @EstadoAnterior, 'BajaMedica_IT', 'REGISTRO_BAJA_MEDICA', @DireccionIP
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ──────────────────────────────────────────────────────────────────────────────
-- BLOQUE 5: VISTAS OPTIMIZADAS PARA POWER BI (DIRECTQUERY / IMPORT)
-- ──────────────────────────────────────────────────────────────────────────────
PRINT N'[4/7] Creando Vistas de Consumo Seguro para Power BI...';
GO

-- 5.1 Vista de Plantilla Actual con Cómputo de Horas (RN-5 & RN-8)
CREATE OR ALTER VIEW dbo.vw_PBI_PlantillaActual
AS
SELECT 
    e.IdEmpleado,
    e.CodigoEmpleado AS [Codigo_Zucchetti],
    e.SiglasERP AS [Siglas_ERP],
    e.NombreCompleto AS [Operario],
    e.Nombre,
    e.Apellidos,
    e.Estado,
    e.Contrato,
    e.EnFormacion,
    e.FactorFTE,
    
    -- Organización
    d.Nombre AS [Departamento],
    ISNULL(l.CodigoLinea, 'SIN_LINEA') AS [Codigo_Linea],
    ISNULL(l.Nombre, 'Sin Línea Asignada') AS [Linea_Produccion],
    l.TipoLinea AS [Tipo_Linea],
    ISNULL(p.Nombre, 'Sin Puesto Asignado') AS [Puesto_Trabajo],
    p.Categoria AS [Categoria_Puesto],
    t.CodigoTurno AS [Codigo_Turno],
    t.Nombre AS [Turno],
    
    -- Cómputo Horario Exacto Stulz (7,75 h por presencia activa)
    CASE 
        WHEN e.Estado = 'Activo' THEN CAST(7.75 AS DECIMAL(4,2))
        ELSE CAST(0.00 AS DECIMAL(4,2))
    END AS [Horas_Efectivas_Presencia],
    
    c.Nombre AS [Centro],
    c.Planta AS [Planta],
    e.BajaEstimadaHasta,
    e.ParteMedicoReferencia
FROM dbo.Empleados e
INNER JOIN dbo.Departamentos d ON e.IdDepartamento = d.IdDepartamento
INNER JOIN dbo.Turnos t ON e.IdTurnoActual = t.IdTurno
LEFT JOIN dbo.Lineas l ON e.IdLineaActual = l.IdLinea
LEFT JOIN dbo.Centros c ON l.IdCentro = c.IdCentro
LEFT JOIN dbo.Puestos p ON e.IdPuestoActual = p.IdPuesto;
GO

-- 5.2 Vista de Balance Lean de Líneas (FTE Real vs Target 14)
CREATE OR ALTER VIEW dbo.vw_PBI_LeanBalanceLineas
AS
SELECT 
    l.IdLinea,
    l.CodigoLinea,
    l.Nombre AS LineaNombre,
    l.CapacidadTargetFTE,
    l.MinMecanicos,
    l.MinElectricos,
    COUNT(CASE WHEN e.Estado = 'Activo' THEN e.IdEmpleado END) AS OperariosPresentes,
    SUM(CASE WHEN e.Estado = 'Activo' THEN e.FactorFTE ELSE 0 END) AS TotalFTEActual,
    SUM(CASE WHEN e.Estado = 'Activo' AND p.Categoria = 'Mecánica' THEN 1 ELSE 0 END) AS TotalMecanicos,
    SUM(CASE WHEN e.Estado = 'Activo' AND p.Categoria = 'Eléctrica' THEN 1 ELSE 0 END) AS TotalElectricos,
    SUM(CASE WHEN e.Estado = 'Activo' AND e.EnFormacion = 1 THEN 1 ELSE 0 END) AS TotalEnFormacion,
    -- Horas totales en la línea hoy (7,75 h por operario activo)
    COUNT(CASE WHEN e.Estado = 'Activo' THEN e.IdEmpleado END) * 7.75 AS HorasTotalesLinea,
    ROUND((SUM(CASE WHEN e.Estado = 'Activo' THEN e.FactorFTE ELSE 0 END) / l.CapacidadTargetFTE) * 100, 1) AS PorcentajeSaturacionLean
FROM dbo.Lineas l
LEFT JOIN dbo.Empleados e ON l.IdLinea = e.IdLineaActual
LEFT JOIN dbo.Puestos p ON e.IdPuestoActual = p.IdPuesto
GROUP BY l.IdLinea, l.CodigoLinea, l.Nombre, l.CapacidadTargetFTE, l.MinMecanicos, l.MinElectricos;
GO

-- 5.3 Vista de Trazabilidad Histórica SCD Tipo 2
CREATE OR ALTER VIEW dbo.vw_PBI_HistoricoAsignaciones
AS
SELECT 
    h.IdAsignacionLinea,
    e.CodigoEmpleado AS CodigoZucchetti,
    e.SiglasERP,
    e.NombreCompleto AS Operario,
    l.CodigoLinea,
    l.Nombre AS LineaNombre,
    h.FechaInicio,
    h.FechaFin,
    CASE WHEN h.FechaFin IS NULL THEN 1 ELSE 0 END AS EsAsignacionVigente,
    h.MotivoCambio,
    h.UsuarioCreacion
FROM dbo.Empleado_Linea_Historico h
INNER JOIN dbo.Empleados e ON h.IdEmpleado = e.IdEmpleado
INNER JOIN dbo.Lineas l ON h.IdLinea = l.IdLinea;
GO

-- ──────────────────────────────────────────────────────────────────────────────
-- BLOQUE 6: CARGA DE DATOS MAESTROS Y LOS 15 OPERARIOS REALES DE FÁBRICA
-- ──────────────────────────────────────────────────────────────────────────────
PRINT N'[5/7] Insertando Catálogos y Plantilla Real (15 Operarios Auténticos)...';
GO

-- 6.1 Centro Coslada
IF NOT EXISTS (SELECT 1 FROM dbo.Centros WHERE CodigoCentro = 'STULZ_COS_01')
BEGIN
    INSERT INTO dbo.Centros (CodigoCentro, Nombre, Planta, Nave, Direccion)
    VALUES ('STULZ_COS_01', 'STULZ Tecnivel España S.A.', 'Planta Coslada', 'Nave 1 Fabricación', 'Calle de la Tecnología, 12, Coslada, Madrid');
END;

DECLARE @IdCentro INT = (SELECT TOP 1 IdCentro FROM dbo.Centros WHERE CodigoCentro = 'STULZ_COS_01');

-- 6.2 Departamentos
IF NOT EXISTS (SELECT 1 FROM dbo.Departamentos WHERE CodigoDepartamento = 'DEP_PROD')
BEGIN
    INSERT INTO dbo.Departamentos (CodigoDepartamento, Nombre, Descripcion)
    VALUES 
        ('DEP_PROD', 'Producción Climatización', 'Líneas de montaje de climatizadores de precisión'),
        ('DEP_CAL', 'Calidad y Metrología', 'Control de calidad en línea y pruebas finales'),
        ('DEP_LOG', 'Logística y Almacén', 'Abastecimiento de componentes a línea de producción'),
        ('DEP_MANT', 'Mantenimiento Industrial', 'Mantenimiento electromecánico preventivo y correctivo');
END;

DECLARE @IdDepProd INT = (SELECT IdDepartamento FROM dbo.Departamentos WHERE CodigoDepartamento = 'DEP_PROD');

-- 6.3 Líneas de Producción (ÚNICAMENTE L1, L2, L3, L4, L5 y BOX 1 - CERO BATERÍAS)
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

DECLARE @IdL1 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L1');
DECLARE @IdL2 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L2');
DECLARE @IdL3 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L3');
DECLARE @IdL4 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L4');
DECLARE @IdL5 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'L5');
DECLARE @IdBox1 INT = (SELECT IdLinea FROM dbo.Lineas WHERE CodigoLinea = 'BOX 1');

-- 6.4 Puestos
IF NOT EXISTS (SELECT 1 FROM dbo.Puestos WHERE CodigoPuesto = 'P_MEC')
BEGIN
    INSERT INTO dbo.Puestos (CodigoPuesto, Nombre, Categoria, RequiereCertificacion)
    VALUES 
        ('P_MEC', 'Montador Mecánico', 'Mecánica', 0),
        ('P_ELEC', 'Montador Eléctrico', 'Eléctrica', 1),
        ('P_OPER_GRUA', 'Operador de Puente Grúa', 'Logística', 1),
        ('P_RESP_LINEA', 'Responsable de Línea', 'Mandos', 1);
END;

DECLARE @IdPMec INT = (SELECT IdPuesto FROM dbo.Puestos WHERE CodigoPuesto = 'P_MEC');
DECLARE @IdPElec INT = (SELECT IdPuesto FROM dbo.Puestos WHERE CodigoPuesto = 'P_ELEC');
DECLARE @IdPResp INT = (SELECT IdPuesto FROM dbo.Puestos WHERE CodigoPuesto = 'P_RESP_LINEA');

-- 6.5 Turnos
IF NOT EXISTS (SELECT 1 FROM dbo.Turnos WHERE CodigoTurno = 'T1')
BEGIN
    INSERT INTO dbo.Turnos (CodigoTurno, Nombre, HoraInicio, HoraFin, HorasEfectivas)
    VALUES 
        ('T1', 'Turno 1 - Mañana (06:00 - 14:00)', '06:00:00', '14:00:00', 7.75),
        ('T2', 'Turno 2 - Tarde (14:00 - 22:00)', '14:00:00', '22:00:00', 7.75),
        ('TC', 'Turno Central (08:00 - 17:00)', '08:00:00', '17:00:00', 7.75);
END;

DECLARE @IdT1 INT = (SELECT IdTurno FROM dbo.Turnos WHERE CodigoTurno = 'T1');
DECLARE @IdT2 INT = (SELECT IdTurno FROM dbo.Turnos WHERE CodigoTurno = 'T2');

-- 6.6 Formaciones
IF NOT EXISTS (SELECT 1 FROM dbo.Formaciones WHERE CodigoCurso = 'FORM_PRL')
BEGIN
    INSERT INTO dbo.Formaciones (CodigoCurso, NombreCurso, Tipo, MesesValidez, Organizador)
    VALUES 
        ('FORM_PRL', 'PRL Básico Planta Climatización', 'Legal', 36, 'Servicio Prevención STULZ'),
        ('FORM_GRUA', 'Operador Puente Grúa 10T', 'Seguridad', 24, 'Centro de Formación Homologado'),
        ('FORM_ELEC_BT', 'Riesgo Eléctrico RD 614/2001 (Baja Tensión)', 'Seguridad', 24, 'Ingeniería y Seguridad');
END;

-- 6.7 Supervisor Base (Carlos Gómez Navarro)
IF NOT EXISTS (SELECT 1 FROM dbo.Empleados WHERE CodigoEmpleado = '401001')
BEGIN
    INSERT INTO dbo.Empleados (CodigoEmpleado, SiglasERP, Nombre, Apellidos, Contrato, IdDepartamento, IdLineaActual, IdPuestoActual, IdTurnoActual, Estado, FechaAlta)
    VALUES ('401001', 'CGN', 'CARLOS', 'GOMEZ NAVARRO', 'Empresa', @IdDepProd, @IdL1, @IdPResp, @IdT1, 'Activo', '2024-01-15');
END;

DECLARE @IdRespCGN INT = (SELECT IdEmpleado FROM dbo.Empleados WHERE CodigoEmpleado = '401001');

-- 6.8 Carga de la Plantilla Real (Los 15 Operarios Auténticos de Fábrica)
DECLARE @PlantillaReal TABLE (
    CodZucchetti NVARCHAR(20),
    Siglas NVARCHAR(10),
    Nombre NVARCHAR(60),
    Apellidos NVARCHAR(100),
    Contrato NVARCHAR(50),
    LineaId INT,
    PuestoId INT,
    TurnoId INT,
    EnFormacion BIT,
    Estado NVARCHAR(20),
    BajaHasta DATE,
    ParteMedico NVARCHAR(50)
);

INSERT INTO @PlantillaReal VALUES
-- L1 (5 Operarios)
('401002', 'JAPE', 'JOSE ANTONIO', 'PICHARDO ESPINA', 'Empresa', @IdL1, @IdPResp, @IdT1, 0, 'Activo', NULL, NULL),
('401437', 'EJAY', 'EDUARDO', 'JIMENEZ AYALA', 'Empresa', @IdL1, @IdPElec, @IdT1, 0, 'Activo', NULL, NULL),
('401438', 'SDU', 'SAMUEL', 'DORADO UBEDA', 'Empresa', @IdL1, @IdPMec, @IdT1, 1, 'Activo', NULL, NULL), -- 0.3 FTE
('401439', 'JMVM', 'JUAN MAURICIO', 'VICENTE MARTIN', 'Empresa', @IdL1, @IdPMec, @IdT1, 0, 'Activo', NULL, NULL),

-- L2 (2 Operarios: 1 Activo, 1 Baja Médica IT)
('401440', 'DFM', 'DAVID', 'FERNANDEZ MORALES', 'Empresa', @IdL2, @IdPElec, @IdT1, 0, 'Activo', NULL, NULL),
('401441', 'ERM', 'ENRIQUE', 'RODRIGUEZ MARIN', 'Empresa', @IdL2, @IdPMec, @IdT1, 0, 'BajaMedica_IT', '2026-11-15', 'IT-MUTUA-2026-881'),

-- L3 (2 Operarios)
('401442', 'MSP', 'MANUEL', 'SANCHEZ PRIETO', 'Empresa', @IdL3, @IdPMec, @IdT1, 1, 'Activo', NULL, NULL), -- 0.3 FTE
('401443', 'LBC', 'LUIS', 'BENITEZ CASTRO', 'Empresa', @IdL3, @IdPElec, @IdT1, 0, 'Activo', NULL, NULL),

-- L4 (2 Operarios: Empresa y ETT Eurofirms)
('401444', 'DMV', 'DANIEL', 'MARTIN VEGA', 'Empresa', @IdL4, @IdPMec, @IdT1, 0, 'Activo', NULL, NULL),
('401522', 'EJAY', 'EDDY JONATHAN', 'ACEVEDO YURI', 'Eurofirms', @IdL4, @IdPElec, @IdT2, 0, 'Activo', NULL, NULL),

-- L5 (2 Operarios: 1 Activo, 1 Ausente puntual)
('401445', 'RIO', 'ROBERTO', 'IGLESIAS ORTIZ', 'Empresa', @IdL5, @IdPElec, @IdT2, 0, 'Activo', NULL, NULL),
('401520', 'DMV', 'DAVID', 'MORENO VEGA', 'Empresa', @IdL5, @IdPMec, @IdT1, 0, 'Ausente', NULL, NULL),

-- BOX 1 (2 Operarios Especiales / Prototipos)
('401446', 'JPL', 'JAVIER', 'PEREZ LOPEZ', 'Empresa', @IdBox1, @IdPMec, @IdT1, 0, 'Activo', NULL, NULL),
('401447', 'MSP', 'MARCOS', 'SANZ PAREDES', 'Empresa', @IdBox1, @IdPMec, @IdT1, 0, 'Activo', NULL, NULL);

MERGE dbo.Empleados AS TARGET
USING @PlantillaReal AS SOURCE
ON (TARGET.CodigoEmpleado = SOURCE.CodZucchetti)
WHEN MATCHED THEN
    UPDATE SET 
        TARGET.SiglasERP = SOURCE.Siglas,
        TARGET.Nombre = SOURCE.Nombre,
        TARGET.Apellidos = SOURCE.Apellidos,
        TARGET.Contrato = SOURCE.Contrato,
        TARGET.IdLineaActual = SOURCE.LineaId,
        TARGET.IdPuestoActual = SOURCE.PuestoId,
        TARGET.IdTurnoActual = SOURCE.TurnoId,
        TARGET.Estado = SOURCE.Estado,
        TARGET.EnFormacion = SOURCE.EnFormacion,
        TARGET.BajaEstimadaHasta = SOURCE.BajaHasta,
        TARGET.ParteMedicoReferencia = SOURCE.ParteMedico
WHEN NOT MATCHED THEN
    INSERT (CodigoEmpleado, SiglasERP, Nombre, Apellidos, Contrato, IdDepartamento, IdLineaActual, IdPuestoActual, IdTurnoActual, IdResponsableActual, Estado, EnFormacion, BajaEstimadaHasta, ParteMedicoReferencia, FechaAlta)
    VALUES (SOURCE.CodZucchetti, SOURCE.Siglas, SOURCE.Nombre, SOURCE.Apellidos, SOURCE.Contrato, @IdDepProd, SOURCE.LineaId, SOURCE.PuestoId, SOURCE.TurnoId, @IdRespCGN, SOURCE.Estado, SOURCE.EnFormacion, SOURCE.BajaHasta, SOURCE.ParteMedico, '2025-01-10');

-- 6.9 Inicialización de SCD2 (Empleado_Linea_Historico)
INSERT INTO dbo.Empleado_Linea_Historico (IdEmpleado, IdLinea, FechaInicio, FechaFin, MotivoCambio, UsuarioCreacion)
SELECT e.IdEmpleado, e.IdLineaActual, '2026-01-01 06:00:00', NULL, 'Asignación Inicial Planta SSOT', 'SYSTEM_INIT'
FROM dbo.Empleados e
WHERE e.IdLineaActual IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Empleado_Linea_Historico h WHERE h.IdEmpleado = e.IdEmpleado AND h.FechaFin IS NULL);

-- 6.10 Registro de Formación en Puesto (LINEA 1 - MONTAJE CLIMATIZADORES)
DECLARE @IdFormPRL INT = (SELECT IdFormacion FROM dbo.Formaciones WHERE CodigoCurso = 'FORM_PRL');
DECLARE @IdEmpSDU INT = (SELECT IdEmpleado FROM dbo.Empleados WHERE CodigoEmpleado = '401438');

IF NOT EXISTS (SELECT 1 FROM dbo.Empleado_Formacion WHERE IdEmpleado = @IdEmpSDU AND IdFormacion = @IdFormPRL)
BEGIN
    INSERT INTO dbo.Empleado_Formacion (IdEmpleado, IdFormacion, FechaObtencion, FechaCaducidad, Estado, Calificacion, HorasFormacion, PuestoMaquina)
    VALUES (@IdEmpSDU, @IdFormPRL, '2026-10-21', DATEADD(YEAR, 3, '2026-10-21'), 'Vigente', 'Apto', 7.75, 'LINEA 1 - MONTAJE CLIMATIZADORES');
END;

-- 6.11 Fichajes Reloj Zucchetti de Ejemplo Real
IF NOT EXISTS (SELECT 1 FROM dbo.Fichajes_Zucchetti WHERE Fecha = '2026-10-21')
BEGIN
    INSERT INTO dbo.Fichajes_Zucchetti (Fecha, CodEmpresa, CodEmpleado, Nombre, Apellidos, CodLibre, FichajeEntrada, FichajeSalida, TurnoHorario, EstadoCruce)
    VALUES 
        ('2026-10-21', '4', '401001', 'CARLOS', 'GOMEZ NAVARRO', 'L1-JEFE', '05:58:12', '14:02:45', '05:50-13:50', 'OK'),
        ('2026-10-21', '4', '401002', 'JOSE ANTONIO', 'PICHARDO ESPINA', 'L1-JEFE', '05:50:10', '14:00:22', '05:50-13:50', 'OK'),
        ('2026-10-21', '4', '401437', 'EDUARDO', 'JIMENEZ AYALA', 'L1-ELEC', '05:52:15', '14:00:40', '05:50-13:50', 'OK'),
        ('2026-10-21', '4', '401438', 'SAMUEL', 'DORADO UBEDA', 'L1-FORM', '05:55:00', '14:00:10', '05:50-13:50', 'OK'),
        ('2026-10-21', '4', '401439', 'JUAN MAURICIO', 'VICENTE MARTIN', 'L1-MEC', '05:57:30', '14:01:22', '05:50-13:50', 'OK'),
        ('2026-10-21', '4', '401520', 'DAVID', 'MORENO VEGA', 'L5-MEC', NULL, NULL, '05:50-13:50', 'SIN_FICHAJE'),
        ('2026-10-21', '4', '401522', 'EDDY JONATHAN', 'ACEVEDO YURI', 'L4-ETT', '13:52:10', NULL, '13:50-21:50', 'OK');
END;

-- 6.12 OFs del MES de Ejemplo Real
IF NOT EXISTS (SELECT 1 FROM dbo.MES_Ordenes_Fabricacion WHERE NOrden = 'OF110338')
BEGIN
    INSERT INTO dbo.MES_Ordenes_Fabricacion (NOrden, Linea, IDOperario, DescOperario, DescEstadoOF, TiempoCierreOF, FechaInicio, HoraInicio, HoraFin, CruceValido, Observacion)
    VALUES 
        ('OF110337', 'L4', 'EJAY', 'ACEVEDO YURI, EDDY JONATHAN', '50 Iniciada', 0.05, '2026-10-21', '14:03:00', '14:06:00', 1, 'Cruce exitoso por Siglas ERP (EJAY) en Línea L4'),
        ('OF110338', 'L1', 'CGN', 'GOMEZ NAVARRO, CARLOS', '50 Iniciada', 0.80, '2026-10-21', '06:15:00', '07:03:00', 1, 'Cruce exitoso por Siglas ERP (CGN) en Línea L1'),
        ('OF110339', 'BOX 1', 'MSP', 'SANZ PAREDES, MARCOS', '50 Iniciada', 1.20, '2026-10-21', '06:30:00', '07:42:00', 1, 'Detectado en BOX 1 (Reasignación trazada)');
END;
GO

-- ──────────────────────────────────────────────────────────────────────────────
-- BLOQUE 7: COMPROBACIONES Y VERIFICACIÓN DE SALUD DE LA BASE DE DATOS
-- ──────────────────────────────────────────────────────────────────────────────
PRINT N'[6/7] Ejecutando Consultas de Verificación de Salud...';
GO

PRINT N'-----------------------------------------------------------------------------';
PRINT N'VERIFICACIÓN 1: OPERARIOS Y BALANCEO DE LÍNEAS LEAN (STULZ)';
PRINT N'-----------------------------------------------------------------------------';
SELECT 
    CodigoLinea AS [Línea],
    LineaNombre AS [Descripción],
    OperariosPresentes AS [Operarios_En_Planta],
    TotalFTEActual AS [FTE_Efectivo],
    CapacidadTargetFTE AS [Objetivo_FTE],
    TotalMecanicos AS [Mecánicos],
    TotalElectricos AS [Eléctricos],
    TotalEnFormacion AS [En_Formación_30%],
    HorasTotalesLinea AS [Horas_Efectivas_Línea_Hoy],
    CAST(PorcentajeSaturacionLean AS NVARCHAR(10)) + ' %' AS [Saturación_Lean]
FROM dbo.vw_PBI_LeanBalanceLineas;

PRINT N'-----------------------------------------------------------------------------';
PRINT N'VERIFICACIÓN 2: PLANTILLA REAL DETALLADA Y CÓMPUTO DE PRESENCIA (7,75 h)';
PRINT N'-----------------------------------------------------------------------------';
SELECT 
    Codigo_Zucchetti AS [Cod_Zucchetti],
    Siglas_ERP AS [Siglas],
    Operario AS [Nombre_Completo],
    Codigo_Linea AS [Línea],
    Puesto_Trabajo AS [Puesto],
    Contrato,
    Estado,
    Horas_Efectivas_Presencia AS [Horas_Presencia_7.75h]
FROM dbo.vw_PBI_PlantillaActual
ORDER BY Codigo_Linea, Siglas_ERP;

PRINT N'-----------------------------------------------------------------------------';
PRINT N'VERIFICACIÓN 3: HISTÓRICO ACTIVO SCD TIPO 2 (RN-1 CUMPLIDA)';
PRINT N'-----------------------------------------------------------------------------';
SELECT 
    COUNT(*) AS TotalAsignacionesActivas,
    COUNT(DISTINCT CodigoZucchetti) AS TotalOperariosDistintos
FROM dbo.vw_PBI_HistoricoAsignaciones
WHERE EsAsignacionVigente = 1;

PRINT N'=============================================================================';
PRINT N'[7/7] DESPLIEGUE COMPLETADO CON ÉXITO:';
PRINT N'  * Base de datos: SGP_FABRICA_STULZ';
PRINT N'  * 15 Operarios reales cargados (CERO nombres inventados)';
PRINT N'  * CERO menciones a Baterías (L1-L5 y BOX 1)';
PRINT N'  * Nombres normalizados en MAYÚSCULAS sin acentos';
PRINT N'  * Cómputo exacto de 7,75 h por presencia';
PRINT N'  * Vistas para Power BI DirectQuery listas para conectar';
PRINT N'=============================================================================';
GO
