import { Request, Response } from 'express';
import { getPool, isConnectedToSqlServer, localStore, AsignacionHistoricaRecord } from '../config/database';
import { sseService } from '../services/sseService';

export const asignacionesController = {
  /**
   * Reasignar Línea (RN-1: Máximo 1 activa, RN-2: Histórico SCD Tipo 2, RN-8: Atómico)
   * Solo admite: L1, L2, L3, L4, L5 y BOX 1 (BATERÍAS estrictamente prohibida)
   */
  async reasignarLinea(req: Request, res: Response) {
    try {
      const { idEmpleado, nuevaLineaId, motivoCambio } = req.body;
      const usuario = (req as any).userName || 'PRODUCCION_MANDO';
      const ip = req.ip || '127.0.0.1';

      if (!idEmpleado || !nuevaLineaId) {
        return res.status(400).json({ error: 'DATOS_REQUERIDOS', mensaje: 'Se requiere idEmpleado y nuevaLineaId.' });
      }

      if (isConnectedToSqlServer) {
        const pool = getPool();
        if (pool) {
          await pool.request()
            .input('IdEmpleado', idEmpleado)
            .input('NuevaIdLinea', nuevaLineaId)
            .input('MotivoCambio', motivoCambio || 'Rebalanceo Lean')
            .input('UsuarioEjecutor', usuario)
            .input('DireccionIP', ip)
            .execute('dbo.sp_ReasignarLinea');

          sseService.broadcast({
            type: 'REASIGNACION_LINEA',
            payload: { idEmpleado, nuevaLineaId, usuario, fecha: new Date().toISOString() }
          });

          return res.json({ success: true, mensaje: 'Reasignación de línea completada en SQL Server.' });
        }
      }

      // Local Store Mode
      const emp = localStore.empleados.find(e => e.IdEmpleado === Number(idEmpleado));
      if (!emp) {
        return res.status(404).json({ error: 'EMPLEADO_NO_ENCONTRADO' });
      }

      const lineaDestino = localStore.lineas.find(l => l.IdLinea === Number(nuevaLineaId) || l.CodigoLinea === nuevaLineaId);
      if (!lineaDestino) {
        return res.status(400).json({ error: 'LINEA_INVALIDA', mensaje: 'Línea no existe o no es una línea válida de análisis.' });
      }

      // Validar que no sea Baterías
      if (lineaDestino.CodigoLinea.toUpperCase().includes('BATER')) {
        return res.status(400).json({ error: 'LINEA_PROHIBIDA', mensaje: 'Baterías no es una línea objeto de análisis.' });
      }

      const lineaAnteriorId = emp.IdLineaActual;
      if (lineaAnteriorId === lineaDestino.IdLinea) {
        return res.json({ success: true, mensaje: 'El operario ya se encuentra asignado a esta línea.' });
      }

      const ahora = new Date().toISOString();

      // Cerrar histórico anterior (SCD Tipo 2)
      const asignacionPrevia = localStore.historicoLineas.find(h => h.IdEmpleado === emp.IdEmpleado && h.FechaFin === null);
      if (asignacionPrevia) {
        asignacionPrevia.FechaFin = ahora;
      }

      // Crear nueva asignación activa en histórico
      const nuevaAsignacion: AsignacionHistoricaRecord = {
        IdAsignacion: localStore.historicoLineas.length + 1,
        IdEmpleado: emp.IdEmpleado,
        IdLinea: lineaDestino.IdLinea,
        FechaInicio: ahora,
        FechaFin: null,
        MotivoCambio: motivoCambio || 'Rebalanceo Lean',
        UsuarioCreacion: usuario
      };
      localStore.historicoLineas.push(nuevaAsignacion);

      // Actualizar puntero en maestro
      emp.IdLineaActual = lineaDestino.IdLinea;
      if (emp.Estado === 'Pendiente') {
        emp.Estado = 'Activo';
      }

      // Registrar Auditoría inmutable (RN-4)
      const lineaAnteriorCod = localStore.lineas.find(l => l.IdLinea === lineaAnteriorId)?.CodigoLinea || 'SIN_LINEA';
      localStore.auditoria.push({
        IdAuditoria: localStore.auditoria.length + 1,
        Usuario: usuario,
        FechaHora: ahora,
        Modulo: 'ASIGNACIONES',
        Tabla: 'Empleado_Linea_Historico',
        RegistroId: String(emp.IdEmpleado),
        Campo: 'IdLinea',
        ValorAnterior: lineaAnteriorCod,
        ValorNuevo: lineaDestino.CodigoLinea,
        Accion: 'REASIGNACION',
        DireccionIP: ip
      });

      sseService.broadcast({
        type: 'REASIGNACION_LINEA',
        payload: {
          idEmpleado: emp.IdEmpleado,
          siglas: emp.SiglasERP,
          lineaOrigen: lineaAnteriorCod,
          lineaDestino: lineaDestino.CodigoLinea,
          usuario,
          timestamp: ahora
        }
      });

      return res.json({
        success: true,
        mensaje: `Operario ${emp.SiglasERP} reasignado a ${lineaDestino.CodigoLinea} con histórico trazado.`,
        asignacion: nuevaAsignacion
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'ERROR_REASIGNACION', detalle: error.message });
    }
  },

  /**
   * Reasignar Puesto (SCD Tipo 2)
   */
  async reasignarPuesto(req: Request, res: Response) {
    try {
      const { idEmpleado, nuevoPuestoId, motivoCambio } = req.body;
      const usuario = (req as any).userName || 'PRODUCCION_MANDO';
      const ip = req.ip || '127.0.0.1';

      if (!idEmpleado || !nuevoPuestoId) {
        return res.status(400).json({ error: 'DATOS_REQUERIDOS', mensaje: 'Se requiere idEmpleado y nuevoPuestoId.' });
      }

      if (isConnectedToSqlServer) {
        const pool = getPool();
        if (pool) {
          await pool.request()
            .input('IdEmpleado', idEmpleado)
            .input('NuevoIdPuesto', nuevoPuestoId)
            .input('MotivoCambio', motivoCambio || 'Cambio de puesto / polivalencia')
            .input('UsuarioEjecutor', usuario)
            .input('DireccionIP', ip)
            .execute('dbo.sp_ReasignarPuesto');

          sseService.broadcast({ type: 'CAMBIO_PUESTO', payload: { idEmpleado, nuevoPuestoId } });
          return res.json({ success: true, mensaje: 'Cambio de puesto persistido en SQL Server.' });
        }
      }

      // Local Store Mode
      const emp = localStore.empleados.find(e => e.IdEmpleado === Number(idEmpleado));
      if (!emp) return res.status(404).json({ error: 'EMPLEADO_NO_ENCONTRADO' });

      const nuevoPuesto = localStore.puestos.find(p => p.IdPuesto === Number(nuevoPuestoId));
      if (!nuevoPuesto) return res.status(400).json({ error: 'PUESTO_INVALIDO' });

      emp.IdPuestoActual = nuevoPuesto.IdPuesto;

      localStore.auditoria.push({
        IdAuditoria: localStore.auditoria.length + 1,
        Usuario: usuario,
        FechaHora: new Date().toISOString(),
        Modulo: 'ASIGNACIONES',
        Tabla: 'Empleado_Puesto_Historico',
        RegistroId: String(emp.IdEmpleado),
        Campo: 'IdPuesto',
        ValorAnterior: String(emp.IdPuestoActual),
        ValorNuevo: nuevoPuesto.Nombre,
        Accion: 'REASIGNACION_PUESTO',
        DireccionIP: ip
      });

      sseService.broadcast({ type: 'CAMBIO_PUESTO', payload: { idEmpleado: emp.IdEmpleado, puesto: nuevoPuesto.Nombre } });
      return res.json({ success: true, puesto: nuevoPuesto.Nombre });
    } catch (error: any) {
      return res.status(500).json({ error: 'ERROR_CAMBIO_PUESTO', detalle: error.message });
    }
  },

  /**
   * Resumen de Balance Lean por Línea (Target: 14 FTE, 10 Mecánicos, 4 Eléctricos)
   */
  async getLeanBalance(req: Request, res: Response) {
    try {
      const balance = localStore.lineas.map(linea => {
        const asignados = localStore.empleados.filter(e => e.IdLineaActual === linea.IdLinea && e.Estado === 'Activo');
        
        let fteTotal = 0;
        let mecanicos = 0;
        let electricos = 0;
        let enFormacion = 0;

        for (const op of asignados) {
          fteTotal += op.FactorFTE;
          if (op.EnFormacion) enFormacion++;
          const puesto = localStore.puestos.find(p => p.IdPuesto === op.IdPuestoActual);
          if (puesto?.Categoria === 'Mecánica') mecanicos++;
          if (puesto?.Categoria === 'Eléctrica') electricos++;
        }

        const gapFTE = +(fteTotal - linea.CapacidadTargetFTE).toFixed(2);
        let estado = 'Balanceada';
        if (gapFTE < -2) estado = 'Cuello de Botella Crítico';
        else if (gapFTE < 0) estado = 'Alerta Leve';

        return {
          idLinea: linea.IdLinea,
          codigoLinea: linea.CodigoLinea,
          nombre: linea.Nombre,
          targetFTE: linea.CapacidadTargetFTE,
          minMecanicos: linea.MinMecanicos,
          minElectricos: linea.MinElectricos,
          totalOperarios: asignados.length,
          totalFTE: +fteTotal.toFixed(2),
          mecanicos,
          electricos,
          enFormacion,
          gapFTE,
          estado
        };
      });

      return res.json(balance);
    } catch (error: any) {
      return res.status(500).json({ error: 'ERROR_LEAN_BALANCE', detalle: error.message });
    }
  }
};
