import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Table, TableHead, 
  TableRow, TableCell, TableBody, Chip, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, 
  Select, MenuItem, FormControl, InputLabel, Alert 
} from '@mui/material';
import { UserMinus, ShieldAlert, HeartPulse, RefreshCw } from 'lucide-react';

interface Empleado {
  IdEmpleado: number;
  SiglasERP: string;
  NombreCompleto: string;
  CodigoEmpleado: string;
  Estado: string;
  LineaCodigo: string;
  PuestoNombre: string;
  FechaAlta: string;
  FechaBaja?: string;
  MotivoBaja?: string;
}

interface BajasMedicasPanelProps {
  empleados: Empleado[];
  onDarBaja: (idEmpleado: number, motivo: string, observaciones: string) => Promise<void>;
  onRefresh: () => void;
}

export const BajasMedicasPanel: React.FC<BajasMedicasPanelProps> = ({ empleados, onDarBaja, onRefresh }) => {
  const [openModal, setOpenModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [motivo, setMotivo] = useState<string>('Baja Médica IT (Incapacidad Temporal)');
  const [observaciones, setObservaciones] = useState<string>('Comunicado parte facultativo a RRHH.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activos = empleados.filter(e => e.Estado === 'Activo');
  const enBaja = empleados.filter(e => e.Estado === 'Baja' || e.Estado === 'BajaMedica_IT');

  const handleConfirmBaja = async () => {
    if (!selectedEmpId) return;
    setIsSubmitting(true);
    try {
      await onDarBaja(Number(selectedEmpId), motivo, observaciones);
      setOpenModal(false);
      setSelectedEmpId('');
      onRefresh();
    } catch (e) {
      alert('Error al registrar la baja');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
            Gestión de Bajas y Salidas (Regla de Negocio 3)
          </Typography>
          <Typography variant="body2" sx={{ color: '#575757' }}>
            Prohibido el borrado físico de la base de datos. Toda baja es lógica, cierra asignaciones y mantiene histórico completo.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<UserMinus size={18} />}
          onClick={() => setOpenModal(true)}
          sx={{ bgcolor: '#b8000b', '&:hover': { bgcolor: '#e30613' }, fontWeight: 700 }}
        >
          Tramitar Nueva Baja
        </Button>
      </Box>

      {/* TARJETA RESUMEN */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        <Card sx={{ p: 2, borderLeft: '4px solid #008744' }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>PLANTILLA ACTIVA</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#008744' }}>{activos.length}</Typography>
        </Card>
        <Card sx={{ p: 2, borderLeft: '4px solid #d97706' }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>BAJAS MÉDICAS IT / PERMISOS</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#d97706' }}>{enBaja.length}</Typography>
        </Card>
        <Card sx={{ p: 2, borderLeft: '4px solid #b8000b' }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>TRAZABILIDAD AUDITORÍA</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#b8000b', mt: 1 }}>100% REGISTRADO</Typography>
        </Card>
      </Box>

      {/* TABLA DE EMPLEADOS EN BAJA */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #d8dbe0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Histórico de Bajas Registradas (Sin Borrado Físico)
            </Typography>
          </Box>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Siglas / Código</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nombre Completo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Última Línea</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Puesto</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Motivo de la Baja</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fecha Baja</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enBaja.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                    No constan empleados en situación de baja actualmente.
                  </TableCell>
                </TableRow>
              ) : (
                enBaja.map((emp) => (
                  <TableRow key={emp.IdEmpleado}>
                    <TableCell sx={{ fontWeight: 700 }}>{emp.SiglasERP} ({emp.CodigoEmpleado})</TableCell>
                    <TableCell>{emp.NombreCompleto}</TableCell>
                    <TableCell>{emp.LineaCodigo}</TableCell>
                    <TableCell>{emp.PuestoNombre}</TableCell>
                    <TableCell>
                      <Chip label={emp.Estado} size="small" sx={{ bgcolor: '#fee2e2', color: '#b8000b', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>{emp.MotivoBaja || 'Incapacidad Temporal'}</TableCell>
                    <TableCell>{emp.FechaBaja || 'Reciente'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIÁLOGO MODAL DE BAJA LÓGICA */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#b8000b', color: '#ffffff', fontWeight: 700 }}>
          Tramitación de Baja Lógica (RN-3)
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Alert severity="warning" icon={<ShieldAlert size={18} />}>
              Atención: La baja desasociará al empleado de su línea actual, pero mantendrá de forma permanente todo su historial de formación, puestos y horas en SQL Server.
            </Alert>

            <FormControl fullWidth>
              <InputLabel id="emp-select-label">Seleccionar Operario Activo</InputLabel>
              <Select
                labelId="emp-select-label"
                value={selectedEmpId}
                label="Seleccionar Operario Activo"
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
              >
                {activos.map((a) => (
                  <MenuItem key={a.IdEmpleado} value={a.IdEmpleado}>
                    {a.SiglasERP} — {a.NombreCompleto} (Línea {a.LineaCodigo})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="motivo-select-label">Motivo de la Baja</InputLabel>
              <Select
                labelId="motivo-select-label"
                value={motivo}
                label="Motivo de la Baja"
                onChange={(e) => setMotivo(e.target.value)}
              >
                <MenuItem value="Baja Médica IT (Incapacidad Temporal)">Baja Médica IT (Incapacidad Temporal)</MenuItem>
                <MenuItem value="Accidente Laboral">Accidente Laboral</MenuItem>
                <MenuItem value="Permiso Retribuido / Asuntos Propios">Permiso Retribuido / Asuntos Propios</MenuItem>
                <MenuItem value="Fin de Contrato Temporal">Fin de Contrato Temporal</MenuItem>
                <MenuItem value="Baja Voluntaria">Baja Voluntaria</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Observaciones y Trazabilidad (RRHH)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleConfirmBaja}
            disabled={isSubmitting || !selectedEmpId}
            sx={{ bgcolor: '#b8000b', '&:hover': { bgcolor: '#e30613' }, fontWeight: 700 }}
          >
            {isSubmitting ? 'Procesando en SQL Server...' : 'Confirmar Baja Lógica'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
