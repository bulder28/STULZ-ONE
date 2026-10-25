"""
==============================================================================
STULZ ESPAÑA — MOTOR DE CONCILIACIÓN DE FICHAJES ZUCCHETTI (2 HORAS)
==============================================================================
Turno 1: Conciliación automática a las 08:00 (inicio 06:00)
Turno 2: Conciliación automática a las 16:00 (inicio 14:00)
Compara accesos por tornos Zucchetti vs presencia física en línea (7,75 h).
==============================================================================
"""

import pandas as pd
from typing import Dict, List, Any
from datetime import datetime

class ZucchettiReconciler:
    def __init__(self, fichajes_csv_path: str = None):
        self.fichajes_csv_path = fichajes_csv_path

    def conciliar(self, presencia_linea: List[Dict[str, Any]], fichajes_torno: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Realiza el cruce analítico en memoria usando Pandas DataFrame.
        """
        df_presencia = pd.DataFrame(presencia_linea)
        df_torno = pd.DataFrame(fichajes_torno)

        if df_presencia.empty:
            return {"error": "Sin datos de presencia en planta para conciliar."}

        # Normalizar claves de cruce
        df_presencia['SiglasERP'] = df_presencia['SiglasERP'].str.upper().str.strip()
        if not df_torno.empty and 'SiglasERP' in df_torno.columns:
            df_torno['SiglasERP'] = df_torno['SiglasERP'].str.upper().str.strip()
        else:
            # Crear dataframe vacío si no hay fichajes
            df_torno = pd.DataFrame(columns=['SiglasERP', 'HoraFichaje', 'Torno'])

        # Merge Outer para capturar todas las discrepancias
        merged = pd.merge(
            df_presencia,
            df_torno,
            on='SiglasERP',
            how='outer',
            suffixes=('_planta', '_torno')
        )

        anomalias = []
        conciliados_correctos = 0

        for _, row in merged.iterrows():
            siglas = row.get('SiglasERP')
            en_planta = pd.notna(row.get('PresenteEnLinea')) and bool(row.get('PresenteEnLinea'))
            en_torno = pd.notna(row.get('HoraFichaje'))
            linea = row.get('CodigoLinea', 'N/A')
            operario = row.get('NombreCompleto', siglas)

            if en_planta and en_torno:
                conciliados_correctos += 1
            elif en_planta and not en_torno:
                anomalias.append({
                    "tipo": "PRESENTE_SIN_FICHAJE_TORNO",
                    "severidad": "MEDIA",
                    "siglas": siglas,
                    "operario": operario,
                    "linea": linea,
                    "detalle": "Operario asignado y marcado presente en línea, pero no consta fichaje en tornos de acceso. (Posible olvido de tarjeta)."
                })
            elif not en_planta and en_torno:
                anomalias.append({
                    "tipo": "FICHAJE_TORNO_SIN_LINEA",
                    "severidad": "ALTA",
                    "siglas": siglas,
                    "operario": operario,
                    "linea": linea,
                    "horaFichaje": row.get('HoraFichaje'),
                    "detalle": "Fichó en el torno de entrada a la fábrica pero NO ha sido asignado ni marcado en ninguna línea de producción."
                })
            else:
                anomalias.append({
                    "tipo": "AUSENCIA_NO_REPORTADA",
                    "severidad": "CRITICA",
                    "siglas": siglas,
                    "operario": operario,
                    "linea": linea,
                    "detalle": "Ausencia total a las 2 horas de turno (Sin fichaje y sin presencia en línea)."
                })

        total_evaluados = len(merged)
        tasa_cumplimiento = (conciliados_correctos / total_evaluados * 100) if total_evaluados > 0 else 100.0

        return {
            "fechaHoraAuditoria": datetime.now().isoformat(),
            "totalOperariosEvaluados": total_evaluados,
            "conciliadosCorrectos": conciliados_correctos,
            "totalAnomalias": len(anomalias),
            "tasaCumplimientoPct": round(tasa_cumplimiento, 2),
            "anomalias": anomalias
        }
