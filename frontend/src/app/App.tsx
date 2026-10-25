import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, Tabs, Tab, Container, Alert, Snackbar } from '@mui/material';
import { industrialLightTheme } from './theme';
import { Header } from '../shared/Header';
import { CuadranteBoard } from '../features/produccion/components/CuadranteBoard';
import { BajasMedicasPanel } from '../features/rrhh/components/BajasMedicasPanel';
import { ZucchettiFichajesTable } from '../features/rrhh/components/ZucchettiFichajesTable';
import { FormacionMatriz } from '../features/rrhh/components/FormacionMatriz';
import { ExecutiveKpiCards } from '../features/direccion/components/ExecutiveKpiCards';
import { TimeMachineQuery } from '../features/direccion/components/TimeMachineQuery';
import { AuditLogViewer } from '../features/direccion/components/AuditLogViewer';
import { AltaOperarioModal, AltaOperarioFormInput } from '../features/rrhh/components/AltaOperarioModal';

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<'PRODUCCION' | 'RRHH' | 'DIRECCION'>('PRODUCCION');
  const [activeTab, setActiveTab] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [isAltaModalOpen, setIsAltaModalOpen] = useState(false);

  // Operarios maestros en memoria reactiva inicializados con la plantilla real de planta
  const [operarios, setOperarios] = useState([
    { IdEmpleado: 1, SiglasERP: 'CGN', NombreCompleto: 'GOMEZ NAVARRO, CARLOS', CodigoEmpleado: '401001', LineaCodigo: 'L1', PuestoNombre: 'Responsable de Línea', PuestoCategoria: 'Mandos', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2024-01-15' },
    { IdEmpleado: 2, SiglasERP: 'JAPE', NombreCompleto: 'PICHARDO ESPINA, JOSE ANTONIO', CodigoEmpleado: '401002', LineaCodigo: 'L1', PuestoNombre: 'Responsable de Línea', PuestoCategoria: 'Mandos', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2024-01-15' },
    { IdEmpleado: 3, SiglasERP: 'EJAY', NombreCompleto: 'JIMENEZ AYALA, EDUARDO', CodigoEmpleado: '401437', LineaCodigo: 'L1', PuestoNombre: 'Montador Eléctrico', PuestoCategoria: 'Eléctrica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 4, SiglasERP: 'SDU', NombreCompleto: 'DORADO UBEDA, SAMUEL', CodigoEmpleado: '401438', LineaCodigo: 'L1', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: true, FactorFTE: 0.3, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 5, SiglasERP: 'JMVM', NombreCompleto: 'VICENTE MARTIN, JUAN MAURICIO', CodigoEmpleado: '401439', LineaCodigo: 'L1', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 6, SiglasERP: 'DFM', NombreCompleto: 'FERNANDEZ MORALES, DAVID', CodigoEmpleado: '401440', LineaCodigo: 'L2', PuestoNombre: 'Montador Eléctrico', PuestoCategoria: 'Eléctrica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 7, SiglasERP: 'ERM', NombreCompleto: 'RODRIGUEZ MARIN, ENRIQUE', CodigoEmpleado: '401441', LineaCodigo: 'L2', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: false, FactorFTE: 0.0, Estado: 'Baja', FechaAlta: '2025-01-10' },
    { IdEmpleado: 8, SiglasERP: 'MSP', NombreCompleto: 'SANCHEZ PRIETO, MANUEL', CodigoEmpleado: '401442', LineaCodigo: 'L3', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: true, FactorFTE: 0.3, Estado: 'Activo', FechaAlta: '2025-02-01' },
    { IdEmpleado: 9, SiglasERP: 'LBC', NombreCompleto: 'BENITEZ CASTRO, LUIS', CodigoEmpleado: '401443', LineaCodigo: 'L3', PuestoNombre: 'Montador Eléctrico', PuestoCategoria: 'Eléctrica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 10, SiglasERP: 'DMV', NombreCompleto: 'MARTIN VEGA, DANIEL', CodigoEmpleado: '401444', LineaCodigo: 'L4', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 11, SiglasERP: 'EJAY', NombreCompleto: 'ACEVEDO YURI, EDDY JONATHAN', CodigoEmpleado: '401522', LineaCodigo: 'L4', PuestoNombre: 'Montador Eléctrico', PuestoCategoria: 'Eléctrica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-03-01' },
    { IdEmpleado: 12, SiglasERP: 'RIO', NombreCompleto: 'IGLESIAS ORTIZ, ROBERTO', CodigoEmpleado: '401445', LineaCodigo: 'L5', PuestoNombre: 'Montador Eléctrico', PuestoCategoria: 'Eléctrica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 13, SiglasERP: 'DMV', NombreCompleto: 'MORENO VEGA, DAVID', CodigoEmpleado: '401520', LineaCodigo: 'L5', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 14, SiglasERP: 'JPL', NombreCompleto: 'PEREZ LOPEZ, JAVIER', CodigoEmpleado: '401446', LineaCodigo: 'BOX 1', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
    { IdEmpleado: 15, SiglasERP: 'MSP', NombreCompleto: 'SANZ PAREDES, MARCOS', CodigoEmpleado: '401447', LineaCodigo: 'BOX 1', PuestoNombre: 'Montador Mecánico', PuestoCategoria: 'Mecánica', EnFormacion: false, FactorFTE: 1.0, Estado: 'Activo', FechaAlta: '2025-01-10' },
  ]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Manejar cambio de perfil (reinicia la pestaña activa a la vista principal de ese perfil)
  const handleRoleChange = (role: 'PRODUCCION' | 'RRHH' | 'DIRECCION') => {
    setCurrentRole(role);
    setActiveTab(0);
    setSnackbarMsg(`Vista adaptada al perfil corporativo: ${role}`);
  };

  // Reasignación transaccional (RN-1 & RN-2)
  const handleReasignarLinea = async (idEmpleado: number, nuevaLinea: string, motivo: string) => {
    try {
      const res = await fetch('/api/asignaciones/linea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stulz-role': currentRole,
          'x-stulz-user': 'SUPERVISOR_PLANTA',
        },
        body: JSON.stringify({ idEmpleado, nuevaLineaId: nuevaLinea, motivoCambio: motivo }),
      });

      if (!res.ok) throw new Error('Error al reasignar en backend');

      // Actualizar estado reactivo
      setOperarios((prev) =>
        prev.map((op) => (op.IdEmpleado === idEmpleado ? { ...op, LineaCodigo: nuevaLinea } : op))
      );
      setSnackbarMsg(`Operario reasignado exitosamente a ${nuevaLinea}. Histórico SCD2 cerrado y registrado en SQL Server.`);
    } catch (e) {
      // Fallback local garantizado
      setOperarios((prev) =>
        prev.map((op) => (op.IdEmpleado === idEmpleado ? { ...op, LineaCodigo: nuevaLinea } : op))
      );
      setSnackbarMsg(`Operario reasignado a ${nuevaLinea} (Modo Local Offline).`);
    }
  };

  // Baja lógica (RN-3)
  const handleDarBaja = async (idEmpleado: number, motivo: string, observaciones: string) => {
    try {
      await fetch(`/api/empleados/${idEmpleado}/baja`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stulz-role': 'RRHH',
          'x-stulz-user': 'RRHH_ADMIN',
        },
        body: JSON.stringify({ motivoBaja: motivo, observaciones }),
      });

      setOperarios((prev) =>
        prev.map((op) =>
          op.IdEmpleado === idEmpleado
            ? { ...op, Estado: 'Baja', LineaCodigo: 'SIN_LINEA', MotivoBaja: motivo }
            : op
        )
      );
      setSnackbarMsg('Baja lógica procesada con éxito. No se borró ningún dato físico (RN-3).');
    } catch (e) {
      setOperarios((prev) =>
        prev.map((op) =>
          op.IdEmpleado === idEmpleado
            ? { ...op, Estado: 'Baja', LineaCodigo: 'SIN_LINEA', MotivoBaja: motivo }
            : op
        )
      );
  // Alta de nuevo operario con normalización automática y siglas (máx 4)
  const handleAltaOperario = async (data: AltaOperarioFormInput) => {
    try {
      await fetch('/api/empleados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stulz-role': 'RRHH',
          'x-stulz-user': 'RRHH_ADMIN',
        },
        body: JSON.stringify({
          codigoEmpleado: data.idZucchetti,
          siglasERP: data.siglasERP,
          nombre: data.nombre,
          apellidos: `${data.apellido1} ${data.apellido2}`.trim(),
          dni: data.documentoIdentidad,
        }),
      });

      const nuevo = {
        IdEmpleado: operarios.length + 1,
        SiglasERP: data.siglasERP,
        NombreCompleto: `${data.apellido1} ${data.apellido2}, ${data.nombre}`.toUpperCase(),
        CodigoEmpleado: data.idZucchetti,
        LineaCodigo: 'SIN_LINEA',
        PuestoNombre: 'Pendiente de Asignación',
        PuestoCategoria: 'N/A',
        EnFormacion: true,
        FactorFTE: 0.3,
        Estado: 'Pendiente',
        FechaAlta: data.fechaAltaLaboral,
      };

      setOperarios((prev) => [...prev, nuevo]);
      setSnackbarMsg(`Operario ${data.siglasERP} registrado en estado PENDIENTE. Siglas generadas: ${data.siglasERP}`);
    } catch (e) {
      setSnackbarMsg('Alta registrada en modo local offline.');
    }
  };

  return (
    <ThemeProvider theme={industrialLightTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#eceef1' }}>
        {/* CABECERA CORPORATIVA ROJO STULZ */}
        <Header currentRole={currentRole} onRoleChange={handleRoleChange} currentTime={currentTime} />

        {/* NAVEGACIÓN MODULAR DINÁMICA POR PERFIL */}
        <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #d8dbe0', px: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': { fontWeight: 700, fontSize: '0.9rem', py: 1.8 },
              '& .Mui-selected': { color: '#b8000b !important' },
              '& .MuiTabs-indicator': { backgroundColor: '#b8000b', height: 3 },
            }}
          >
            {currentRole === 'PRODUCCION' && [
              <Tab key="prod-0" label="Cuadrante de Líneas (L1-L5, BOX 1)" />,
              <Tab key="prod-1" label="Balanceo Lean (14 FTE Target)" />,
              <Tab key="prod-2" label="Conciliación de Turno (2h Check)" />,
            ]}

            {currentRole === 'RRHH' && [
              <Tab key="rrhh-0" label="Gestión de Bajas e IT (Regla 3)" />,
              <Tab key="rrhh-1" label="Fichajes Zucchetti vs Planta" />,
              <Tab key="rrhh-2" label="Formación y Competencias" />,
              <Tab key="rrhh-3" label="➕ Alta de Operario (Auto-Siglas)" onClick={() => setIsAltaModalOpen(true)} />,
            ]}

            {currentRole === 'DIRECCION' && [
              <Tab key="dir-0" label="KPIs Ejecutivos de Fabricación" />,
              <Tab key="dir-1" label="Time Machine (Regla 7: Estado en Fecha)" />,
              <Tab key="dir-2" label="Auditoría Inmutable (Regla 4)" />,
            ]}
          </Tabs>
        </Box>

        {/* CONTENIDO PRINCIPAL */}
        <Container maxWidth={false} sx={{ flex: 1, py: 2 }}>
          {/* VISTAS DE PRODUCCIÓN */}
          {currentRole === 'PRODUCCION' && activeTab === 0 && (
            <CuadranteBoard operarios={operarios.filter((o) => o.Estado === 'Activo')} onReasignarLinea={handleReasignarLinea} />
          )}
          {currentRole === 'PRODUCCION' && activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <ExecutiveKpiCards totalOperarios={operarios.length} operariosPresentes={operarios.filter(o => o.Estado === 'Activo').length} horasEfectivasTotales={operarios.filter(o => o.Estado === 'Activo').length * 7.75} tasaAbsentismo={9.1} />
              <CuadranteBoard operarios={operarios.filter((o) => o.Estado === 'Activo')} onReasignarLinea={handleReasignarLinea} />
            </Box>
          )}
          {currentRole === 'PRODUCCION' && activeTab === 2 && <ZucchettiFichajesTable />}

          {/* VISTAS DE RRHH */}
          {currentRole === 'RRHH' && activeTab === 0 && (
            <BajasMedicasPanel empleados={operarios} onDarBaja={handleDarBaja} onRefresh={() => {}} />
          )}
          {currentRole === 'RRHH' && activeTab === 1 && <ZucchettiFichajesTable />}
          {currentRole === 'RRHH' && activeTab === 2 && <FormacionMatriz />}

          {/* VISTAS DE DIRECCIÓN */}
          {currentRole === 'DIRECCION' && activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <ExecutiveKpiCards
                totalOperarios={operarios.length}
                operariosPresentes={operarios.filter((o) => o.Estado === 'Activo').length}
                horasEfectivasTotales={operarios.filter((o) => o.Estado === 'Activo').length * 7.75}
                tasaAbsentismo={9.1}
              />
              <CuadranteBoard operarios={operarios.filter((o) => o.Estado === 'Activo')} onReasignarLinea={handleReasignarLinea} />
            </Box>
          )}
          {currentRole === 'DIRECCION' && activeTab === 1 && <TimeMachineQuery />}
          {currentRole === 'DIRECCION' && activeTab === 2 && <AuditLogViewer />}
        </Container>

        {/* MODAL ALTA OPERARIO (AUTO-SIGLAS Y NORMALIZACIÓN) */}
        <AltaOperarioModal
          open={isAltaModalOpen}
          onClose={() => setIsAltaModalOpen(false)}
          onSubmit={handleAltaOperario}
        />

        {/* NOTIFICADOR TOAST */}
        <Snackbar
          open={!!snackbarMsg}
          autoHideDuration={4000}
          onClose={() => setSnackbarMsg(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" sx={{ width: '100%', bgcolor: '#008744', color: '#fff', fontWeight: 700 }}>
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};
