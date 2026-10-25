"""
==============================================================================
STULZ ESPAÑA — MICROSERVICIO FASTAPI INDUSTRIAL DE ANALÍTICA (PYTHON ENGINE)
==============================================================================
Expone endpoints analíticos de alta velocidad para:
1. Conciliación de fichajes Zucchetti a 2 horas (08:00 y 16:00).
2. Cálculo de balanceo Lean de líneas (14 FTE, 10 Mec, 4 Elec).
3. Migración ETL desde Excel a SQL Server.
==============================================================================
"""

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from zucchetti_reconciler import ZucchettiReconciler
from lean_balancer import LeanLineBalancer
from excel_migration import ExcelToSqlMigrator

app = FastAPI(
    title="SGP-F STULZ Python Analytics Engine",
    description="Motor analítico de planta para Lean Balancing y Conciliación Zucchetti",
    version="2.4.0"
)

# CORS para red local industrial
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4000", "http://127.0.0.1:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

balancer = LeanLineBalancer()
reconciler = ZucchettiReconciler()

class ReconciliacionPayload(BaseModel):
    presenciaLinea: List[Dict[str, Any]]
    fichajesTorno: List[Dict[str, Any]]

@app.get("/health")
def health_check():
    return {
        "status": "ONLINE",
        "engine": "Python FastAPI Industrial Engine",
        "timestamp": datetime.now().isoformat(),
        "lineasSoportadas": ["L1", "L2", "L3", "L4", "L5", "BOX 1"],
        "lineasExcluidas": ["BATERIAS"]
    }

@app.post("/analytics/lean-optimize")
def optimize_lean(operarios: List[Dict[str, Any]] = Body(...)):
    """Calcula el balanceo Lean de 14 FTE para las 6 líneas autorizadas."""
    try:
        resultado = balancer.calcular_balanceo(operarios)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/reconcile-zucchetti")
def reconcile_zucchetti(payload: ReconciliacionPayload):
    """Ejecuta la auditoría de fichajes Zucchetti a las 2 horas de turno con Pandas."""
    try:
        resultado = reconciler.conciliar(payload.presenciaLinea, payload.fichajesTorno)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("[*] Iniciando FastAPI Analytics Engine en http://127.0.0.1:8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
