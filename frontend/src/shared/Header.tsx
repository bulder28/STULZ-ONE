import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, ButtonGroup, Button } from '@mui/material';
import { Shield, Clock, Factory, Users, BarChart3, Monitor } from 'lucide-react';

interface HeaderProps {
  currentRole: 'PRODUCCION' | 'RRHH' | 'DIRECCION';
  onRoleChange: (role: 'PRODUCCION' | 'RRHH' | 'DIRECCION') => void;
  currentTime: string;
}

export const Header: React.FC<HeaderProps> = ({ currentRole, onRoleChange, currentTime }) => {
  return (
    <AppBar position="sticky" sx={{ height: 64, justifyContent: 'center' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 3 }}>
        {/* LOGO & BRAND */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              bgcolor: '#ffffff',
              color: '#b8000b',
              fontWeight: 900,
              fontSize: '1.25rem',
              letterSpacing: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            STULZ
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1, color: '#ffffff', fontSize: '1.05rem' }}>
              SGP-F | Gestión de Personal de Fabricación
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}>
              STULZ España — Planta Coslada (Single Source of Truth)
            </Typography>
          </Box>
        </Box>

        {/* SELECTOR DE PERFIL CORPORATIVO (RBAC) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            PERFIL ACTIVO:
          </Typography>
          <ButtonGroup variant="contained" size="small" sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 0.5, borderRadius: 1.5 }}>
            <Button
              onClick={() => onRoleChange('PRODUCCION')}
              sx={{
                bgcolor: currentRole === 'PRODUCCION' ? '#ffffff !important' : 'transparent',
                color: currentRole === 'PRODUCCION' ? '#b8000b !important' : '#ffffff',
                fontWeight: 700,
                px: 1.8,
              }}
              startIcon={<Factory size={16} />}
            >
              PRODUCCIÓN
            </Button>
            <Button
              onClick={() => onRoleChange('RRHH')}
              sx={{
                bgcolor: currentRole === 'RRHH' ? '#ffffff !important' : 'transparent',
                color: currentRole === 'RRHH' ? '#b8000b !important' : '#ffffff',
                fontWeight: 700,
                px: 1.8,
              }}
              startIcon={<Users size={16} />}
            >
              RRHH
            </Button>
            <Button
              onClick={() => onRoleChange('DIRECCION')}
              sx={{
                bgcolor: currentRole === 'DIRECCION' ? '#ffffff !important' : 'transparent',
                color: currentRole === 'DIRECCION' ? '#b8000b !important' : '#ffffff',
                fontWeight: 700,
                px: 1.8,
              }}
              startIcon={<BarChart3 size={16} />}
            >
              DIRECCIÓN
            </Button>
          </ButtonGroup>
        </Box>

        {/* INDICADORES DE TURNO, AIR-GAP Y ENLACE KIOSCO VUE */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<Shield size={14} color="#00ff66" />}
            label="AIR-GAP SEGURO"
            size="small"
            sx={{ bgcolor: 'rgba(0,0,0,0.25)', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem' }}
          />

          <Chip
            icon={<Clock size={14} color="#ffffff" />}
            label={`T1 | ${currentTime}`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 700, fontSize: '0.78rem' }}
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={<Monitor size={15} />}
            href="http://127.0.0.1:5174"
            target="_blank"
            sx={{
              borderColor: 'rgba(255,255,255,0.5)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.75rem',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: '#ffffff' },
            }}
          >
            KIOSCO TÁCTIL (VUE)
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
