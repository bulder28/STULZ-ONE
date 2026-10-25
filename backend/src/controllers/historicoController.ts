import { Request, Response } from 'express';
import { getPool, isConnectedToSqlServer, localStore } from '../config/database';

export const historicoController = {
  /**
   * REGLA 7: Consulta de Situación Histórica en Fecha Concreta (Time Machine)
   * Ejemplo: ¿En qué línea y puesto estaba el empleado el 15/04/2026?
   */
  async consultarEstadoEnFecha(req: Request, res: Response) {
    try {
      const { fecha, idEmpleado } = req.query;

      if (!fecha) {
        return res.status(400).json({ error: 'FECHA_REQUERIDA', mensaje: 'Debe especificar una fecha de consulta (YYYY-MM-DD).' });
      }

      const fechaConsulta = new Date(fecha as string);
      if (isNaN(fechaConsulta.getTime())) {
        return res.status(400).json({ error: 'FECHA_INVALIDA' });
      }

      if (isConnectedToSqlServer) {
        const pool = getPool();
        if (pool) {
          const request = pool.request()
            .input('FechaConsulta', fechaConsulta)
            .input('IdEmpleado', idEmpleado ? Number(idEmpleado) : null);

          const result = await request.execute('dbo.sp_ConsultarEstadoHistoricoEnFecha');
          return res.json({
            fechaConsultada: fecha,
            totalResultados: result.recordset.length,
            resultados: result.recordset
          });
        }
      }

      // Local Store Simulation (SCD Tipo 2)
      let empleados = [...localStore.empleados];
      if (idEmpleado) {
        empleados = empleados.filter(e => e.IdEmpleado === Number(idEmpleado));
      }

      const snapshot = empleados.map(emp => {
        // Buscar la asignación de línea que abarcaba esa fecha
        const asig = localStore.historicoLineas.find(h => {
          if (h.IdEmpleado !== emp.IdEmpleado) return false;
          const fInicio = new Date(h.FechaInicio);
          const fFin = h.FechaFin ? new Date(h.FechaFin) : new Date('2099-12-31');
          return fechaConsulta >= fInicio && fechaConsulta <= fFin;
        });

        const linea = asig ? localStore.lineas.find(l => l.IdLinea === asig.IdLinea) : null;
        const puesto = localStore.puestos.find(p => p.IdPuesto === emp.IdPuestoActual);

        return {
          idEmpleado: emp.IdEmpleado,
          codigoZucchetti: emp.CodigoEmpleado,
          siglasERP: emp.SiglasERP,
          operario: emp.NombreCompleto,
          estadoActual: emp.Estado,
          lineaEnFecha: linea ? linea.CodigoLinea : 'SIN_ASIGNACION',
          lineaNombreEnFecha: linea ? linea.Nombre : 'Sin Línea Asignada en esa Fecha',
          puestoEnFecha: puesto ? puesto.Nombre : 'Sin Puesto',
          fechaInicioAsignacion: asig ? asig.FechaInicio : null,
          fechaFinAsignacion: asig ? asig.FechaFin : null,
          motivoCambio: asig ? asig.MotivoCambio : 'N/A'
        };
      });

      return res.json({
        fechaConsultada: fecha,
        totalResultados: snapshot.length,
        resultados: snapshot
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'ERROR_TIME_MACHINE', detalle: error.message });
    }
  }
};
