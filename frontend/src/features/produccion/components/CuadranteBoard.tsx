import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Chip, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions, Select, MenuItem, 
  FormControl, InputLabel, TextField, Alert 
} from '@mui/material';
import { Users, ArrowRightLeft, CheckCircle2, AlertTriangle, GraduationCap } from 'lucide-react';

interface Operario {
  IdEmpleado: number;
  SiglasERP: string;
  NombreCompleto: string;
  CodigoEmpleado: string;
  LineaCodigo: string;
  PuestoNombre: string;
  PuestoCategoria: string;
  EnFormacion: boolean;
  FactorFTE: number;
}

interface LineaConfig {
  id: string;
  nombre: string;
  targetFte: number;
  minMecanicos: number;
  minElectricos: number;
}

// LÍNEAS OBJETO DE ANÁLISIS: L1..L5 y BOX 1 (BATERÍAS TOTALMENTE EXCLUIDA)
const LINEAS_PLANTILLA: LineaConfig[] = [
  { id: 'L1', nombre: 'Línea 1 - Climatizadores Gemela', targetFte: 14.0, minMecanicos: 10, minElectricos: 4 },
  { id: 'L2', nombre: 'Línea 2 - Climatizadores Gemela', targetFte: 14.0, minMecanicos: 10, minElectricos: 4 },
  { id: 'L3', nombre: 'Línea 3 - Climatizadores Gemela', targetFte: 14.0, minMecanicos: 10, minElectricos: 4 },
  { id: 'L4', nombre: 'Línea 4 - Climatizadores Gemela', targetFte: 14.0, minMecanicos: 10, minElectricos: 4 },
  { id: 'L5', nombre: 'Línea 5 - Climatizadores Gemela', targetFte: 14.0, minMecanicos: 10, minElectricos: 4 },
  { id: 'BOX 1', nombre: 'Box 1 - Especiales / Prototipos', targetFte: 8.0, minMecanicos: 6, minElectricos: 2 },
];

interface CuadranteBoardProps {
  operarios: Operario[];
  onReasignarLinea: (idEmpleado: number, nuevaLinea: string, motivo: string) => Promise<void>;
}

