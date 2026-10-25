import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  TextField,
  MenuItem,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useForm, Controller } from 'react-hook-form';

export interface AsignarPuestoFormInput {
  idOperario: number;
  idCentro: number;
  idLinea: number;
  idTurno: number;
  especialidad: 'MECANICO' | 'ELECTRICO' | 'POLIVALENTE';
  idResponsable: number;
  motivo: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  operarioNombre: string;
  codigoOperario: string;
  onSubmit: (data: AsignarPuestoFormInput) => Promise<void>;
}

export const AsignarPuestoDrawer: React.FC<Props> = ({
  open,
  onClose,
  operarioNombre,
  codigoOperario,
  onSubmit,
}) => {
  const { control, handleSubmit } = useForm<AsignarPuestoFormInput>({
    defaultValues: {
      idCentro: 1,
      idLinea: 1,
      idTurno: 1,
      especialidad: 'MECANICO',
      idResponsable: 10,
      motivo: 'Asignación de puesto operativo en planta',
    },
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 440, p: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Asignar Puesto de Producción
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography variant="body2" color="primary.light" fontWeight={600} sx={{ mb: 2 }}>
        {codigoOperario} - {operarioNombre}
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Regla RN-006:</strong> Si el operario ya tiene un puesto asignado, el sistema cerrará la vigencia
        anterior de forma automática y creará un nuevo registro histórico.
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2.5}>
          <Controller
            name="idCentro"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Centro Operativo" fullWidth>
                <MenuItem value={1}>Centro 01 - Planta Central</MenuItem>
                <MenuItem value={2}>Centro 02 - Nave Chasis</MenuItem>
              </TextField>
            )}
          />

          <Controller
            name="idLinea"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Línea de Fabricación" fullWidth>
                <MenuItem value={1}>Línea 01 - Corte y Estampación</MenuItem>
                <MenuItem value={2}>Línea 02 - Soldadura Robótica</MenuItem>
                <MenuItem value={3}>Línea 03 - Pintura y Tratamientos</MenuItem>
                <MenuItem value={4}>Línea 04 - Montaje Final HVAC</MenuItem>
              </TextField>
            )}
          />

          <Controller
            name="idTurno"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Turno Laboral" fullWidth>
                <MenuItem value={1}>Turno Mañana (06:00 - 14:00)</MenuItem>
                <MenuItem value={2}>Turno Tarde (14:00 - 22:00)</MenuItem>
                <MenuItem value={3}>Turno Noche (22:00 - 06:00)</MenuItem>
                <MenuItem value={4}>Turno Central (08:00 - 17:00)</MenuItem>
              </TextField>
            )}
          />

          <Controller
            name="especialidad"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Especialidad (Catálogo Cerrado - RN-017)" fullWidth>
                <MenuItem value="MECANICO">MECANICO</MenuItem>
                <MenuItem value="ELECTRICO">ELECTRICO</MenuItem>
                <MenuItem value="POLIVALENTE">POLIVALENTE</MenuItem>
              </TextField>
            )}
          />

          <Controller
            name="idResponsable"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Supervisor / Responsable Directo" fullWidth>
                <MenuItem value={10}>OP000010 - Antonio Morales (Jefe Turno)</MenuItem>
                <MenuItem value={18}>OP000018 - Laura Gil (Supervisora Calidad)</MenuItem>
              </TextField>
            )}
          />

          <Controller
            name="motivo"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Motivo de la Asignación" multiline rows={2} fullWidth required />
            )}
          />

          <Box sx={{ pt: 2 }}>
            <Button type="submit" variant="contained" color="primary" fullWidth size="large">
              Confirmar Asignación en Planta
            </Button>
          </Box>
        </Stack>
      </form>
    </Drawer>
  );
};
