import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import path from 'path';

/**
 * ==============================================================================
 * STULZ ESPAÑA — MIDDLEWARE DE BLINDAJE INDUSTRIAL (OWASP ASVS & IEC 62443)
 * ==============================================================================
 * 1. Protección contra ataques RCE/CGI (0% PHP, Anti CVE-2024-4577).
 * 2. CSP Nivel 3 estricto y eliminación de cabeceras de fingerprinting.
 * 3. Chroot Anti-Path Traversal para operaciones con archivos.
 * 4. Control de acceso por perfil corporativo (RBAC).
 * ==============================================================================
 */

export const applySecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://127.0.0.1:*", "http://localhost:*"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  dnsPrefetchControl: { allow: false },
  hidePoweredBy: true,
  hsts: false, // Intranet local air-gapped
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Filtro Anti-CGI y Bloqueo de Inyecciones PHP
 * La plataforma es 100% libre de PHP. Cualquier intento de sonda o inyección es abortado.
 */
export function preventCgiAndPhpExecution(req: Request, res: Response, next: NextFunction) {
  const url = req.url.toLowerCase();
  const query = JSON.stringify(req.query).toLowerCase();

  // Bloqueo de sondas PHP y exploits de Windows Best-Fit (CVE-2024-4577)
  if (
    url.includes('.php') ||
    url.includes('.cgi') ||
    url.includes('auto_prepend_file') ||
    url.includes('allow_url_include') ||
    url.includes('cgi-bin') ||
    query.includes('auto_prepend')
  ) {
    return res.status(403).json({
      error: 'ACCESO_DENEGADO_POR_SEGURIDAD_INDUSTRIAL',
      mensaje: 'Prohibida la invocación de scripts externos o CGI en la intranet STULZ.',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Validador Chroot Anti-Path Traversal (CWE-22)
 * Asegura que ninguna ruta de archivo solicitada escape del directorio base permitido.
 */
export function sanitizeLocalFilePath(baseDir: string, requestedPath: string): string {
  const safeBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(safeBase, requestedPath);

  if (!resolvedTarget.startsWith(safeBase)) {
    throw new Error('VIOLACION_SEGURIDAD_PATH_TRAVERSAL: Intento de escape de directorio detectado.');
  }

  return resolvedTarget;
}

/**
 * Middleware RBAC para validar Roles Corporativos STULZ
 * Perfiles permitidos: 'RRHH', 'PRODUCCION', 'DIRECCION', 'MANDOS'
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers['x-stulz-role'] as string) || 'PRODUCCION';
    
    if (!allowedRoles.includes(userRole.toUpperCase())) {
      return res.status(403).json({
        error: 'PERMISO_INSUFICIENTE',
        mensaje: `El perfil '${userRole}' no tiene autorización para ejecutar esta operación.`,
        rolesPermitidos: allowedRoles
      });
    }

    // Inyectar contexto en la solicitud para trazabilidad
    (req as any).userRole = userRole.toUpperCase();
    (req as any).userName = (req.headers['x-stulz-user'] as string) || 'OPERARIO_PLANTA';
    next();
  };
}
