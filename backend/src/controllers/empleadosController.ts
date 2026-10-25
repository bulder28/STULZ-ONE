import { Request, Response } from 'express';
import { getPool, isConnectedToSqlServer, localStore, EmpleadoRecord } from '../config/database';
import { sseService } from '../services/sseService';

/**
 * Normaliza cadenas a MAYÚSCULAS y SIN ACENTOS (Estándar STULZ)
 */
export function normalizarTexto(str: string): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/Ñ/g, 'N')              // Estandarización ERP
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PARTICULAS_A_OMITIR = new Set([
  'DE', 'LA', 'LAS', 'DEL', 'LOS', 'Y', 'E', 'SAN', 'SANTA', 'DA', 'DO', 'DOS', 'DAS', 'VON', 'VAN', 'DI'
]);

/**
 * Generador automático de Siglas ERP STULZ (Máximo 4 caracteres)
 * Omite partículas como "DE LA", "DEL", "Y", etc.
 * Ej: JUAN ANTONIO VEGA SANCHEZ -> JAVS
 * Ej: ALBERTO DE LA ROSA MORENO -> ARM
 */
export function generarSiglasAutomaticas(nombre: string, apellidos: string): string {
  const normNombre = normalizarTexto(nombre);
  const normApellidos = normalizarTexto(apellidos);
  const frase = `${normNombre} ${normApellidos}`.trim();
  const palabras = frase.split(' ').filter(p => p.length > 0);
  const significativas = palabras.filter(p => !PARTICULAS_A_OMITIR.has(p));

  if (significativas.length === 0) return 'STLZ';

  let siglas = '';
  if (significativas.length >= 4) {
    siglas = significativas.slice(0, 4).map(p => p[0]).join('');
  } else if (significativas.length === 3) {
    siglas = significativas.map(p => p[0]).join('');
  } else if (significativas.length === 2) {
    siglas = significativas[0][0] + significativas[1].slice(0, 2);
  } else {
    siglas = significativas[0].slice(0, 4);
  }

  return siglas.slice(0, 4).toUpperCase();
}

