import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export type EstadoOperarioType =
  | 'PENDIENTE_ASIGNACION'
  | 'FORMACION'
  | 'ASIGNADO'
  | 'ACTIVO'
  | 'BAJA';

interface Props {
  estado: EstadoOperarioType;
}

export const StatusBadge: React.FC<Props> = ({ estado }) => {
  let colorConfig: {
    label: string;
    bg: string;
    text: string;
    border: string;
  };

  switch (estado) {
    case 'PENDIENTE_ASIGNACION':
      colorConfig = {
        label: 'PENDIENTE ASIGNACIÓN',
        bg: 'rgba(245, 158, 11, 0.12)',
        text: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)',
      };
      break;
    case 'FORMACION':
      colorConfig = {
        label: 'EN FORMACIÓN',
        bg: 'rgba(139, 92, 246, 0.12)',
        text: '#a78bfa',
        border: 'rgba(139, 92, 246, 0.3)',
      };
      break;
    case 'ASIGNADO':
      colorConfig = {
        label: 'ASIGNADO (PRE-ACTIVO)',
        bg: 'rgba(59, 130, 246, 0.12)',
        text: '#60a5fa',
        border: 'rgba(59, 130, 246, 0.3)',
      };
      break;
    case 'ACTIVO':
      colorConfig = {
        label: 'ACTIVO EN PLANTA',
        bg: 'rgba(16, 185, 129, 0.12)',
        text: '#10b981',
        border: 'rgba(16, 185, 129, 0.3)',
      };
      break;
    case 'BAJA':
      colorConfig = {
        label: 'BAJA LÓGICA',
        bg: 'rgba(239, 68, 68, 0.12)',
        text: '#f87171',
        border: 'rgba(239, 68, 68, 0.3)',
      };
      break;
    default:
      colorConfig = {
        label: estado,
        bg: '#1e293b',
        text: '#94a3b8',
        border: '#334155',
      };
  }

  return (
    <Chip
      size="small"
      label={colorConfig.label}
      sx={{
        backgroundColor: colorConfig.bg,
        color: colorConfig.text,
        border: `1px solid ${colorConfig.border}`,
        fontWeight: 700,
        fontSize: '0.72rem',
        letterSpacing: '0.03em',
        borderRadius: '6px',
      }}
    />
  );
};
