"""
==============================================================================
STULZ ESPAÑA — MONITOR DE ARCHIVOS MES (ANTI-PATH TRAVERSAL & CHROOT SEGURO)
==============================================================================
Vigila la llegada de órdenes de fabricación (OFs) en CSV procedentes del MES.
Aplica validación estricta de rutas (CWE-22) para evitar cualquier escape
del directorio permitido.
==============================================================================
"""

import os
import csv
from typing import Dict, List, Any

SAFE_CHROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "shared", "data"))

def validate_safe_path(filename: str) -> str:
    """Verifica que el archivo no contenga secuencias de path traversal (../ o ..\\)."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("SEGURIDAD: Intento de Path Traversal detectado en el nombre de archivo.")
    
    full_path = os.path.abspath(os.path.join(SAFE_CHROOT_DIR, filename))
    if not full_path.startswith(SAFE_CHROOT_DIR):
        raise PermissionError("SEGURIDAD: Acceso denegado fuera de la jaula chroot.")
    return full_path

class MesOfWatcher:
    def parse_mes_file(self, filename: str) -> List[Dict[str, Any]]:
        safe_path = validate_safe_path(filename)
        if not os.path.exists(safe_path):
            return []

        orders = []
        with open(safe_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                orders.append({
                    "of": row.get("OF", "").strip(),
                    "modelo": row.get("Modelo", "").strip(),
                    "linea": row.get("Linea", "").strip(),
                    "horasEstimadas": float(row.get("HorasEstimadas", 0.0) or 0.0),
                    "estado": row.get("Estado", "PENDIENTE").strip()
                })
        return orders
