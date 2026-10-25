import { Request, Response } from 'express';
import { localStore } from '../config/database';
import { sseService } from '../services/sseService';

export const competenciasController = {
  getMatrizCompetencias(req: Request, res: Response) {
    const matriz = localStore.competencias.map(c => {
      const emp = localStore.empleados.find(e => e.IdEmpleado === c.IdEmpleado);
      const puesto = localStore.puestos.find(p => p.IdPuesto === c.IdPuesto);
      const linea = localStore.lineas.find(l => l.IdLinea === emp?.IdLineaActual);

      return {
        id: c.IdEmpleadoCompetencia,
        idEmpleado: c.IdEmpleado,
        siglas: emp?.SiglasERP || 'N/A',
        operario: emp?.NombreCompleto || 'Desconocido',
        linea: linea?.CodigoLinea || 'SIN_LINEA',
        idPuesto: c.IdPuesto,
        puestoNombre: puesto?.Nombre || 'Puesto',
        categoria: puesto?.Categoria || 'N/A',
        nivelCompetencia: c.NivelCompetencia,
        nivelTexto: getDescripcionNivel(c.NivelCompetencia),
        fechaEvaluacion: c.FechaEvaluacion,
        evaluador: c.Evaluador
      };
    });

    return res.json(matriz);
  },

  evaluarCompetencia(req: Request, res: Response) {
    const { idEmpleado, idPuesto, nivelCompetencia, evaluador } = req.body;
    const usuario = (req as any).userName || 'SUPERVISOR';

    let registro = localStore.competencias.find(c => c.IdEmpleado === Number(idEmpleado) && c.IdPuesto === Number(idPuesto));
    const nivelAnterior = registro ? registro.NivelCompetencia : null;

    if (registro) {
      registro.NivelCompetencia = nivelCompetencia;
      registro.FechaEvaluacion = new Date().toISOString().split('T')[0];
      registro.Evaluador = evaluador || usuario;
    } else {
      registro = {
        IdEmpleadoCompetencia: localStore.competencias.length + 1,
        IdEmpleado: Number(idEmpleado),
        IdPuesto: Number(idPuesto),
        NivelCompetencia: nivelCompetencia,
        FechaEvaluacion: new Date().toISOString().split('T')[0],
        Evaluador: evaluador || usuario
      };
      localStore.competencias.push(registro);
    }

    localStore.auditoria.push({
      IdAuditoria: localStore.auditoria.length + 1,
      Usuario: usuario,
      FechaHora: new Date().toISOString(),
      Modulo: 'COMPETENCIAS',
      Tabla: 'Empleado_Competencia',
      RegistroId: `${idEmpleado}-${idPuesto}`,
      Campo: 'NivelCompetencia',
      ValorAnterior: nivelAnterior ? String(nivelAnterior) : null,
      ValorNuevo: String(nivelCompetencia),
      Accion: nivelAnterior ? 'UPDATE' : 'INSERT',
      DireccionIP: req.ip || '127.0.0.1'
    });

    sseService.broadcast({ type: 'COMPETENCIA_ACTUALIZADA', payload: registro });
    return res.json({ success: true, registro });
  }
};

function getDescripcionNivel(nivel: number): string {
  switch (nivel) {
    case 1: return 'Nivel 1: Novato (Requiere tutor)';
    case 2: return 'Nivel 2: Autónomo (Operación estándar)';
    case 3: return 'Nivel 3: Avanzado (Resuelve incidencias)';
    case 4: return 'Nivel 4: Experto / Formador';
    default: return 'No calificado';
  }
}
