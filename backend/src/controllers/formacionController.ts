import { Request, Response } from 'express';
import { localStore } from '../config/database';
import { sseService } from '../services/sseService';

export const formacionController = {
  getCatalogo(req: Request, res: Response) {
    return res.json(localStore.formaciones);
  },

  getAlertasCaducidad(req: Request, res: Response) {
    const hoy = new Date();
    const alertas = localStore.empleadoFormaciones.map(ef => {
      const emp = localStore.empleados.find(e => e.IdEmpleado === ef.IdEmpleado);
      const curso = localStore.formaciones.find(f => f.IdFormacion === ef.IdFormacion);
      const linea = localStore.lineas.find(l => l.IdLinea === emp?.IdLineaActual);

      let dias = 999;
      let estadoSemaforo = 'Vigente';

      if (ef.FechaCaducidad) {
        const cad = new Date(ef.FechaCaducidad);
        dias = Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (dias < 0) estadoSemaforo = 'CADUCADO';
        else if (dias <= 30) estadoSemaforo = 'URGENTE (<30d)';
        else if (dias <= 60) estadoSemaforo = 'PROXIMA (<60d)';
      }

      return {
        id: ef.IdEmpleadoFormacion,
        idEmpleado: ef.IdEmpleado,
        siglas: emp?.SiglasERP || 'N/A',
        operario: emp?.NombreCompleto || 'Desconocido',
        linea: linea?.CodigoLinea || 'SIN_LINEA',
        curso: curso?.NombreCurso || 'Curso',
        tipo: curso?.Tipo || 'Seguridad',
        fechaObtencion: ef.FechaObtencion,
        fechaCaducidad: ef.FechaCaducidad,
        diasHastaCaducidad: dias,
        estadoSemaforo,
        horas: ef.HorasFormacion
      };
    });

    return res.json(alertas);
  },

  asignarFormacion(req: Request, res: Response) {
    const { idEmpleado, idFormacion, fechaObtencion, calificacion, horas } = req.body;
    const usuario = (req as any).userName || 'RRHH_USER';

    const curso = localStore.formaciones.find(f => f.IdFormacion === Number(idFormacion));
    if (!curso) return res.status(404).json({ error: 'CURSO_NO_ENCONTRADO' });

    let fechaCaducidad: string | null = null;
    if (curso.MesesValidez) {
      const d = new Date(fechaObtencion || new Date());
      d.setMonth(d.getMonth() + curso.MesesValidez);
      fechaCaducidad = d.toISOString().split('T')[0];
    }

    const nuevoRegistro = {
      IdEmpleadoFormacion: localStore.empleadoFormaciones.length + 1,
      IdEmpleado: Number(idEmpleado),
      IdFormacion: Number(idFormacion),
      FechaObtencion: fechaObtencion || new Date().toISOString().split('T')[0],
      FechaCaducidad: fechaCaducidad,
      Estado: 'Vigente' as const,
      Calificacion: calificacion || 'Apto',
      HorasFormacion: horas || 8
    };

    localStore.empleadoFormaciones.push(nuevoRegistro);

    localStore.auditoria.push({
      IdAuditoria: localStore.auditoria.length + 1,
      Usuario: usuario,
      FechaHora: new Date().toISOString(),
      Modulo: 'FORMACION',
      Tabla: 'Empleado_Formacion',
      RegistroId: String(idEmpleado),
      Campo: 'IdFormacion',
      ValorAnterior: null,
      ValorNuevo: curso.NombreCurso,
      Accion: 'INSERT',
      DireccionIP: req.ip || '127.0.0.1'
    });

    sseService.broadcast({ type: 'FORMACION_ASIGNADA', payload: nuevoRegistro });
    return res.status(201).json({ success: true, registro: nuevoRegistro });
  }
};