export const CuadranteBoard: React.FC<CuadranteBoardProps> = ({ operarios, onReasignarLinea }) => {
  const [selectedOp, setSelectedOp] = useState<Operario | null>(null);
  const [targetLinea, setTargetLinea] = useState<string>('L1');
  const [motivo, setMotivo] = useState<string>('Rebalanceo Lean Turno 1');
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenReassign = (op: Operario) => {
    setSelectedOp(op);
    setTargetLinea(op.LineaCodigo === 'L1' ? 'L2' : 'L1');
    setOpenModal(true);
  };

  const handleConfirmReassign = async () => {
    if (!selectedOp) return;
    setIsSubmitting(true);
    try {
      await onReasignarLinea(selectedOp.IdEmpleado, targetLinea, motivo);
      setOpenModal(false);
    } catch (err) {
      alert('Error en la reasignación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* CABECERA LEAN & RESUMEN DE LÍNEAS */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
            Cuadrante de Producción — Líneas Gemelas STULZ
          </Typography>
          <Typography variant="body2" sx={{ color: '#575757' }}>
            Supervisión táctica de 6 líneas industriales (L1 a L5, BOX 1). Target Lean: 14 FTE (10 Mec + 4 Elec).
          </Typography>
        </div>
        <Chip
          icon={<CheckCircle2 size={16} color="#008744" />}
          label="Single Source of Truth (SQL Server)"
          sx={{ bgcolor: '#e6f4ea', color: '#008744', fontWeight: 700 }}
        />
      </Box>

      {/* GRID DE LAS 6 LÍNEAS ACTIVAS */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 2.5,
        }}
      >
        {LINEAS_PLANTILLA.map((linea) => {
          const opsInLine = operarios.filter((o) => o.LineaCodigo === linea.id || (linea.id === 'BOX 1' && o.LineaCodigo === 'BOX1'));
          const fteCalculado = opsInLine.reduce((acc, curr) => acc + (curr.EnFormacion ? 0.3 : 1.0), 0);
          const mecanicosCount = opsInLine.filter((o) => o.PuestoCategoria === 'Mecánica').length;
          const electricosCount = opsInLine.filter((o) => o.PuestoCategoria === 'Eléctrica').length;
          const gapFte = +(fteCalculado - linea.targetFte).toFixed(2);
          const isBottleneck = gapFte < -2;

          return (
            <Card
              key={linea.id}
              sx={{
                borderRadius: 2,
                border: isBottleneck ? '2px solid #e30613' : '1px solid #d8dbe0',
                bgcolor: '#ffffff',
                boxShadow: isBottleneck ? '0 4px 12px rgba(227,6,19,0.1)' : '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              {/* HEADER DE LA COLUMNA DE LÍNEA */}
              <Box
                sx={{
                  p: 1.8,
                  bgcolor: isBottleneck ? '#fee2e2' : '#f8fafc',
                  borderBottom: '1px solid #d8dbe0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#b8000b', lineHeight: 1.1 }}>
                    {linea.id}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#575757', fontWeight: 600 }}>
                    {linea.nombre}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: gapFte >= 0 ? '#008744' : '#b8000b' }}>
                    {fteCalculado.toFixed(1)} / {linea.targetFte} FTE
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {mecanicosCount} Mec | {electricosCount} Elec
                  </Typography>
                </Box>
              </Box>

              <CardContent sx={{ p: 2 }}>
                {/* ALERTA DE CUELLO DE BOTELLA */}
                {isBottleneck && (
                  <Alert severity="error" icon={<AlertTriangle size={16} />} sx={{ mb: 1.5, py: 0.5 }}>
                    Déficit crítico ({gapFte} FTE). Requiere refuerzo.
                  </Alert>
                )}

                {/* LISTA DE OPERARIOS ASIGNADOS */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {opsInLine.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                      Sin operarios asignados en este turno
                    </Typography>
                  ) : (
                    opsInLine.map((op) => (
                      <Box
                        key={op.IdEmpleado}
                        sx={{
                          p: 1.2,
                          borderRadius: 1.5,
                          border: '1px solid #e2e8f0',
                          bgcolor: op.EnFormacion ? '#fffbeb' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          '&:hover': { borderColor: '#b8000b', bgcolor: '#fef2f2' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius: 1,
                              bgcolor: op.PuestoCategoria === 'Eléctrica' ? '#e0f2fe' : '#f1f5f9',
                              color: op.PuestoCategoria === 'Eléctrica' ? '#0369a1' : '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                            }}
                          >
                            {op.SiglasERP}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.1 }}>
                              {op.NombreCompleto}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {op.PuestoNombre}
                              {op.EnFormacion && (
                                <Chip
                                  icon={<GraduationCap size={12} />}
                                  label="Formación (0.3 FTE)"
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#fde68a', color: '#92400e' }}
                                />
                              )}
                            </Typography>
                          </Box>
                        </Box>

                        {/* BOTÓN REASIGNAR (RN-1 & RN-2) */}
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenReassign(op)}
                          sx={{
                            minWidth: 32,
                            p: 0.8,
                            borderColor: '#cbd5e1',
                            color: '#475569',
                            '&:hover': { bgcolor: '#b8000b', color: '#fff', borderColor: '#b8000b' },
                          }}
                          title="Reasignar a otra línea (SCD2)"
                        >
                          <ArrowRightLeft size={14} />
                        </Button>
                      </Box>
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* DIÁLOGO MODAL DE REASIGNACIÓN TRANSACCIONAL (RN-1 & RN-2) */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#b8000b', color: '#ffffff', fontWeight: 700 }}>
          Reasignación Atómica de Línea (SCD Tipo 2)
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedOp && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <Alert severity="info" sx={{ bgcolor: '#f0f9ff', color: '#0369a1' }}>
                El movimiento cerrará la asignación activa previa en el histórico con marca de tiempo y abrirá la nueva asignación garantizando la Regla de Negocio 1 (Máximo 1 línea activa simultáneamente).
              </Alert>

              <Box>
                <Typography variant="caption" sx={{ color: '#64748b' }}>OPERARIO A REASIGNAR:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
                  {selectedOp.NombreCompleto} ({selectedOp.SiglasERP}) — Línea Actual: {selectedOp.LineaCodigo}
                </Typography>
              </Box>

              <FormControl fullWidth>
                <InputLabel id="linea-select-label">Nueva Línea Destino</InputLabel>
                <Select
                  labelId="linea-select-label"
                  value={targetLinea}
                  label="Nueva Línea Destino"
                  onChange={(e) => setTargetLinea(e.target.value)}
                >
                  {LINEAS_PLANTILLA.filter(l => l.id !== selectedOp.LineaCodigo).map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.id} — {l.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Motivo del Cambio (Trazabilidad Auditoría)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setOpenModal(false)} sx={{ color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmReassign}
            disabled={isSubmitting}
            sx={{ bgcolor: '#b8000b', '&:hover': { bgcolor: '#e30613' }, fontWeight: 700 }}
          >
            {isSubmitting ? 'Persistiendo en SQL Server...' : 'Confirmar Reasignación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
