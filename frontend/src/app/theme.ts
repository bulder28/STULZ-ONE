import { createTheme } from '@mui/material/styles';

/**
 * ==============================================================================
 * PALETA CORPORATIVA OFICIAL STULZ ESPAÑA — TEMA CLARO INDUSTRIAL
 * ==============================================================================
 * Rojo STULZ Primario: #e30613 / #b8000b
 * Fondo de Planta:     #eceef1
 * Superficie Tarjetas: #ffffff
 * Texto Antracita:     #1a1a1a / #575757
 * Borde Estructural:   #d8dbe0
 * ==============================================================================
 */

export const industrialLightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#e30613',       // Rojo corporativo STULZ
      light: '#ff3b47',
      dark: '#b8000b',        // Rojo STULZ cabecera
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00466e',       // Azul Climatización STULZ
      light: '#0284c7',
      dark: '#002f4b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#eceef1',    // Gris claro de fábrica
      paper: '#ffffff',      // Blanco impoluto para tarjetas
    },
    text: {
      primary: '#1a1a1a',    // Grafito de máxima legibilidad
      secondary: '#575757',  // Antracita medio
    },
    success: {
      main: '#008744',       // Verde industrial normal
      light: '#e6f4ea',
    },
    warning: {
      main: '#d97706',       // Ámbar alerta
      light: '#fef3c7',
    },
    error: {
      main: '#e30613',       // Rojo parada
      light: '#fee2e2',
    },
    divider: '#d8dbe0',
  },
  typography: {
    fontFamily: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h1: { fontWeight: 800, color: '#1a1a1a' },
    h2: { fontWeight: 700, color: '#1a1a1a' },
    h3: { fontWeight: 600, color: '#1a1a1a' },
    h4: { fontWeight: 600, color: '#1a1a1a' },
    h6: { fontWeight: 600, color: '#1a1a1a' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          },
        },
        containedPrimary: {
          backgroundColor: '#b8000b',
          '&:hover': {
            backgroundColor: '#e30613',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #d8dbe0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #b8000b 0%, #e30613 100%)',
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(184, 0, 11, 0.25)',
        },
      },
    },
  },
});
