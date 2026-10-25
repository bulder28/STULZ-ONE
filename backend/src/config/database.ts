import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

/**
 * ==============================================================================
 * STULZ ESPAÑA — GESTOR DE CONEXIÓN SQL SERVER Y REPOSITORIO TRANSACTOR
 * ==============================================================================
 * Conexión nativa con Pool a SQL Server.
 * Si SQL Server no está iniciado localmente, conmuta automáticamente al motor
 * transaccional local en memoria con persistencia en tabla_verdad_operarios.json
 * para garantizar operatividad 100% autónoma en planta y modo air-gapped.
 * ==============================================================================
 */

export const sqlConfig: sql.config = {
  user: process.env.SQL_SERVER_USER || 'sa',
  password: process.env.SQL_SERVER_PASSWORD || 'Stulz2026!Local',
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'SGP_FABRICA_STULZ',
  port: parseInt(process.env.SQL_SERVER_PORT || '1433', 10),
  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: true
  }
};

let pool: sql.ConnectionPool | null = null;
export let isConnectedToSqlServer = false;

// Almacén en memoria de alta fidelidad para modo local / air-gapped
export interface EmpleadoRecord {
  IdEmpleado: number;
  CodigoEmpleado: string; // Zucchetti ID
  SiglasERP: string;
  Nombre: string;
  Apellidos: string;
  NombreCompleto: string;
  DNI_NIE?: string;
  EmailCorporativo?: string;
  Telefono?: string;
  IdDepartamento: number;
  IdLineaActual: number | null;
  IdPuestoActual: number | null;
  IdTurnoActual: number;
  IdResponsableActual: number | null;
  Estado: 'Pendiente' | 'Activo' | 'Baja' | 'BajaMedica_IT' | 'Permiso';
  FechaAlta: string;
  FechaBaja?: string;
  MotivoBaja?: string;
  ObservacionesBaja?: string;
  EnFormacion: boolean;
  FactorFTE: number;
}

export interface LineaRecord {
  IdLinea: number;
  CodigoLinea: string;
  Nombre: string;
  TipoLinea: string;
  CapacidadTargetFTE: number;
  MinMecanicos: number;
  MinElectricos: number;
  Estado: string;
  Activo: boolean;
}

export interface PuestoRecord {
  IdPuesto: number;
  CodigoPuesto: string;
  Nombre: string;
  Categoria: string;
  RequiereCertificacion: boolean;
}

export interface TurnoRecord {
  IdTurno: number;
  CodigoTurno: string;
  Nombre: string;
  HoraInicio: string;
  HoraFin: string;
  HorasEfectivas: number;
}

export interface AsignacionHistoricaRecord {
  IdAsignacion: number;
  IdEmpleado: number;
  IdLinea: number;
  FechaInicio: string;
  FechaFin: string | null;
  MotivoCambio: string;
  UsuarioCreacion: string;
}

export interface FormacionRecord {
  IdFormacion: number;
  CodigoCurso: string;
  NombreCurso: string;
  Tipo: string;
  MesesValidez: number | null;
  Organizador: string;
}

export interface EmpleadoFormacionRecord {
  IdEmpleadoFormacion: number;
  IdEmpleado: number;
  IdFormacion: number;
  FechaObtencion: string;
  FechaCaducidad: string | null;
  Estado: 'Vigente' | 'ProximaCaducar' | 'Caducada';
  Calificacion: string;
  HorasFormacion: number;
}

export interface CompetenciaRecord {
  IdEmpleadoCompetencia: number;
  IdEmpleado: number;
  IdPuesto: number;
  NivelCompetencia: 1 | 2 | 3 | 4;
  FechaEvaluacion: string;
  Evaluador: string;
}

export interface AuditoriaRecord {
  IdAuditoria: number;
  Usuario: string;
  FechaHora: string;
  Modulo: string;
  Tabla: string;
  RegistroId: string;
  Campo: string;
  ValorAnterior: string | null;
  ValorNuevo: string | null;
  Accion: string;
  DireccionIP: string;
}

