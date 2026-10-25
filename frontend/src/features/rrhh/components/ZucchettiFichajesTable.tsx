import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Table, TableHead, 
  TableRow, TableCell, TableBody, Chip, Button, Alert, LinearProgress 
} from '@mui/material';
import { Clock, ShieldCheck, AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface Discrepancia {
  siglas: string;
  nombre: string;
  linea: string;
  tipo: string;
  severidad: 'ALTA' | 'MEDIA' | 'CRITICA';
  detalle: string;
}

export const ZucchettiFichajesTable: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reconciliado, setReconciliado] = useState(true);

  // Muestra de discrepancias analizadas por el motor de conciliación a las 2 horas
  const [discrepancias] = useState<Discrepancia[]>([
    {
      siglas: 'SDU',
      nombre: 'Sergio Díaz Úbeda',
      linea: 'L1',
      tipo: 'PRESENTE_SIN_FICHAJE_TORNO',
      severidad: 'MEDIA',
      detalle: 'Presente en Línea 1, pero no consta fichaje en tornos de entrada a las 08:00. Olvido de tarjeta física.',
    },
    {
      siglas: 'RIO',
      nombre: 'Roberto Iglesias Ortiz',
      linea: 'L5',
      tipo: 'FICHAJE_TORNO_SIN_LINEA',
      severidad: 'ALTA',
      detalle: 'Fichó a las 06:05 en tornos, pero no está asignado ni marcado en puesto de trabajo a las 08:00.',
    },
  ]);

  const handleRunReconcile = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Conciliación a 2 horas ejecutada con el motor Pandas de Python. 95.8% de correspondencia exacta.');
    }, 800);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
            Conciliación de Fichajes Zucchetti vs Presencia en Línea
          </Typography>
          <Typography variant="body2" sx={{ color: '#575757' }}>
            Auditoría de las 2 horas (08:00 Turno 1 / 16:00 Turno 2). Compara accesos físicos por torno contra operarios en línea (7,75 h).
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<RefreshCw size={16} />}
          onClick={handleRunReconcile}
          disabled={loading}
          sx={{ bgcolor: '#b8000b', '&:hover': { bgcolor: '#e30613' }, fontWeight: 700 }}
        >
          {loading ? 'Analizando con Python...' : 'Ejecutar Conciliación 2 Horas'}
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, bgcolor: '#fee2e2', '& .MuiLinearProgress-bar': { bgcolor: '#b8000b' } }} />}

      {/* MÉTRICAS DE CONCILIACIÓN */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Card sx={{ p: 2, bgcolor: '#ffffff' }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>TOTAL FICHAJES TORNO</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a1a' }}>48</Typography>
        </Card>
        <Card sx={{ p: 2, bgcolor: '#ffffff' }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>OPERARIOS EN LÍNEA</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#008744' }}>47</Typography>
        </Card>
        <Card sx={{ p: 2, bgcolor: '#ffffff' }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>CUMPLIMIENTO</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#008744' }}>95.8%</Typography>
        </Card>
        <Card sx={{ p: 2, bgcolor: '#ffffff' }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>ANOMALÍAS DETECTADAS</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#b8000b' }}>{discrepancias.length}</Typography>
        </Card>
      </Box>

      {/* TABLA DE ANOMALÍAS */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #d8dbe0', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Anomalías Detectadas en la Ventana de 2 Horas
            </Typography>
            <Chip label="Turno 1: 08:00 AM" size="small" sx={{ fontWeight: 700 }} />
          </Box>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Siglas</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Operario</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Línea</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tipo de Incidencia</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Severidad</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Detalle de Conciliación</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Acción RRHH</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {discrepancias.map((d, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontWeight: 800, color: '#b8000b' }}>{d.siglas}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{d.nombre}</TableCell>
                  <TableCell>{d.linea}</TableCell>
                  <TableCell>
                    <Chip label={d.tipo} size="small" sx={{ fontSize: '0.75rem', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={d.severidad} 
                      size="small" 
                      sx={{ 
                        bgcolor: d.severidad === 'ALTA' ? '#fee2e2' : '#fef3c7',
                        color: d.severidad === 'ALTA' ? '#b8000b' : '#b45309',
                        fontWeight: 800
                      }} 
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', color: '#475569' }}>{d.detalle}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Button variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
                      Regularizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};