export const empleadosController = {
  /**
   * Listar Empleados con Filtros
   */
  async getEmpleados(req: Request, res: Response) {
    try {
      const { estado, lineaId, busqueda } = req.query;

      if (isConnectedToSqlServer) {
        const pool = getPool();
        if (pool) {
          let query = 'SELECT * FROM dbo.vw_PBI_PlantillaActual WHERE 1=1';
          const request = pool.request();

          if (estado) {
            query += ' AND Estado = @estado';
            request.input('estado', estado);
          }
          if (lineaId) {
            query += ' AND [Codigo Linea] = @lineaId';
            request.input('lineaId', lineaId);
          }
          const result = await request.query(query);
          return res.json(result.recordset);
        }
      }

      // Fallback localStore
      let data = [...localStore.empleados];
      if (estado) {
        data = data.filter(e => e.Estado.toLowerCase() === (estado as string).toLowerCase());
      }
      if (lineaId) {
        const targetLinea = localStore.lineas.find(l => l.CodigoLinea === lineaId || l.IdLinea === Number(lineaId));
        if (targetLinea) {
          data = data.filter(e => e.IdLineaActual === targetLinea.IdLinea);
        }
      }
      if (busqueda) {
        const term = normalizarTexto(busqueda as string);
        data = data.filter(e => 
          normalizarTexto(e.NombreCompleto).includes(term) ||
          e.SiglasERP.toUpperCase().includes(term) ||
          e.CodigoEmpleado.includes(term)
        );
      }

      const enriched = data.map(e => {
        const linea = localStore.lineas.find(l => l.IdLinea === e.IdLineaActual);
        const puesto = localStore.puestos.find(p => p.IdPuesto === e.IdPuestoActual);
        const turno = localStore.turnos.find(t => t.IdTurno === e.IdTurnoActual);
        return {
          ...e,
          LineaCodigo: linea ? linea.CodigoLinea : 'SIN_LINEA',
          LineaNombre: linea ? linea.Nombre : 'Sin Línea Asignada',
          PuestoNombre: puesto ? puesto.Nombre : 'Sin Puesto Asignado',
          PuestoCategoria: puesto ? puesto.Categoria : 'N/A',
          TurnoNombre: turno ? turno.Nombre : 'T1'
        };
      });

      return res.json(enriched);
    } catch (error: any) {
      return res.status(500).json({ error: 'ERROR_OBTENER_EMPLEADOS', detalle: error.message });
    }
  },

  /**
   * Alta de Empleado (Módulo 6: Workflow Inicial -> 'Pendiente')
   * Normalización estricta en MAYÚSCULAS y SIN ACENTOS + Auto-Siglas (máx 4)
   */
  async crearEmpleado(req: Request, res: Response) {
    try {
      const { codigoEmpleado, siglasERP, nombre, apellidos, dni, email, telefono, departamentoId, turnoId } = req.body;
      const usuario = (req as any).userName || 'RRHH_USER';
      const ip = req.ip || '127.0.0.1';

      if (!codigoEmpleado || !nombre || !apellidos) {
        return res.status(400).json({ error: 'DATOS_INCOMPLETOS', mensaje: 'Código, Nombre y Apellidos son obligatorios.' });
      }

      // Normalización estricta: MAYÚSCULAS y SIN ACENTOS
      const nombreNorm = normalizarTexto(nombre);
      const apellidosNorm = normalizarTexto(apellidos);
      const dniNorm = dni ? normalizarTexto(dni) : null;
      
      // Auto-asignación de siglas si no vienen o para garantizar regla (máx 4)
      const siglasCalculadas = (siglasERP ? normalizarTexto(siglasERP).slice(0, 4) : generarSiglasAutomaticas(nombreNorm, apellidosNorm));

      if (isConnectedToSqlServer) {
        const pool = getPool();
        if (pool) {
          const request = pool.request()
            .input('CodigoEmpleado', codigoEmpleado)
            .input('SiglasERP', siglasCalculadas)
            .input('Nombre', nombreNorm)
            .input('Apellidos', apellidosNorm)
            .input('DNI_NIE', dniNorm)
            .input('EmailCorporativo', email || null)
            .input('Telefono', telefono || null)
            .input('IdDepartamento', departamentoId || 1)
            .input('IdTurno', turnoId || 1)
            .input('UsuarioEjecutor', usuario)
            .input('DireccionIP', ip)
            .output('NuevoIdEmpleado');

          const result = await request.execute('dbo.sp_AltaEmpleado');
          const nuevoId = result.output.NuevoIdEmpleado;

          sseService.broadcast({ type: 'EMPLEADO_CREADO', payload: { id: nuevoId, siglas: siglasCalculadas } });
          return res.status(201).json({ success: true, idEmpleado: nuevoId, siglas: siglasCalculadas, estado: 'Pendiente' });
        }
      }

      // Local Store Mode
      const existe = localStore.empleados.find(e => e.SiglasERP === siglasCalculadas || e.CodigoEmpleado === codigoEmpleado);
      if (existe) {
        return res.status(409).json({ error: 'DUPLICADO', mensaje: 'El código de empleado o las siglas ya existen.' });
      }

      const nuevoId = localStore.empleados.length + 1;
      const nuevoEmpleado: EmpleadoRecord = {
        IdEmpleado: nuevoId,
        CodigoEmpleado: codigoEmpleado,
        SiglasERP: siglasCalculadas,
        Nombre: nombreNorm,
        Apellidos: apellidosNorm,
        NombreCompleto: `${apellidosNorm}, ${nombreNorm}`,
        DNI_NIE: dni,
        EmailCorporativo: email,
        Telefono: telefono,
        IdDepartamento: departamentoId || 1,
        IdLineaActual: null, // Pendiente de asignación por Producción
        IdPuestoActual: null, // Pendiente de asignación por Producción
        IdTurnoActual: turnoId || 1,
        IdResponsableActual: null,
        Estado: 'Pendiente',
        FechaAlta: new Date().toISOString().split('T')[0],
        EnFormacion: true,
        FactorFTE: 0.3
      };

      localStore.empleados.push(nuevoEmpleado);

      localStore.auditoria.push({
        IdAuditoria: localStore.auditoria.length + 1,
        Usuario: usuario,
        FechaHora: new Date().toISOString(),
        Modulo: 'EMPLEADOS',
        Tabla: 'Empleados',
        RegistroId: String(nuevoId),
        Campo: 'Estado',
        ValorAnterior: null,
        ValorNuevo: 'Pendiente (Alta Inicial RRHH)',
        Accion: 'INSERT',
        DireccionIP: ip
      });

      sseService.broadcast({ type: 'EMPLEADO_CREADO', payload: nuevoEmpleado });
      return res.status(201).json({ success: true, empleado: nuevoEmpleado });
    } catch (error: any) {
      return res.status(500).json({ error: 'ERROR_ALTA_EMPLEADO', detalle: error.message });
    }
  },

  /**
   * Baja de Empleado (Módulo 7 / RN-3: No eliminación física)
   */
  async darBajaEmpleado(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { motivoBaja, observaciones } = req.body;
      const usuario = (req as any).userName || 'RRHH_USER';
      const ip = req.ip || '127.0.0.1';

      if (!motivoBaja) {
        return res.status(400).json({ error: 'MOTIVO_REQUERIDO', mensaje: 'Debe especificar el motivo de la baja.' });
      }

      if (isConnectedToSqlServer) {
        const pool = getPool();
        if (pool) {
          await pool.request()
            .input('IdEmpleado', id)
            .input('MotivoBaja', motivoBaja)
            .input('ObservacionesBaja', observaciones || null)
            .input('UsuarioEjecutor', usuario)
            .input('DireccionIP', ip)
            .execute('dbo.sp_BajaEmpleado');

          sseService.broadcast({ type: 'EMPLEADO_BAJA', payload: { id, motivo: motivoBaja } });
          return res.json({ success: true, mensaje: 'Baja lógica registrada correctamente.' });
        }
      }

      // Local Store Mode
      const emp = localStore.empleados.find(e => e.IdEmpleado === id);
      if (!emp) {
        return res.status(404).json({ error: 'NO_ENCONTRADO', mensaje: 'Empleado no encontrado.' });
      }

      const estadoPrevio = emp.Estado;
      emp.Estado = 'Baja';
      emp.FechaBaja = new Date().toISOString().split('T')[0];
      emp.MotivoBaja = motivoBaja;
      emp.ObservacionesBaja = observaciones;
      emp.IdLineaActual = null; // Cierra asignación de línea

      // Cerrar en histórico
      const histActivo = localStore.historicoLineas.find(h => h.IdEmpleado === id && h.FechaFin === null);
      if (histActivo) {
        histActivo.FechaFin = new Date().toISOString();
        histActivo.MotivoCambio = `Cierre por baja de empleado (${motivoBaja})`;
      }

      localStore.auditoria.push({
        IdAuditoria: localStore.auditoria.length + 1,
        Usuario: usuario,
        FechaHora: new Date().toISOString(),
        Modulo: 'EMPLEADOS',
        Tabla: 'Empleados',
        RegistroId: String(id),
        Campo: 'Estado',
        ValorAnterior: estadoPrevio,
        ValorNuevo: `Baja (${motivoBaja})`,
        Accion: 'DELETE_LOGICO',
        DireccionIP: ip
      });

      sseService.broadcast({ type: 'EMPLEADO_BAJA', payload: { id, motivo: motivoBaja } });
      return res.json({ success: true, mensaje: 'Baja lógica procesada (RN-3 respetada).' });
    } catch (error: any) {
      return res.status(500).json({ error: 'ERROR_BAJA_EMPLEADO', detalle: error.message });
    }
  }
};
