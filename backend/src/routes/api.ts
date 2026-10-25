import { Router } from 'express';
import { empleadosController } from '../controllers/empleadosController';
import { asignacionesController } from '../controllers/asignacionesController';
import { organizacionController } from '../controllers/organizacionController';
import { formacionController } from '../controllers/formacionController';
import { competenciasController } from '../controllers/competenciasController';
import { historicoController } from '../controllers/historicoController';
import { auditoriaController } from '../controllers/auditoriaController';
import { requireRole } from '../config/security';
import { sseService } from '../services/sseService';

export const apiRouter = Router();

// ==============================================================================
// 1. CANAL DE EVENTOS EN TIEMPO REAL (SSE) PARA KIOSCOS Y MONITORES DE PLANTA
// ==============================================================================
apiRouter.get('/events', (req, res) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const role = (req.query.role as string) || 'KIOSCO';
  sseService.addClient(clientId, role, res);
});

// ==============================================================================
// 2. GESTIÓN ORGANIZATIVA (L1..L5, BOX 1, PUESTOS, TURNOS)
// ==============================================================================
apiRouter.get('/organizacion/lineas', organizacionController.getLineas);
apiRouter.get('/organizacion/puestos', organizacionController.getPuestos);
apiRouter.get('/organizacion/turnos', organizacionController.getTurnos);

// ==============================================================================
// 3. MÓDULO 1: GESTIÓN DE EMPLEADOS
// ==============================================================================
apiRouter.get('/empleados', empleadosController.getEmpleados);
apiRouter.post('/empleados', requireRole(['RRHH', 'DIRECCION']), empleadosController.crearEmpleado);
apiRouter.post('/empleados/:id/baja', requireRole(['RRHH', 'DIRECCION']), empleadosController.darBajaEmpleado);

// ==============================================================================
// 4. MÓDULO 3: ASIGNACIONES Y REBALANCEO LEAN
// ==============================================================================
apiRouter.post('/asignaciones/linea', requireRole(['PRODUCCION', 'MANDOS', 'DIRECCION']), asignacionesController.reasignarLinea);
apiRouter.post('/asignaciones/puesto', requireRole(['PRODUCCION', 'MANDOS', 'DIRECCION']), asignacionesController.reasignarPuesto);
apiRouter.get('/asignaciones/lean-balance', asignacionesController.getLeanBalance);

// ==============================================================================
// 5. MÓDULO 4: FORMACIÓN Y CERTIFICACIONES
// ==============================================================================
apiRouter.get('/formacion/catalogo', formacionController.getCatalogo);
apiRouter.get('/formacion/alertas', formacionController.getAlertasCaducidad);
apiRouter.post('/formacion/asignar', requireRole(['RRHH', 'DIRECCION']), formacionController.asignarFormacion);

// ==============================================================================
// 6. MÓDULO 5: MATRIZ DE COMPETENCIAS Y POLIVALENCIA
// ==============================================================================
apiRouter.get('/competencias/matriz', competenciasController.getMatrizCompetencias);
apiRouter.post('/competencias/evaluar', requireRole(['PRODUCCION', 'RRHH', 'DIRECCION']), competenciasController.evaluarCompetencia);

// ==============================================================================
// 7. MÓDULO 8: TIME MACHINE & AUDITORÍA INMUTABLE (RN-4 & RN-7)
// ==============================================================================
apiRouter.get('/historico/estado-en-fecha', historicoController.consultarEstadoEnFecha);
apiRouter.get('/auditoria', requireRole(['DIRECCION', 'RRHH']), auditoriaController.getAuditoriaLog);
