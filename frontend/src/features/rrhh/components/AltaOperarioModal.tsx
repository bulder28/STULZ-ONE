import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

export interface AltaOperarioFormInput {
  nombre: string;
  apellido1: string;
  apellido2: string;
  siglasERP: string;
  idZucchetti: string;
  documentoIdentidad: string;
  tipoIncorporacion: 'EMPRESA' | 'ETT' | 'ESCUELA';
  fechaAltaLaboral: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AltaOperarioFormInput) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Normaliza cualquier texto a MAYÚSCULAS y SIN ACENTOS
 */
export function normalizarTexto(str: string): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diéresis
    .replace(/Ñ/g, 'N')              // Estandarización ERP STULZ
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PARTICULAS_A_OMITIR = new Set([
  'DE', 'LA', 'LAS', 'DEL', 'LOS', 'Y', 'E', 'SAN', 'SANTA', 'DA', 'DO', 'DOS', 'DAS', 'VON', 'VAN', 'DI'
]);

/**
 * Generador automático de Siglas ERP STULZ:
 * - Máximo 4 siglas.
 * - Omite partículas como "DE LA", "DEL", "Y", etc.
 * - Ejemplos:
 *   * JUAN ANTONIO VEGA SANCHEZ -> JAVS (4 letras)
 *   * ALBERTO DE LA ROSA MORENO -> ARM (omite "DE LA")
 *   * CARLOS GOMEZ NAVARRO -> CGN (3 letras)
 */
export function generarSiglasAutomaticas(nombre: string, ap1: string, ap2: string = ''): string {
  const normNombre = normalizarTexto(nombre);
  const normAp1 = normalizarTexto(ap1);
  const normAp2 = normalizarTexto(ap2);

  const frase = `${normNombre} ${normAp1} ${normAp2}`.trim();
  if (!frase) return '';

  const palabras = frase.split(' ').filter((p) => p.length > 0);
  const significativas = palabras.filter((p) => !PARTICULAS_A_OMITIR.has(p));

  if (significativas.length === 0) return 'STLZ';

  let siglas = '';
  if (significativas.length >= 4) {
    // Ej: JUAN ANTONIO VEGA SANCHEZ -> JAVS
    siglas = significativas.slice(0, 4).map((p) => p[0]).join('');
  } else if (significativas.length === 3) {
    // Ej: ALBERTO DE LA ROSA MORENO (omite DE LA) -> ARM
    // Ej: CARLOS GOMEZ NAVARRO -> CGN
    siglas = significativas.map((p) => p[0]).join('');
  } else if (significativas.length === 2) {
    // Ej: DAVID FERNANDEZ -> DFE
    siglas = significativas[0][0] + significativas[1].slice(0, 2);
  } else {
    siglas = significativas[0].slice(0, 4);
  }

  return siglas.slice(0, 4).toUpperCase();
}

export const AltaOperarioModal: React.FC<Props> = ({ open, onClose, onSubmit, isLoading }) => {
  const { control, handleSubmit, reset, watch, setValue } = useForm<AltaOperarioFormInput>({
    defaultValues: {
      nombre: '',
      apellido1: '',
      apellido2: '',
      siglasERP: '',
      idZucchetti: '',
      documentoIdentidad: '',
      tipoIncorporacion: 'EMPRESA',
      fechaAltaLaboral: new Date().toISOString().split('T')[0],
    },
  });

  const watchNombre = watch('nombre');
  const watchAp1 = watch('apellido1');
  const watchAp2 = watch('apellido2');

  // Auto-cálculo reactivo de siglas ERP
  useEffect(() => {
    const autoSiglas = generarSiglasAutomaticas(watchNombre, watchAp1, watchAp2);
    setValue('siglasERP', autoSiglas);
  }, [watchNombre, watchAp1, watchAp2, setValue]);

  const handleFormSubmit = async (data: AltaOperarioFormInput) => {
    // Garantizar normalización estricta antes de enviar
    const normalizedData: AltaOperarioFormInput = {
      ...data,
      nombre: normalizarTexto(data.nombre),
      apellido1: normalizarTexto(data.apellido1),
      apellido2: normalizarTexto(data.apellido2),
      siglasERP: normalizarTexto(data.siglasERP).slice(0, 4),
      documentoIdentidad: normalizarTexto(data.documentoIdentidad),
    };
    await onSubmit(normalizedData);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, bgcolor: '#b8000b', color: '#ffffff', pb: 1.5 }}>
        ➕ Alta Administrativa de Operario (Rol RRHH)
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3, bgcolor: '#f0f9ff', color: '#0369a1' }}>
          <strong>Normalización Industrial y Auto-Siglas (Máx 4 letras):</strong> Los nombres y apellidos se convierten
          automáticamente a <strong>MAYÚSCULAS Y SIN ACENTOS</strong>. Las siglas ERP se calculan automáticamente
          omitiendo partículas compuestas (ej. <em>JUAN ANTONIO VEGA SANCHEZ</em> ➔ <strong>JAVS</strong>;{' '}
          <em>ALBERTO DE LA ROSA MORENO</em> ➔ <strong>ARM</strong> omitiendo «DE LA»).
        </Alert>

        <form id="form-alta-operario" onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={4}>
              <Controller
                name="nombre"
                control={control}
                rules={{ required: 'Obligatorio' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nombre"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    placeholder="Ej: JUAN ANTONIO"
                    onChange={(e) => field.onChange(normalizarTexto(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="apellido1"
                control={control}
                rules={{ required: 'Obligatorio' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Primer Apellido"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    placeholder="Ej: DE LA ROSA o VEGA"
                    onChange={(e) => field.onChange(normalizarTexto(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="apellido2"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Segundo Apellido"
                    fullWidth
                    placeholder="Ej: MORENO o SANCHEZ"
                    onChange={(e) => field.onChange(normalizarTexto(e.target.value))}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="documentoIdentidad"
                control={control}
                rules={{ required: 'Obligatorio' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="DNI / NIE"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    onChange={(e) => field.onChange(normalizarTexto(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="siglasERP"
                control={control}
                rules={{ required: 'Obligatorio' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Siglas ERP (Asignación Automática Máx 4)"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    InputProps={{ readOnly: true }}
                    sx={{
                      bgcolor: '#f8fafc',
                      '& input': { fontWeight: 800, color: '#b8000b', letterSpacing: 2 },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="idZucchetti"
                control={control}
                rules={{ required: 'Obligatorio' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Código Reloj Zucchetti"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    placeholder="Ej: 401580"
                    onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="tipoIncorporacion"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Origen de Incorporación (Inmutable)" fullWidth>
                    <MenuItem value="EMPRESA">Contratación Directa STULZ EMPRESA</MenuItem>
                    <MenuItem value="ETT">ETT (Trabajo Temporal)</MenuItem>
                    <MenuItem value="ESCUELA">ESCUELA / Convenio FP Dual</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="fechaAltaLaboral"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Fecha de Alta Contractual"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </form>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #d8dbe0' }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Segregación RN-003:</strong> Al guardar, el empleado se registra en estado{' '}
            <strong>PENDIENTE</strong> en SQL Server. La asignación de línea (L1–L5, BOX 1) y puesto corresponde a
            Producción.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="form-alta-operario"
          variant="contained"
          disabled={isLoading}
          sx={{ bgcolor: '#b8000b', '&:hover': { bgcolor: '#e30613' }, fontWeight: 700 }}
        >
          Guardar Alta Normalizada en SQL Server
        </Button>
      </DialogActions>
    </Dialog>
  );
};