// Estado en memoria precargado (ÚNICAMENTE L1, L2, L3, L4, L5, BOX 1 - BATERIAS EXCLUIDA)
export const localStore = {
  lineas: [
    { IdLinea: 1, CodigoLinea: 'L1', Nombre: 'Línea 1 - Climatizadores Gemela', TipoLinea: 'Gemela', CapacidadTargetFTE: 14.0, MinMecanicos: 10, MinElectricos: 4, Estado: 'Operativa', Activo: true },
    { IdLinea: 2, CodigoLinea: 'L2', Nombre: 'Línea 2 - Climatizadores Gemela', TipoLinea: 'Gemela', CapacidadTargetFTE: 14.0, MinMecanicos: 10, MinElectricos: 4, Estado: 'Operativa', Activo: true },
    { IdLinea: 3, CodigoLinea: 'L3', Nombre: 'Línea 3 - Climatizadores Gemela', TipoLinea: 'Gemela', CapacidadTargetFTE: 14.0, MinMecanicos: 10, MinElectricos: 4, Estado: 'Operativa', Activo: true },
    { IdLinea: 4, CodigoLinea: 'L4', Nombre: 'Línea 4 - Climatizadores Gemela', TipoLinea: 'Gemela', CapacidadTargetFTE: 14.0, MinMecanicos: 10, MinElectricos: 4, Estado: 'Operativa', Activo: true },
    { IdLinea: 5, CodigoLinea: 'L5', Nombre: 'Línea 5 - Climatizadores Gemela', TipoLinea: 'Gemela', CapacidadTargetFTE: 14.0, MinMecanicos: 10, MinElectricos: 4, Estado: 'Operativa', Activo: true },
    { IdLinea: 6, CodigoLinea: 'BOX 1', Nombre: 'Box 1 - Unidades Especiales / Prototipos', TipoLinea: 'Box', CapacidadTargetFTE: 8.0, MinMecanicos: 6, MinElectricos: 2, Estado: 'Operativa', Activo: true }
  ] as LineaRecord[],

  puestos: [
    { IdPuesto: 1, CodigoPuesto: 'P_MEC', Nombre: 'Montador Mecánico', Categoria: 'Mecánica', RequiereCertificacion: false },
    { IdPuesto: 2, CodigoPuesto: 'P_ELEC', Nombre: 'Montador Eléctrico', Categoria: 'Eléctrica', RequiereCertificacion: true },
    { IdPuesto: 3, CodigoPuesto: 'P_OPER_GRUA', Nombre: 'Operador de Puente Grúa', Categoria: 'Logística', RequiereCertificacion: true },
    { IdPuesto: 4, CodigoPuesto: 'P_PINT', Nombre: 'Pintor Industrial', Categoria: 'Mecánica', RequiereCertificacion: false },
    { IdPuesto: 5, CodigoPuesto: 'P_LOG', Nombre: 'Operario de Logística', Categoria: 'Logística', RequiereCertificacion: true },
    { IdPuesto: 6, CodigoPuesto: 'P_CAL', Nombre: 'Técnico de Calidad', Categoria: 'Calidad', RequiereCertificacion: true },
    { IdPuesto: 7, CodigoPuesto: 'P_RESP_LINEA', Nombre: 'Responsable de Línea', Categoria: 'Mandos', RequiereCertificacion: true }
  ] as PuestoRecord[],

  turnos: [
    { IdTurno: 1, CodigoTurno: 'T1', Nombre: 'Turno 1 - Mañana (06:00 - 14:00)', HoraInicio: '06:00:00', HoraFin: '14:00:00', HorasEfectivas: 7.75 },
    { IdTurno: 2, CodigoTurno: 'T2', Nombre: 'Turno 2 - Tarde (14:00 - 22:00)', HoraInicio: '14:00:00', HoraFin: '22:00:00', HorasEfectivas: 7.75 }
  ] as TurnoRecord[],

  formaciones: [
    { IdFormacion: 1, CodigoCurso: 'FORM_PRL', NombreCurso: 'PRL Básico Planta Climatización', Tipo: 'Legal', MesesValidez: 36, Organizador: 'Servicio Prevención STULZ' },
    { IdFormacion: 2, CodigoCurso: 'FORM_GRUA', NombreCurso: 'Operador Puente Grúa 10T', Tipo: 'Seguridad', MesesValidez: 24, Organizador: 'Centro Homologado' },
    { IdFormacion: 3, CodigoCurso: 'FORM_CARRET', NombreCurso: 'Carretillas Elevadoras UNE 58451', Tipo: 'Seguridad', MesesValidez: 36, Organizador: 'Autoescuela Industrial' },
    { IdFormacion: 4, CodigoCurso: 'FORM_ELEC_BT', NombreCurso: 'Riesgo Eléctrico RD 614/2001 (Baja Tensión)', Tipo: 'Seguridad', MesesValidez: 24, Organizador: 'Ingeniería y Seguridad' }
  ] as FormacionRecord[],

  empleados: [
    { IdEmpleado: 1, CodigoEmpleado: '401001', SiglasERP: 'CGN', Nombre: 'Carlos', Apellidos: 'Gómez Navarro', NombreCompleto: 'GÓMEZ NAVARRO, CARLOS', IdDepartamento: 1, IdLineaActual: 1, IdPuestoActual: 7, IdTurnoActual: 1, IdResponsableActual: null, Estado: 'Activo', FechaAlta: '2024-01-15', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 2, CodigoEmpleado: '401002', SiglasERP: 'JAPE', Nombre: 'José Antonio', Apellidos: 'Pichardo Espina', NombreCompleto: 'PICHARDO ESPINA, JOSÉ ANTONIO', IdDepartamento: 1, IdLineaActual: 1, IdPuestoActual: 7, IdTurnoActual: 1, IdResponsableActual: null, Estado: 'Activo', FechaAlta: '2024-01-15', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 3, CodigoEmpleado: '401437', SiglasERP: 'EJAY', Nombre: 'Eduardo', Apellidos: 'Jiménez Ayala', NombreCompleto: 'JIMÉNEZ AYALA, EDUARDO', IdDepartamento: 1, IdLineaActual: 1, IdPuestoActual: 2, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 4, CodigoEmpleado: '401438', SiglasERP: 'SDU', Nombre: 'Samuel', Apellidos: 'Dorado Úbeda', NombreCompleto: 'DORADO ÚBEDA, SAMUEL', IdDepartamento: 1, IdLineaActual: 1, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: true, FactorFTE: 0.3 },
    { IdEmpleado: 5, CodigoEmpleado: '401439', SiglasERP: 'JMVM', Nombre: 'Juan Mauricio', Apellidos: 'Vicente Martín', NombreCompleto: 'VICENTE MARTÍN, JUAN MAURICIO', IdDepartamento: 1, IdLineaActual: 1, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 6, CodigoEmpleado: '401440', SiglasERP: 'DFM', Nombre: 'David', Apellidos: 'Fernández Morales', NombreCompleto: 'FERNÁNDEZ MORALES, DAVID', IdDepartamento: 1, IdLineaActual: 2, IdPuestoActual: 2, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 7, CodigoEmpleado: '401441', SiglasERP: 'ERM', Nombre: 'Enrique', Apellidos: 'Rodríguez Marín', NombreCompleto: 'RODRÍGUEZ MARÍN, ENRIQUE', IdDepartamento: 1, IdLineaActual: 2, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Baja', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 0.0 },
    { IdEmpleado: 8, CodigoEmpleado: '401442', SiglasERP: 'MSP', Nombre: 'Manuel', Apellidos: 'Sánchez Prieto', NombreCompleto: 'SÁNCHEZ PRIETO, MANUEL', IdDepartamento: 1, IdLineaActual: 3, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-02-01', EnFormacion: true, FactorFTE: 0.3 },
    { IdEmpleado: 9, CodigoEmpleado: '401443', SiglasERP: 'LBC', Nombre: 'Luis', Apellidos: 'Benítez Castro', NombreCompleto: 'BENÍTEZ CASTRO, LUIS', IdDepartamento: 1, IdLineaActual: 3, IdPuestoActual: 2, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 10, CodigoEmpleado: '401444', SiglasERP: 'DMV', Nombre: 'Daniel', Apellidos: 'Martín Vega', NombreCompleto: 'MARTÍN VEGA, DANIEL', IdDepartamento: 1, IdLineaActual: 4, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 11, CodigoEmpleado: '401522', SiglasERP: 'EJAY', Nombre: 'Eddy Jonathan', Apellidos: 'Acevedo Yuri', NombreCompleto: 'ACEVEDO YURI, EDDY JONATHAN', IdDepartamento: 1, IdLineaActual: 4, IdPuestoActual: 2, IdTurnoActual: 2, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-03-01', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 12, CodigoEmpleado: '401445', SiglasERP: 'RIO', Nombre: 'Roberto', Apellidos: 'Iglesias Ortiz', NombreCompleto: 'IGLESIAS ORTIZ, ROBERTO', IdDepartamento: 1, IdLineaActual: 5, IdPuestoActual: 2, IdTurnoActual: 2, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 13, CodigoEmpleado: '401520', SiglasERP: 'DMV', Nombre: 'David', Apellidos: 'Moreno Vega', NombreCompleto: 'MORENO VEGA, DAVID', IdDepartamento: 1, IdLineaActual: 5, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 14, CodigoEmpleado: '401446', SiglasERP: 'JPL', Nombre: 'Javier', Apellidos: 'Pérez López', NombreCompleto: 'PÉREZ LÓPEZ, JAVIER', IdDepartamento: 1, IdLineaActual: 6, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 },
    { IdEmpleado: 15, CodigoEmpleado: '401447', SiglasERP: 'MSP', Nombre: 'Marcos', Apellidos: 'Sanz Paredes', NombreCompleto: 'SANZ PAREDES, MARCOS', IdDepartamento: 1, IdLineaActual: 6, IdPuestoActual: 1, IdTurnoActual: 1, IdResponsableActual: 1, Estado: 'Activo', FechaAlta: '2025-01-10', EnFormacion: false, FactorFTE: 1.0 }
  ] as EmpleadoRecord[],

  historicoLineas: [
    { IdAsignacion: 1, IdEmpleado: 1, IdLinea: 1, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 2, IdEmpleado: 2, IdLinea: 1, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 3, IdEmpleado: 3, IdLinea: 1, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 4, IdEmpleado: 4, IdLinea: 1, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 5, IdEmpleado: 5, IdLinea: 1, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 6, IdEmpleado: 6, IdLinea: 2, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 7, IdEmpleado: 7, IdLinea: 2, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 8, IdEmpleado: 8, IdLinea: 3, FechaInicio: '2026-02-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Ingreso en Formación', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 9, IdEmpleado: 9, IdLinea: 3, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 10, IdEmpleado: 10, IdLinea: 4, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 11, IdEmpleado: 11, IdLinea: 4, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 12, IdEmpleado: 12, IdLinea: 5, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 13, IdEmpleado: 13, IdLinea: 5, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 14, IdEmpleado: 14, IdLinea: 6, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' },
    { IdAsignacion: 15, IdEmpleado: 15, IdLinea: 6, FechaInicio: '2026-01-01T06:00:00Z', FechaFin: null, MotivoCambio: 'Asignación Inicial', UsuarioCreacion: 'SISTEMA' }
  ] as AsignacionHistoricaRecord[],

  empleadoFormaciones: [
    { IdEmpleadoFormacion: 1, IdEmpleado: 2, IdFormacion: 1, FechaObtencion: '2025-01-15', FechaCaducidad: '2028-01-15', Estado: 'Vigente', Calificacion: 'Apto', HorasFormacion: 8 },
    { IdEmpleadoFormacion: 2, IdEmpleado: 2, IdFormacion: 4, FechaObtencion: '2024-05-10', FechaCaducidad: '2026-05-10', Estado: 'ProximaCaducar', Calificacion: 'Apto', HorasFormacion: 16 },
    { IdEmpleadoFormacion: 3, IdEmpleado: 3, IdFormacion: 2, FechaObtencion: '2023-10-01', FechaCaducidad: '2025-10-01', Estado: 'Caducada', Calificacion: 'Apto', HorasFormacion: 12 }
  ] as EmpleadoFormacionRecord[],

  competencias: [
    { IdEmpleadoCompetencia: 1, IdEmpleado: 2, IdPuesto: 2, NivelCompetencia: 4, FechaEvaluacion: '2025-12-01', Evaluador: 'Carlos Gómez' },
    { IdEmpleadoCompetencia: 2, IdEmpleado: 2, IdPuesto: 1, NivelCompetencia: 3, FechaEvaluacion: '2025-12-01', Evaluador: 'Carlos Gómez' },
    { IdEmpleadoCompetencia: 3, IdEmpleado: 3, IdPuesto: 1, NivelCompetencia: 4, FechaEvaluacion: '2025-11-15', Evaluador: 'Carlos Gómez' },
    { IdEmpleadoCompetencia: 4, IdEmpleado: 7, IdPuesto: 1, NivelCompetencia: 1, FechaEvaluacion: '2026-02-05', Evaluador: 'Carlos Gómez' }
  ] as CompetenciaRecord[],

  auditoria: [
    { IdAuditoria: 1, Usuario: 'RRHH_SISTEMA', FechaHora: new Date().toISOString(), Modulo: 'SISTEMA', Tabla: 'Configuracion', RegistroId: 'INIT', Campo: 'Arranque', ValorAnterior: null, ValorNuevo: 'Sistema Iniciado en Modo Industrial Air-Gap', Accion: 'BOOT', DireccionIP: '127.0.0.1' }
  ] as AuditoriaRecord[]
};

/**
 * Inicializar Conexión a SQL Server con Resiliencia
 */
export async function initializeDatabase(): Promise<void> {
  try {
    pool = await sql.connect(sqlConfig);
    isConnectedToSqlServer = true;
    console.log('[SQL_SERVER] Conexión establecida con éxito con la base de datos SGP_FABRICA_STULZ.');
  } catch (err: any) {
    isConnectedToSqlServer = false;
    console.warn('[SQL_SERVER_ADVERTENCIA] No se pudo conectar a SQL Server en puerto 1433 (' + err.message + ').');
    console.log('[MODO_LOCAL_AIR_GAP] Se activa el Motor Transaccional en Memoria (RN-1 a RN-8 garantizadas).');
  }
}

export function getPool(): sql.ConnectionPool | null {
  return pool;
}
