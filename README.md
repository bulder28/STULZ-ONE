# STULZ España — SGP-F (Sistema de Gestión de Personal de Fabricación)

> **PLATAFORMA INDUSTRIAL MULTI-TECNOLÓGICA (REACT + VUE + VITE + PYTHON + NODE.JS + SQL SERVER)**  
> **PRINCIPIO FUNDAMENTAL:** Single Source of Truth (SSOT). Excel queda 100% eliminado como fuente de datos oficial.  
> **LÍNEAS OBJETO DE ANÁLISIS:** `L1`, `L2`, `L3`, `L4`, `L5` (Líneas Gemelas) y `BOX 1` (Unidades Especiales). *Baterías queda expresamente excluida.*

---

## 1. Visión General de la Arquitectura

```
  ┌──────────────────────────────────────────────┐
  │         Puestos de Mando & Supervisores       │
  │     (React 18 + Vite + Material UI Light)    │
  └──────────────────────┬───────────────────────┘
                         │ REST / SSE
                         ▼
  ┌──────────────────────────────────────────────┐       ┌────────────────────────────────┐
  │     Backend Industrial Node.js + Express     │◄─────►│    Python Analytics Engine     │
  │   (Helmet CSP-3, Anti-Traversal, Zero-PHP)   │       │  (FastAPI + Pandas + OpenPyXL) │
  └──────────────────────┬───────────────────────┘       └────────────────────────────────┘
                         │
                         ├─────────────────────────────────────────┐
                         ▼                                         ▼
  ┌──────────────────────────────────────────────┐       ┌────────────────────────────────┐
  │          Terminal Táctil Kiosco              │       │       Base de Datos Central    │
  │          (Vue 3 + Vite + Pinia)              │       │          SQL Server            │
  │      Pantallas de Operarios en Planta        │       │  (Tablas Maestras, SCD2, DDL)  │
  └──────────────────────────────────────────────┘       └────────────────┬───────────────┘
                                                                          │ DirectQuery (RN-5)
                                                                          ▼
                                                         ┌────────────────────────────────┐
                                                         │            Power BI            │
                                                         │   (Consumo Exclusivo SQL)      │
                                                         └────────────────────────────────┘
```

---

## 2. Pila Tecnológica Integrada

| Capa | Tecnología | Función Principal |
| :--- | :--- | :--- |
| **Frontend Web** | **React 18 + TypeScript + Vite + MUI** | Portal de gestión integral para Producción, RRHH y Dirección con paleta corporativa clara STULZ (`#b8000b`). |
| **Kiosco de Planta** | **Vue 3 + TypeScript + Vite + Pinia** | Terminal táctil para suelo de fábrica, botones aptos para guantes, presencia inmediata (7,75 h) y Andon. |
| **Pasarela Industrial** | **Node.js + Express + TypeScript** | Servidor transaccional, Server-Sent Events (SSE) para sync en tiempo real, RBAC estricto y blindaje perimetral. |
| **Motor Analítico** | **Python 3.11 + FastAPI + Pandas** | Conciliación Zucchetti a 2 horas (08:00/16:00), cálculo Lean de 14 FTE y ETL inicial de migración desde Excel. |
| **Persistencia SSOT** | **Microsoft SQL Server (2019/2022)** | Base de datos ACID, tablas históricas SCD Tipo 2, vistas de reporting y disparadores de auditoría inmutable. |
| **Business Intelligence** | **Power BI DirectQuery** | Cuadros de mando conectados exclusivamente a SQL Server (0% dependencia de Excel). |

---

## 3. Cumplimiento Estricto de Reglas de Negocio (RN-1 a RN-8)

1. **Regla 1 (Asignación Única):** Un empleado solo puede estar asignado a una línea activa simultáneamente (`UQ_Empleado_Linea_Activa`).
2. **Regla 2 (Histórico Inmutable):** Toda reasignación cierra la asignación previa con `FechaFin = SYSUTCDATETIME()` y crea una nueva en `dbo.Empleado_Linea_Historico`.
3. **Regla 3 (No Borrado Físico):** Prohibido el borrado físico (`DELETE`). Toda baja se procesa como `Estado = 'Baja'` conservando históricos y formaciones.
4. **Regla 4 (Auditoría Integral):** Toda modificación escribe en `dbo.Auditoria` (Usuario, FechaHora, Tabla, Campo, ValorAnterior, ValorNuevo, Acción, IP).
5. **Regla 5 (Power BI 100% SQL):** Power BI solo lee vistas de SQL Server (`dbo.vw_PBI_*`), nunca Excel.
6. **Regla 6 (Autoridad Exclusiva):** La aplicación es el único canal autorizado para mutar información.
7. **Regla 7 (Time Machine Temporal):** Consulta exacta de la situación de cualquier operario en cualquier fecha mediante `dbo.sp_ConsultarEstadoHistoricoEnFecha`.
8. **Regla 8 (Persistencia Inmediata):** Cada acción en la interfaz se persiste de forma atómica en SQL Server en tiempo real.

---

## 4. Blindaje de Ciberseguridad Industrial (IEC 62443 / OWASP ASVS)

- **Air-Gap 100% Local:** Prohibido el acceso a internet o nubes remotas. Operación dentro de la intranet de planta.
- **Zero-PHP (0% PHP):** Inmunidad absoluta contra vulnerabilidades CGI / Windows Best-Fit (CVE-2024-4577).
- **CSP Nivel 3:** `default-src 'self'; object-src 'none'; frame-ancestors 'none'`.
- **Anti-Path Traversal (CWE-22):** Validación `path.resolve()` con jaula chroot para cualquier archivo CSV/Excel.
- **Anti-Prototype Pollution:** Congelación de prototipos en frontend y saneado recursivo en backend.
- **Firewall Perimetral:** Rechazo de IPs públicas en backend; solo subredes RFC 1918 permitidas.

---

## 5. Instrucciones de Despliegue Local

### 5.1 Base de Datos (SQL Server)
Ejecutar los scripts en orden en SQL Server Management Studio:
```sql
1. database/01_SCHEMA_DDL.sql          -- Estructura, Tablas Maestras, SCD2 y Auditoría
2. database/02_STORED_PROCEDURES.sql   -- Lógica Transaccional ACID (sp_ReasignarLinea, etc.)
3. database/03_VIEWS_POWERBI.sql       -- Vistas preparadas para Power BI DirectQuery
4. database/04_SEED_DATA.sql           -- Carga inicial de L1-L5, BOX 1 y operarios
```

### 5.2 Backend Node.js
```bash
cd backend
npm install
npm run dev     # Servidor activo en http://127.0.0.1:4000
```

### 5.3 Frontend React (Gestión)
```bash
cd frontend
npm install
npm run dev     # Aplicación web en http://127.0.0.1:5173
```

### 5.4 Terminal Táctil Vue 3 (Kiosco de Planta)
```bash
cd frontend-vue
npm install
npm run dev     # Kiosco táctil en http://127.0.0.1:5174
```

### 5.5 Motor Analítico Python (FastAPI)
```bash
cd python_engine
pip install -r requirements.txt
python main_api.py   # API analítica en http://127.0.0.1:8000
```
