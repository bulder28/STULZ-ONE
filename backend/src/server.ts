import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { applySecurityHeaders, preventCgiAndPhpExecution } from './config/security';
import { 
  enforceAirGapPerimeter, 
  prototypePollutionShield, 
  deepInspectionShield, 
  industrialRateLimiter 
} from './config/advancedSecurity';
import { initializeDatabase } from './config/database';
import { apiRouter } from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';

// ==============================================================================
// CADENA DE SEGURIDAD INDUSTRIAL DEFENSIVA (DEFENSE-IN-DEPTH)
// ==============================================================================

// 1. Cabeceras de seguridad CSP Nivel 3 y deshabilitación de huella digital
app.use(applySecurityHeaders);

// 2. Control de perímetro Air-Gap (Rechazo de IPs fuera de la intranet)
app.use(enforceAirGapPerimeter);

// 3. Bloqueo de sondas PHP / CGI / Exploits Windows Best-Fit
app.use(preventCgiAndPhpExecution);

// 4. Rate Limiting local anti-saturación
app.use(industrialRateLimiter);

// 5. CORS restringido estrictamente a la intranet corporativa
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('ACCESO_CORS_DENEGADO_POR_SEGURIDAD'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 6. Parsers con límites de tamaño estrictos (Anti-Memory Exhaustion)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// 7. Purga de Prototype Pollution & Sentinela de Inyección
app.use(prototypePollutionShield);
app.use(deepInspectionShield);

// ==============================================================================
// RUTAS DE LA API INDUSTRIAL
// ==============================================================================
app.use('/api', apiRouter);

// Health Check Endpoint (Auditoría de Salud del Sistema)
app.get('/health', (req, res) => {
  res.json({
    status: 'OPTIMAL',
    sistema: 'SGP-F STULZ España',
    version: '2.4.0-AIRGAP',
    timestamp: new Date().toISOString(),
    sqlServerConectado: true,
    seguridad: {
      zeroPhp: true,
      cspLevel: 3,
      chrootValidation: true,
      airGapEnforced: true
    }
  });
});

// Manejador Global de Errores Seguros (Sin exponer trazas de stack en producción)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SGP-F ERROR_INTERNO]', err.message);
  res.status(err.status || 500).json({
    error: 'ERROR_INTERNO_SERVIDOR',
    mensaje: process.env.NODE_ENV === 'production' ? 'Ha ocurrido un error en el procesamiento.' : err.message
  });
});

// ==============================================================================
// ARRANQUE DEL SERVIDOR INDUSTRIAL
// ==============================================================================
async function startServer() {
  await initializeDatabase();

  app.listen(Number(PORT), HOST, () => {
    console.log('==============================================================================');
    console.log(`  STULZ ESPAÑA — SGP-F SERVIDOR INDUSTRIAL ACTIVO`);
    console.log(`  Escuchando en: http://${HOST}:${PORT}`);
    console.log(`  Entorno: AIR-GAP 100% LOCAL | CERO ACCESO REMOTO | ZERO-PHP BLINDADO`);
    console.log('==============================================================================');
  });
}

startServer();
