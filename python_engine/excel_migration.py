"""
==============================================================================
STULZ ESPAÑA — MOTOR DE MIGRACIÓN ETL DESDE EXCEL A SQL SERVER
==============================================================================
PRINCIPIO: El archivo Excel desaparece progresivamente y solo se utiliza
           para la migración inicial de datos. SQL Server se convierte
           en la ÚNICA fuente oficial de datos (Single Source of Truth).
REGLA: BATERÍAS queda excluida del universo de análisis.
==============================================================================
"""

import os
import json
import hashlib
import unicodedata
from datetime import datetime
from typing import Dict, List, Any, Optional

PARTICULAS_A_OMITIR = {
    'DE', 'LA', 'LAS', 'DEL', 'LOS', 'Y', 'E', 'SAN', 'SANTA', 'DA', 'DO', 'DOS', 'DAS', 'VON', 'VAN', 'DI'
}

def normalize_text(text: Optional[str]) -> str:
    """Normaliza cadenas a mayúsculas, sin tildes ni espacios superfluos."""
    if not text:
        return ""
    text_str = str(text).strip().upper()
    nfkd = unicodedata.normalize('NFKD', text_str)
    no_accents = "".join([c for c in nfkd if not unicodedata.combining(c)])
    # Estandarización de la Ñ a N según norma ERP STULZ
    no_accents = no_accents.replace('Ñ', 'N')
    return " ".join(no_accents.split())

def generate_auto_siglas(full_name: str) -> str:
    """
    Genera siglas automáticas (máx 4 caracteres) omitiendo partículas compuestas.
    Ej: JUAN ANTONIO VEGA SANCHEZ -> JAVS
    Ej: ALBERTO DE LA ROSA MORENO -> ARM (omite 'DE LA')
    """
    norm = normalize_text(full_name)
    if not norm:
        return "STLZ"
    words = [w for w in norm.split() if w]
    sig_words = [w for w in words if w not in PARTICULAS_A_OMITIR]
    if not sig_words:
        return "STLZ"
    if len(sig_words) >= 4:
        return "".join(w[0] for w in sig_words[:4])
    elif len(sig_words) == 3:
        return "".join(w[0] for w in sig_words)
    elif len(sig_words) == 2:
        return (sig_words[0][0] + sig_words[1][:2]).upper()
    return sig_words[0][:4].upper()

def calculate_checksum(file_path: str) -> str:
    """Calcula hash SHA-256 para verificar la integridad del archivo antes de la ingesta."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()

class ExcelToSqlMigrator:
    def __init__(self, raw_data_path: str):
        self.raw_data_path = raw_data_path
        self.migrated_records: List[Dict[str, Any]] = []
        self.audit_log: List[Dict[str, Any]] = []

    def run_migration(self) -> Dict[str, Any]:
        print(f"[{datetime.now().isoformat()}] INICIANDO MIGRACIÓN INICIAL ETL...")

        if not os.path.exists(self.raw_data_path):
            return {"status": "ERROR", "message": f"Archivo no encontrado: {self.raw_data_path}"}

        file_hash = calculate_checksum(self.raw_data_path)
        print(f"[*] Hash SHA-256 del origen: {file_hash}")

        # Si es JSON (tabla de verdad de AREABOARD) o CSV/Excel
        if self.raw_data_path.endswith('.json'):
            with open(self.raw_data_path, 'r', encoding='utf-8') as f:
                raw_items = json.load(f)
        else:
            import pandas as pd
            df = pd.read_excel(self.raw_data_path) if self.raw_data_path.endswith(('.xlsx', '.xls')) else pd.read_csv(self.raw_data_path, sep=';')
            raw_items = df.to_dict(orient='records')

        valid_count = 0
        excluded_baterias = 0
        seen_siglas = set()

        for item in raw_items:
            linea = normalize_text(item.get("Linea", item.get("LINEA", item.get("LINEA_HABITUAL", ""))))
            
            # FILTRO ESTRICTO: Excluir Baterías según directiva
            if "BATER" in linea:
                excluded_baterias += 1
                continue

            nombre = normalize_text(item.get("Nombre", item.get("NOMBRE", "")))
            apellidos = normalize_text(item.get("Apellidos", item.get("APELLIDOS", "")))
            if not apellidos and "," in nombre:
                parts = nombre.split(",", 1)
                apellidos = parts[0].strip()
                nombre = parts[1].strip()

            siglas = normalize_text(item.get("Siglas", item.get("SIGLAS", item.get("ID_OPERARIO", ""))))
            if not siglas:
                siglas = generate_auto_siglas(f"{nombre} {apellidos}")
            siglas = siglas[:4]

            if not siglas or siglas in seen_siglas:
                continue
            seen_siglas.add(siglas)

            categoria = normalize_text(item.get("Categoria", item.get("PUESTO", "Mecánica")))
            en_formacion = bool(item.get("EnFormacion", item.get("FORMACION", False)))

            record = {
                "SiglasERP": siglas,
                "CodigoEmpleado": str(item.get("CodigoEmpleado", item.get("CODIGO", "40" + str(1000 + valid_count)))),
                "Nombre": nombre or "OPERARIO",
                "Apellidos": apellidos or siglas,
                "NombreCompleto": f"{apellidos}, {nombre}" if apellidos else nombre,
                "Linea": linea if linea in ["L1", "L2", "L3", "L4", "L5", "BOX 1"] else "L1",
                "Puesto": "Montador Eléctrico" if "ELEC" in categoria else "Montador Mecánico",
                "Turno": "T1",
                "Estado": "Activo",
                "EnFormacion": en_formacion,
                "FactorFTE": 0.3 if en_formacion else 1.0,
                "FechaMigracion": datetime.now().isoformat()
            }
            self.migrated_records.append(record)
            valid_count += 1

        summary = {
            "status": "COMPLETED",
            "totalRegistrosLeidos": len(raw_items),
            "registrosValidadosSQL": valid_count,
            "excluidosBaterias": excluded_baterias,
            "origenHash": file_hash,
            "fechaMigracion": datetime.now().isoformat(),
            "mensaje": "Migración inicial completada. A partir de este momento, Excel queda deshabilitado."
        }
        print(f"[+] Migración exitosa: {valid_count} operarios listos para SQL Server.")
        print(f"[-] Operarios en 'Baterías' excluidos del análisis: {excluded_baterias}")
        return summary

if __name__ == "__main__":
    test_path = os.path.join(os.path.dirname(__file__), "..", "shared", "data", "tabla_verdad_operarios.json")
    if os.path.exists(test_path):
        migrator = ExcelToSqlMigrator(test_path)
        print(migrator.run_migration())
