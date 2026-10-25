import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button, 
  Table, TableHead, TableRow, TableCell, TableBody, Chip, 
  Alert, LinearProgress 
} from '@mui/material';
import { Calendar, Search, History, Clock } from 'lucide-react';

interface ResultadoHistorico {
  idEmpleado: number;
  siglasERP: string;
  operario: string;
  lineaEnFecha: string;
  lineaNombreEnFecha: string;
  puestoEnFecha: string;
  fechaInicioAsignacion: string | null;
  fechaFinAsignacion: string | null;
  motivoCambio: string;
}

export const TimeMachineQuery: React.FC = () => {
  const [fechaConsulta, setFechaConsulta] = useState('2026-04-15');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoHistorico[]>([
    {
      idEmpleado: 2,
      siglasERP: 'EJAY',
      operario: 'JIMÉNEZ AYALA, EDUARDO',
      lineaEnFecha: 'L1',
      lineaNombreEnFecha: 'Línea 1 - Climatizadores Gemela',
      puestoEnFecha: 'Montador Eléctrico',
      fechaInicioAsignacion: '2026-01-01T06:00:00Z',
      fechaFinAsignacion: null,
      motivoCambio: 'Asignación Inicial de Cuadrante'
    },
    {
      idEmpleado: 3,
      siglasERP: 'SDU',
      operario: 'DÍAZ ÚBEDA, SERGIO',
      lineaEnFecha: 'L1',
      lineaNombreEnFecha: 'Línea 1 - Climatizadores Gemela',
      puestoEnFecha: 'Montador Mecánico',
      fechaInicioAsignacion: '2026-01-01T06:00:00Z',
      fechaFinAsignacion: null,
      motivoCambio: 'Asignación Inicial de Cuadrante'
    },
    {
      idEmpleado: 7,
      siglasERP: 'MSP',
      operario: 'SÁNCHEZ PRIETO, MANUEL',
      lineaEnFecha: 'L3',
      lineaNombreEnFecha: 'Línea 3 - Climatizadores Gemela',
      puestoEnFecha: 'Montador Mecánico (Formación)',
      fechaInicioAsignacion: '2026-02-01T06:00:00Z',
      fechaFinAsignacion: null,
      motivoCambio: 'Ingreso en Formación'
    }
  ]);

  const handleConsultar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historico/estado-en-fecha?fecha=${fechaConsulta}`);
      if (res.ok) {
        const data = await res.json();
        setResultados(data.resultados || []);
      }
    } catch (e) {
      console.log('Modo local de simulación histórica');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
          Trazabilidad Temporal Exacta — Time Machine (Regla de Negocio 7)
        </Typography>
        <Typography variant="body2" sx={{ color: '#575757' }}>
          Consulte la situación exacta de cualquier operario o línea en cualquier fecha pasada o futura mediante el histórico SCD Tipo 2 de SQL Server.
        </Typography>
      </Box>

      {/* BARRA DE CONSULTA TEMPORAL */}
      <Card sx={{ p: 2.5, mb: 3, bgcolor: '#ffffff', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Fecha Histórica de Consulta"
            type="date"
            value={fechaConsulta}
            onChange={(e) => setFechaConsulta(e.target.value)}
            sx={{ width: 260 }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={<Search size={18} />}
            onClick={handleConsultar}
            disabled={loading}
            sx={{ bgcolor: '#b8000b', '&:hover': { bgcolor: '#e30613' }, fontWeight: 700, height: 54 }}
          >
            {loading ? 'Consultando SQL Server...' : 'Consultar Estado en Fecha'}
          </Button>

          <Alert severity="info" icon={<History size={18} />} sx={{ ml: 'auto', py: 0.5 }}>
            Ejemplo de la Regla 7: <strong>¿En qué línea estaba el empleado el 15/04/2026?</strong>
          </Alert>
        </Box>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, bgcolor: '#fee2e2', '& .MuiLinearProgress-bar': { bgcolor: '#b8000b' } }} />}

      {/* TABLA DE RESULTADOS DE LA FOTO HISTÓRICA */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #d8dbe0', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Foto Fidedigna de Asignaciones en Fecha: <strong>{fechaConsulta}</strong>
            </Typography>
            <Chip label={`${resultados.length} registros recuperados`} size="small" sx={{ fontWeight: 700 }} />
          </Box>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Siglas</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Operario</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Línea en Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Puesto en Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Inicio Asignación</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fin Asignación</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Motivo de la Asignación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resultados.map((r, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontWeight: 800, color: '#b8000b' }}>{r.siglasERP}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.operario}</TableCell>
                  <TableCell>
                    <Chip label={r.lineaEnFecha} size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>{r.puestoEnFecha}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{r.fechaInicioAsignacion?.split('T')[0] || '2026-01-01'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    {r.fechaFinAsignacion ? r.fechaFinAsignacion.split('T')[0] : <Chip label="Vigente" size="small" sx={{ bgcolor: '#e6f4ea', color: '#008744', fontSize: '0.7rem' }} />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', color: '#575757' }}>{r.motivoCambio}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};
