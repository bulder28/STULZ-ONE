import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Table, TableHead, 
  TableRow, TableCell, TableBody, Chip, Button, Tabs, Tab, 
  LinearProgress, Alert 
} from '@mui/material';
import { Award, AlertTriangle, ShieldCheck, GraduationCap, CheckCircle } from 'lucide-react';

interface AlertaFormacion {
  siglas: string;
  operario: string;
  linea: string;
  curso: string;
  tipo: string;
  fechaCaducidad: string;
  diasHastaCaducidad: number;
  estadoSemaforo: string;
}

export const FormacionMatriz: React.FC = () => {
  const [tab, setTab] = useState(0);

  const [alertas] = useState<AlertaFormacion[]>([
    {
      siglas: 'EJAY',
      operario: 'Eduardo Jiménez Ayala',
      linea: 'L1',
      curso: 'Riesgo Eléctrico RD 614/2001 (Baja Tensión)',
      tipo: 'Seguridad',
      fechaCaducidad: '2026-05-10',
      diasHastaCaducidad: 16,
      estadoSemaforo: 'URGENTE (<30d)'
    },
    {
      siglas: 'SDU',
      operario: 'Sergio Díaz Úbeda',
      linea: 'L1',
      curso: 'Operador Puente Grúa 10T',
      tipo: 'Seguridad',
      fechaCaducidad: '2025-10-01',
      diasHastaCaducidad: -205,
      estadoSemaforo: 'CADUCADO'
    },
    {
      siglas: 'MSP',
      operario: 'Manuel Sánchez Prieto',
      linea: 'L3',
      curso: 'PRL Básico Planta Climatización',
      tipo: 'Legal',
      fechaCaducidad: '2028-02-01',
      diasHastaCaducidad: 647,
      estadoSemaforo: 'Vigente'
    }
  ]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
          Gestión de Formación y Matriz de Competencias
        </Typography>
        <Typography variant="body2" sx={{ color: '#575757' }}>
          Monitoreo de vigencia legal (PRL, Puente Grúa, Riesgo Eléctrico) y niveles de polivalencia (1 a 4).
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 3 }}>
        <Tab label="Alertas de Caducidad de Certificados" sx={{ fontWeight: 700 }} />
        <Tab label="Catálogo de Formaciones Homologadas" sx={{ fontWeight: 700 }} />
        <Tab label="Matriz de Polivalencia (Niveles 1-4)" sx={{ fontWeight: 700 }} />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #d8dbe0', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Semáforo de Caducidad de Formaciones Legales y de Seguridad
              </Typography>
              <Chip label="Radar Activo" size="small" sx={{ bgcolor: '#fee2e2', color: '#b8000b', fontWeight: 700 }} />
            </Box>
            <Table>
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Siglas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Operario</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Línea Actual</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Curso / Homologación</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha Caducidad</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alertas.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 800, color: '#b8000b' }}>{a.siglas}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{a.operario}</TableCell>
                    <TableCell>{a.linea}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{a.curso}</TableCell>
                    <TableCell>
                      <Chip label={a.tipo} size="small" />
                    </TableCell>
                    <TableCell>{a.fechaCaducidad}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.estadoSemaforo}
                        size="small"
                        sx={{
                          bgcolor: a.estadoSemaforo === 'CADUCADO' ? '#fee2e2' : a.estadoSemaforo.includes('URGENTE') ? '#fef3c7' : '#e6f4ea',
                          color: a.estadoSemaforo === 'CADUCADO' ? '#b8000b' : a.estadoSemaforo.includes('URGENTE') ? '#b45309' : '#008744',
                          fontWeight: 800
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Renovar Curso
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Catálogo Oficial STULZ de Cursos Bloqueantes por Puesto
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <Box sx={{ p: 2, border: '1px solid #d8dbe0', borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#b8000b' }}>
                FORM_PRL: PRL Básico Planta Climatización
              </Typography>
              <Typography variant="body2" sx={{ color: '#575757', mt: 0.5 }}>
                Obligatorio para el 100% de la plantilla de fábrica. Validez: 36 meses. Bloqueante para el paso a estado Activo.
              </Typography>
            </Box>
            <Box sx={{ p: 2, border: '1px solid #d8dbe0', borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#b8000b' }}>
                FORM_ELEC_BT: Riesgo Eléctrico RD 614/2001
              </Typography>
              <Typography variant="body2" sx={{ color: '#575757', mt: 0.5 }}>
                Requisito estricto para Montadores Eléctricos. Validez: 24 meses. Habilita para cableado de cuadros y pruebas en tensión.
              </Typography>
            </Box>
            <Box sx={{ p: 2, border: '1px solid #d8dbe0', borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#b8000b' }}>
                FORM_GRUA: Operador Puente Grúa 10T
              </Typography>
              <Typography variant="body2" sx={{ color: '#575757', mt: 0.5 }}>
                Requerido para movimiento de bastidores de climatizadores y ventiladores EC. Validez: 24 meses.
              </Typography>
            </Box>
            <Box sx={{ p: 2, border: '1px solid #d8dbe0', borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#b8000b' }}>
                FORM_CARRET: Carretillas Elevadoras UNE 58451
              </Typography>
              <Typography variant="body2" sx={{ color: '#575757', mt: 0.5 }}>
                Obligatorio para operarios de logística y suministro a cabecera de línea. Validez: 36 meses.
              </Typography>
            </Box>
          </Box>
        </Card>
      )}

      {tab === 2 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Matriz de Competencias y Niveles de Polivalencia
          </Typography>
          <Typography variant="body2" sx={{ color: '#575757', mb: 3 }}>
            Escala estándar: Nivel 1 (Novato con tutor) | Nivel 2 (Autónomo) | Nivel 3 (Avanzado) | Nivel 4 (Experto / Formador)
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>NIVEL 1: NOVATO (0.3 FTE)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#d97706', my: 1 }}>1 Operario</Typography>
              <Typography variant="caption" sx={{ color: '#475569' }}>Requiere acompañamiento de un formador en línea.</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>NIVEL 2: AUTÓNOMO (1.0 FTE)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0284c7', my: 1 }}>6 Operarios</Typography>
              <Typography variant="caption" sx={{ color: '#475569' }}>Ejecución estándar del puesto sin supervisión continua.</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>NIVEL 3: AVANZADO (1.0 FTE)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#008744', my: 1 }}>2 Operarios</Typography>
              <Typography variant="caption" sx={{ color: '#475569' }}>Capaz de resolver desviaciones y ajustes mecánicos complejos.</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>NIVEL 4: EXPERTO / FORMADOR</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#b8000b', my: 1 }}>2 Operarios</Typography>
              <Typography variant="caption" sx={{ color: '#475569' }}>Homologado para tutorizar a nuevos operarios en planta.</Typography>
            </Box>
          </Box>
        </Card>
      )}
    </Box>
  );
};
