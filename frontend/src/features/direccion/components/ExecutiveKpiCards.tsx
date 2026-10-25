import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import { Users, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ExecutiveKpiCardsProps {
  totalOperarios: number;
  operariosPresentes: number;
  horasEfectivasTotales: number;
  tasaAbsentismo: number;
}

export const ExecutiveKpiCards: React.FC<ExecutiveKpiCardsProps> = ({
  totalOperarios,
  operariosPresentes,
  horasEfectivasTotales,
  tasaAbsentismo,
}) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
      <Card sx={{ p: 2.5, bgcolor: '#ffffff', borderRadius: 2, borderLeft: '5px solid #00466e' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Ocupación de Planta
          </Typography>
          <Users size={20} color="#00466e" />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a1a', my: 1 }}>
          {operariosPresentes} / {totalOperarios}
        </Typography>
        <Typography variant="caption" sx={{ color: '#008744', fontWeight: 700 }}>
          {((operariosPresentes / (totalOperarios || 1)) * 100).toFixed(1)}% de presencia efectiva
        </Typography>
      </Card>

      <Card sx={{ p: 2.5, bgcolor: '#ffffff', borderRadius: 2, borderLeft: '5px solid #008744' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Horas Imputadas (7,75 h)
          </Typography>
          <Clock size={20} color="#008744" />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#008744', my: 1 }}>
          {horasEfectivasTotales.toFixed(1)} h
        </Typography>
        <Typography variant="caption" sx={{ color: '#575757' }}>
          Turno 1 en curso | Base SQL Server
        </Typography>
      </Card>

      <Card sx={{ p: 2.5, bgcolor: '#ffffff', borderRadius: 2, borderLeft: '5px solid #d97706' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Tasa de Absentismo
          </Typography>
          <AlertTriangle size={20} color="#d97706" />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#d97706', my: 1 }}>
          {tasaAbsentismo.toFixed(1)}%
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          1 Baja médica IT notificada
        </Typography>
      </Card>

      <Card sx={{ p: 2.5, bgcolor: '#ffffff', borderRadius: 2, borderLeft: '5px solid #b8000b' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Líneas Operativas
          </Typography>
          <CheckCircle2 size={20} color="#b8000b" />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#b8000b', my: 1 }}>
          6 / 6
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          L1 a L5 Gemelas + BOX 1 (Sin Baterías)
        </Typography>
      </Card>
    </Box>
  );
};
