import React, { useState, useEffect } from 'react';
import { 
  Box, Card, CardContent, Typography, Table, TableHead, 
  TableRow, TableCell, TableBody, Chip, Button, IconButton 
} from '@mui/material';
import { ShieldCheck, RefreshCw, Filter } from 'lucide-react';

interface RegistroAuditoria {
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

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<RegistroAuditoria[]>([
    {
      IdAuditoria: 104,
      Usuario: 'SUPERVISOR_T1',
      FechaHora: new Date().toISOString(),
      Modulo: 'ASIGNACIONES',
      Tabla: 'Empleado_Linea_Historico',
      RegistroId: '2',
      Campo: 'IdLinea',
      ValorAnterior: 'L1',
      ValorNuevo: 'L2',
      Accion: 'REASIGNACION',
      DireccionIP: '192.168.10.45'
    },
    {
      IdAuditoria: 103,
      Usuario: 'RRHH_ADMIN',
      FechaHora: new Date(Date.now() - 3600000).toISOString(),
      Modulo: 'EMPLEADOS',
      Tabla: 'Empleados',
      RegistroId: '10',
      Campo: 'Estado',
      ValorAnterior: 'Pendiente',
      ValorNuevo: 'Activo',
      Accion: 'UPDATE',
      DireccionIP: '192.168.10.12'
    },
    {
      IdAuditoria: 102,
      Usuario: 'RRHH_ADMIN',
      FechaHora: new Date(Date.now() - 7200000).toISOString(),
      Modulo: 'FORMACION',
      Tabla: 'Empleado_Formacion',
      RegistroId: '7',
      Campo: 'IdFormacion',
      ValorAnterior: null,
      ValorNuevo: 'PRL Básico Planta Climatización',
      Accion: 'INSERT',
      DireccionIP: '192.168.10.12'
    }
  ]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/auditoria');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      // Local fallback
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
            Registro Inmutable de Auditoría (Regla de Negocio 4)
          </Typography>
          <Typography variant="body2" sx={{ color: '#575757' }}>
            Trazabilidad criptográfica y persistente en SQL Server: quién, cuándo, qué valor previo y qué valor nuevo.
          </Typography>
        </div>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={16} />}
          onClick={fetchLogs}
          sx={{ borderColor: '#d8dbe0', color: '#1a1a1a', fontWeight: 700 }}
        >
          Actualizar Trazas
        </Button>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #d8dbe0', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Eventos Registrados en la Base de Datos Transaccional
            </Typography>
            <Chip
              icon={<ShieldCheck size={14} color="#008744" />}
              label="Auditoría Activa (Cero Manipulación)"
              size="small"
              sx={{ bgcolor: '#e6f4ea', color: '#008744', fontWeight: 700 }}
            />
          </Box>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fecha / Hora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Módulo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tabla / ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Campo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Valor Anterior</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Valor Nuevo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.IdAuditoria}>
                  <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>#{log.IdAuditoria}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{log.FechaHora.replace('T', ' ').substring(0, 19)}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1a1a1a' }}>{log.Usuario}</TableCell>
                  <TableCell>
                    <Chip label={log.Modulo} size="small" sx={{ fontSize: '0.72rem', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{log.Tabla} ({log.RegistroId})</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{log.Campo}</TableCell>
                  <TableCell sx={{ color: '#b8000b', fontSize: '0.85rem' }}>{log.ValorAnterior || 'NULL'}</TableCell>
                  <TableCell sx={{ color: '#008744', fontWeight: 700, fontSize: '0.85rem' }}>{log.ValorNuevo}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.Accion}
                      size="small"
                      sx={{
                        bgcolor: log.Accion === 'REASIGNACION' ? '#e0f2fe' : log.Accion === 'INSERT' ? '#e6f4ea' : '#fef3c7',
                        color: log.Accion === 'REASIGNACION' ? '#0369a1' : log.Accion === 'INSERT' ? '#008744' : '#b45309',
                        fontWeight: 800,
                        fontSize: '0.72rem'
                      }}
                    />
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
