-- ==============================================================================
-- STULZ ESPAÑA — SISTEMA DE GESTIÓN DE PERSONAL DE FABRICACIÓN (SGP-F)
-- PROCEDIMIENTOS ALMACENADOS TRANSACCIONALES (ACID)
-- ==============================================================================
-- REGLAS ENFORZADAS:
-- RN-1: Solo una línea activa simultáneamente por operario.
-- RN-2: Reasignación cierra histórico previo y abre nuevo en transacción única.
-- RN-3: Prohibido borrado físico (Baja lógica).
-- RN-4: Todo movimiento escribe en dbo.Auditoria.
-- RN-7: Trazabilidad exacta en cualquier fecha del pasado (Time Machine).
-- RN-8: Persistencia atómica e inmediata.
-- ==============================================================================

USE SGP_FABRICA_STULZ;
GO

-- ==============================================================================
-- 1. SP_ALTA_EMPLEADO (Workflow Inicial: RRHH crea en estado 'Pendiente')
-- ==============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_AltaEmpleado
    @CodigoEmpleado NVARCHAR(20),
    @SiglasERP NVARCHAR(10),
    @Nombre NVARCHAR(60),
    @Apellidos NVARCHAR(100),
    @DNI_NIE NVARCHAR(20) = NULL,
    @EmailCorporativo NVARCHAR(100) = NULL,
    @Telefono NVARCHAR(25) = NULL,
    @IdDepartamento INT,
    @IdTurno INT,
    @IdResponsable INT = NULL,
    @UsuarioEjecutor NVARCHAR(100),
    @DireccionIP NVARCHAR(45) = '127.0.0.1',
    @NuevoIdEmpleado INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validar unicidad
        IF EXISTS (SELECT 1 FROM dbo.Empleados WHERE CodigoEmpleado = @CodigoEmpleado)
            THROW 50001, N'El código de empleado ya está registrado.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Empleados WHERE SiglasERP = UPPER(TRIM(@SiglasERP)))
            THROW 50002, N'Las siglas ERP ya existen para otro empleado.', 1;

        INSERT INTO dbo.Empleados (
            CodigoEmpleado, SiglasERP, Nombre, Apellidos, DNI_NIE,
            EmailCorporativo, Telefono, IdDepartamento, IdTurnoActual,
            IdResponsableActual, Estado, FechaAlta, UsuarioCreacion, FechaCreacion
        )
        VALUES (
            @CodigoEmpleado, UPPER(TRIM(@SiglasERP)), TRIM(@Nombre), TRIM(@Apellidos), @DNI_NIE,
            @EmailCorporativo, @Telefono, @IdDepartamento, @IdTurno,
            @IdResponsable, 'Pendiente', CAST(GETDATE() AS DATE), @UsuarioEjecutor, SYSUTCDATETIME()
        );

        SET @NuevoIdEmpleado = SCOPE_IDENTITY();

        -- Auditoría obligatoria (RN-4)
        INSERT INTO dbo.Auditoria (
            Usuario, FechaHora, Modulo, Tabla, RegistroId,
            Campo, ValorAnterior, ValorNuevo, Accion, DireccionIP
        )
        VALUES (
            @UsuarioEjecutor, SYSUTCDATETIME(), 'EMPLEADOS', 'Empleados', CAST(@NuevoIdEmpleado AS NVARCHAR(50)),
            'Estado', NULL, 'Pendiente (Alta Inicial RRHH)', 'INSERT', @DireccionIP
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ==============================================================================
-- 2. SP_REASIGNAR_LINEA (Transacción Atómica SCD Tipo 2: RN-1, RN-2, RN-8)
-- ==============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_ReasignarLinea
    @IdEmpleado INT,
    @NuevaIdLinea INT,
    @MotivoCambio NVARCHAR(255) = N'Rebalanceo de Línea Lean',
    @UsuarioEjecutor NVARCHAR(100),
    @DireccionIP NVARCHAR(45) = '127.0.0.1'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @FechaActual DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @LineaAnteriorId INT;
    DECLARE @LineaAnteriorCodigo NVARCHAR(20);
    DECLARE @NuevaLineaCodigo NVARCHAR(20);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar existencia del empleado
        SELECT @LineaAnteriorId = IdLineaActual
        FROM dbo.Empleados
        WHERE IdEmpleado = @IdEmpleado;

        IF @@ROWCOUNT = 0
            THROW 50010, N'Empleado no encontrado.', 1;

        -- 2. Validar que la nueva línea exista y esté activa
        SELECT @NuevaLineaCodigo = CodigoLinea
        FROM dbo.Lineas
        WHERE IdLinea = @NuevaIdLinea AND Activo = 1;

        IF @NuevaLineaCodigo IS NULL
            THROW 50011, N'La línea destino no existe o está inactiva.', 1;

        -- Si ya está en la misma línea activa, no hacer nada
        IF @LineaAnteriorId = @NuevaIdLinea
        BEGIN
            COMMIT TRANSACTION;
            RETURN;
        END

        SELECT @LineaAnteriorCodigo = CodigoLinea FROM dbo.Lineas WHERE IdLinea = @LineaAnteriorId;

        -- 3. Cerrar asignación anterior en Histórico (SCD Tipo 2)
        UPDATE dbo.Empleado_Linea_Historico
        SET FechaFin = @FechaActual
        WHERE IdEmpleado = @IdEmpleado AND FechaFin IS NULL;

        -- 4. Insertar nueva asignación en Histórico
        INSERT INTO dbo.Empleado_Linea_Historico (
            IdEmpleado, IdLinea, FechaInicio, FechaFin, MotivoCambio, UsuarioCreacion, FechaCreacion
        )
        VALUES (
            @IdEmpleado, @NuevaIdLinea, @FechaActual, NULL, @MotivoCambio, @UsuarioEjecutor, @FechaActual
        );

        -- 5. Actualizar puntero en maestro Empleados y pasar a 'Activo' si estaba 'Pendiente'
        UPDATE dbo.Empleados
        SET IdLineaActual = @NuevaIdLinea,
            Estado = CASE WHEN Estado = 'Pendiente' THEN 'Activo' ELSE Estado END,
            UsuarioModificacion = @UsuarioEjecutor,
            FechaModificacion = @FechaActual
        WHERE IdEmpleado = @IdEmpleado;

        -- 6. Registrar Auditoría Inmutable (RN-4)
        INSERT INTO dbo.Auditoria (
            Usuario, FechaHora, Modulo, Tabla, RegistroId,
            Campo, ValorAnterior, ValorNuevo, Accion, DireccionIP
        )
        VALUES (
            @UsuarioEjecutor, @FechaActual, 'ASIGNACIONES', 'Empleado_Linea_Historico', CAST(@IdEmpleado AS NVARCHAR(50)),
            'IdLinea', ISNULL(@LineaAnteriorCodigo, 'SIN_LINEA'), @NuevaLineaCodigo, 'REASIGNACION', @DireccionIP
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ==============================================================================
-- 3. SP_REASIGNAR_PUESTO (Transacción Atómica SCD Tipo 2)
-- ==============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_ReasignarPuesto
    @IdEmpleado INT,
    @NuevoIdPuesto INT,
    @MotivoCambio NVARCHAR(255) = N'Cualificación / Polivalencia',
    @UsuarioEjecutor NVARCHAR(100),
    @DireccionIP NVARCHAR(45) = '127.0.0.1'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @FechaActual DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @PuestoAnteriorId INT;
    DECLARE @PuestoAnteriorNombre NVARCHAR(100);
    DECLARE @NuevoPuestoNombre NVARCHAR(100);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @PuestoAnteriorId = IdPuestoActual
        FROM dbo.Empleados
        WHERE IdEmpleado = @IdEmpleado;

        IF @@ROWCOUNT = 0
            THROW 50020, N'Empleado no encontrado.', 1;

        SELECT @NuevoPuestoNombre = Nombre FROM dbo.Puestos WHERE IdPuesto = @NuevoIdPuesto;
        SELECT @PuestoAnteriorNombre = Nombre FROM dbo.Puestos WHERE IdPuesto = @PuestoAnteriorId;

        -- Cerrar SCD2 previo
        UPDATE dbo.Empleado_Puesto_Historico
        SET FechaFin = @FechaActual
        WHERE IdEmpleado = @IdEmpleado AND FechaFin IS NULL;

        -- Insertar nuevo
        INSERT INTO dbo.Empleado_Puesto_Historico (
            IdEmpleado, IdPuesto, FechaInicio, FechaFin, MotivoCambio, UsuarioCreacion, FechaCreacion
        )
        VALUES (
            @IdEmpleado, @NuevoIdPuesto, @FechaActual, NULL, @MotivoCambio, @UsuarioEjecutor, @FechaActual
        );

        -- Actualizar maestro
        UPDATE dbo.Empleados
        SET IdPuestoActual = @NuevoIdPuesto,
            UsuarioModificacion = @UsuarioEjecutor,
            FechaModificacion = @FechaActual
        WHERE IdEmpleado = @IdEmpleado;

        -- Auditoría
        INSERT INTO dbo.Auditoria (
            Usuario, FechaHora, Modulo, Tabla, RegistroId,
            Campo, ValorAnterior, ValorNuevo, Accion, DireccionIP
        )
        VALUES (
            @UsuarioEjecutor, @FechaActual, 'ASIGNACIONES', 'Empleado_Puesto_Historico', CAST(@IdEmpleado AS NVARCHAR(50)),
            'IdPuesto', ISNULL(@PuestoAnteriorNombre, 'SIN_PUESTO'), @NuevoPuestoNombre, 'REASIGNACION_PUESTO', @DireccionIP
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ==============================================================================
-- 4. SP_BAJA_EMPLEADO (RN-3: Prohibido borrado físico; Cierre de asignaciones)
-- ==============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_BajaEmpleado
    @IdEmpleado INT,
    @MotivoBaja NVARCHAR(200),
    @ObservacionesBaja NVARCHAR(500) = NULL,
    @UsuarioEjecutor NVARCHAR(100),
    @DireccionIP NVARCHAR(45) = '127.0.0.1'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @FechaActual DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @EstadoAnterior NVARCHAR(20);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @EstadoAnterior = Estado
        FROM dbo.Empleados
        WHERE IdEmpleado = @IdEmpleado;

        IF @@ROWCOUNT = 0
            THROW 50030, N'Empleado no encontrado.', 1;

        -- 1. Cerrar asignación de línea activa
        UPDATE dbo.Empleado_Linea_Historico
        SET FechaFin = @FechaActual,
            MotivoCambio = N'Cierre por Baja de Empleado'
        WHERE IdEmpleado = @IdEmpleado AND FechaFin IS NULL;

        -- 2. Cerrar asignación de puesto activo
        UPDATE dbo.Empleado_Puesto_Historico
        SET FechaFin = @FechaActual,
            MotivoCambio = N'Cierre por Baja de Empleado'
        WHERE IdEmpleado = @IdEmpleado AND FechaFin IS NULL;

        -- 3. Marcar baja lógica en la ficha maestra (REGLA 3)
        UPDATE dbo.Empleados
        SET Estado = 'Baja',
            FechaBaja = CAST(GETDATE() AS DATE),
            MotivoBaja = @MotivoBaja,
            ObservacionesBaja = @ObservacionesBaja,
            IdLineaActual = NULL,
            UsuarioModificacion = @UsuarioEjecutor,
            FechaModificacion = @FechaActual
        WHERE IdEmpleado = @IdEmpleado;

        -- 4. Auditoría obligatoria (RN-4)
        INSERT INTO dbo.Auditoria (
            Usuario, FechaHora, Modulo, Tabla, RegistroId,
            Campo, ValorAnterior, ValorNuevo, Accion, DireccionIP
        )
        VALUES (
            @UsuarioEjecutor, @FechaActual, 'EMPLEADOS', 'Empleados', CAST(@IdEmpleado AS NVARCHAR(50)),
            'Estado', @EstadoAnterior, 'Baja (' + @MotivoBaja + ')', 'DELETE_LOGICO', @DireccionIP
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ==============================================================================
-- 5. SP_CONSULTAR_ESTADO_HISTORICO_EN_FECHA (RN-7: Time Machine Query)
-- "¿En qué línea, puesto y turno estaba cualquier empleado en una fecha dada?"
-- ==============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_ConsultarEstadoHistoricoEnFecha
    @FechaConsulta DATETIME2(3),
    @IdEmpleado INT = NULL -- NULL devuelve toda la fábrica
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.IdEmpleado,
        e.CodigoEmpleado,
        e.SiglasERP,
        e.NombreCompleto,
        e.Estado AS EstadoActual,
        
        -- Línea en la fecha consultada
        ISNULL(l.CodigoLinea, 'SIN_ASIGNACION') AS CodigoLineaHistorica,
        ISNULL(l.Nombre, 'Sin Línea Asignada') AS NombreLineaHistorica,
        lh.FechaInicio AS AsignacionLineaInicio,
        lh.FechaFin AS AsignacionLineaFin,
        
        -- Puesto en la fecha consultada
        ISNULL(p.Nombre, 'Sin Puesto Asignado') AS PuestoHistorico,
        
        -- Turno en la fecha consultada
        ISNULL(t.Nombre, 'Turno Habitual') AS TurnoHistorico,
        
        -- Responsable en la fecha consultada
        ISNULL(resp.NombreCompleto, 'Sin Responsable Asignado') AS ResponsableHistorico
    FROM dbo.Empleados e
    -- Histórico de Línea en la fecha
    LEFT JOIN dbo.Empleado_Linea_Historico lh 
        ON e.IdEmpleado = lh.IdEmpleado 
        AND @FechaConsulta >= lh.FechaInicio 
        AND (@FechaConsulta < lh.FechaFin OR lh.FechaFin IS NULL)
    LEFT JOIN dbo.Lineas l ON lh.IdLinea = l.IdLinea
    
    -- Histórico de Puesto en la fecha
    LEFT JOIN dbo.Empleado_Puesto_Historico ph 
        ON e.IdEmpleado = ph.IdEmpleado 
        AND @FechaConsulta >= ph.FechaInicio 
        AND (@FechaConsulta < ph.FechaFin OR ph.FechaFin IS NULL)
    LEFT JOIN dbo.Puestos p ON ph.IdPuesto = p.IdPuesto
    
    -- Histórico de Turno en la fecha
    LEFT JOIN dbo.Empleado_Turno_Historico th 
        ON e.IdEmpleado = th.IdEmpleado 
        AND @FechaConsulta >= th.FechaInicio 
        AND (@FechaConsulta < th.FechaFin OR th.FechaFin IS NULL)
    LEFT JOIN dbo.Turnos t ON th.IdTurno = t.IdTurno
    
    -- Histórico de Responsable en la fecha
    LEFT JOIN dbo.Empleado_Responsable_Historico rh 
        ON e.IdEmpleado = rh.IdEmpleado 
        AND @FechaConsulta >= rh.FechaInicio 
        AND (@FechaConsulta < rh.FechaFin OR rh.FechaFin IS NULL)
    LEFT JOIN dbo.Empleados resp ON rh.IdResponsable = resp.IdEmpleado
    WHERE (@IdEmpleado IS NULL OR e.IdEmpleado = @IdEmpleado)
      -- Solo empleados dados de alta antes de la fecha consultada y no dados de baja antes
      AND e.FechaAlta <= CAST(@FechaConsulta AS DATE)
      AND (e.FechaBaja IS NULL OR e.FechaBaja >= CAST(@FechaConsulta AS DATE))
    ORDER BY l.CodigoLinea, e.Apellidos, e.Nombre;
END;
GO
