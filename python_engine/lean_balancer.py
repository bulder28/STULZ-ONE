"""
==============================================================================
STULZ ESPAÑA — MOTOR DE OPTIMIZACIÓN Y BALANCEO LEAN DE LÍNEAS DE MONTAJE
==============================================================================
Objetivo Lean Manufacturing:
- 14.00 FTE por línea gemela (L1 a L5).
- Desglose objetivo: 10 Montadores Mecánicos + 4 Montadores Eléctricos.
- Factor de ponderación:
    * Operario cualificado / autónomo: 1.00 FTE
    * Operario en periodo de formación / aprendizaje: 0.30 FTE
- Línea BOX 1: 8.00 FTE (6 Mecánicos + 2 Eléctricos)
- BATERÍAS: Excluida totalmente del análisis.
==============================================================================
"""

from typing import Dict, List, Any

class LeanLineBalancer:
    TARGETS = {
        "L1": {"targetFte": 14.0, "mecanicos": 10, "electricos": 4},
        "L2": {"targetFte": 14.0, "mecanicos": 10, "electricos": 4},
        "L3": {"targetFte": 14.0, "mecanicos": 10, "electricos": 4},
        "L4": {"targetFte": 14.0, "mecanicos": 10, "electricos": 4},
        "L5": {"targetFte": 14.0, "mecanicos": 10, "electricos": 4},
        "BOX 1": {"targetFte": 8.0, "mecanicos": 6, "electricos": 2}
    }

    def calcular_balanceo(self, asignaciones_actuales: List[Dict[str, Any]]) -> Dict[str, Any]:
        resumen_lineas = {}
        for cod_linea, meta in self.TARGETS.items():
            resumen_lineas[cod_linea] = {
                "codigoLinea": cod_linea,
                "targetFte": meta["targetFte"],
                "targetMecanicos": meta["mecanicos"],
                "targetElectricos": meta["electricos"],
                "fteActual": 0.0,
                "operariosCount": 0,
                "mecanicosActual": 0,
                "electricosActual": 0,
                "enFormacionCount": 0,
                "gapFte": 0.0,
                "estado": "Balanceada",
                "operarios": []
            }

        # Procesar operarios
        for op in asignaciones_actuales:
            linea = op.get("CodigoLinea", "").strip()
            if linea not in resumen_lineas:
                continue

            en_formacion = bool(op.get("EnFormacion", False))
            factor_fte = 0.30 if en_formacion else 1.00
            puesto_cat = op.get("PuestoCategoria", "Mecánica")

            target_linea = resumen_lineas[linea]
            target_linea["fteActual"] += factor_fte
            target_linea["operariosCount"] += 1
            if en_formacion:
                target_linea["enFormacionCount"] += 1
            if puesto_cat == "Eléctrica":
                target_linea["electricosActual"] += 1
            else:
                target_linea["mecanicosActual"] += 1

            target_linea["operarios"].append({
                "siglas": op.get("SiglasERP"),
                "nombre": op.get("NombreCompleto"),
                "puesto": op.get("PuestoNombre"),
                "factorFte": factor_fte,
                "enFormacion": en_formacion
            })

        # Evaluar desviaciones y cuellos de botella
        alertas_balanceo = []
        for cod_linea, datos in resumen_lineas.items():
            datos["fteActual"] = round(datos["fteActual"], 2)
            gap = round(datos["fteActual"] - datos["targetFte"], 2)
            datos["gapFte"] = gap

            if gap < -2.0:
                datos["estado"] = "Cuello de Botella Crítico"
                alertas_balanceo.append(f"Línea {cod_linea} en déficit crítico ({gap} FTE). Riesgo de parada de producción.")
            elif gap < 0:
                datos["estado"] = "Alerta Leve"
                alertas_balanceo.append(f"Línea {cod_linea} con déficit leve ({gap} FTE).")
            elif gap > 2.0:
                datos["estado"] = "Sobreasignada"
            else:
                datos["estado"] = "Balanceada"

            # Validar cuellos de botella por especialidad
            if datos["electricosActual"] < datos["targetElectricos"]:
                alertas_balanceo.append(f"Línea {cod_linea} carece de electricistas suficientes ({datos['electricosActual']}/{datos['targetElectricos']}).")

        return {
            "resumenLineas": list(resumen_lineas.values()),
            "alertas": alertas_balanceo,
            "totalLineasEvaluadas": len(resumen_lineas)
        }
