"""Generación de reportes CSV y resumen de texto."""

import csv
import logging
from pathlib import Path
from typing import Any

from modules.database import (
    get_metricas, get_top_clientes, get_top_productos,
    get_clientes_para_crm, get_productos_cliente, actualizar_clasificaciones,
)

logger = logging.getLogger(__name__)

# BOM para compatibilidad Excel en Windows
UTF8_BOM = "\ufeff"


def generate_report(db_path: str, output_dir: str) -> None:
    """Genera reportes CSV y resumen de texto.

    Args:
        db_path: Ruta al archivo SQLite.
        output_dir: Carpeta donde guardar los reportes.
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Recalcular clasificaciones antes de reportar
    actualizar_clasificaciones(db_path)

    _generar_reporte_clientes(db_path, out)
    _generar_reporte_productos(db_path, out)
    _generar_resumen(db_path, out)

    logger.info(f"Reportes generados en {out}")


def _generar_reporte_clientes(db_path: str, output_dir: Path) -> None:
    """Genera reporte_clientes.csv.

    Args:
        db_path: Ruta al archivo SQLite.
        output_dir: Path de la carpeta de salida.
    """
    clientes = get_clientes_para_crm(db_path, solo_nuevos=False)
    ruta = output_dir / "reporte_clientes.csv"

    with open(ruta, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "rfc", "nombre", "empresa", "telefono", "email",
            "total_documentos", "total_compras", "ticket_promedio",
            "primera_fecha", "ultima_fecha", "clasificacion",
            "productos_frecuentes",
        ])

        for c in clientes:
            total_docs = c.get("total_documentos", 0) or 0
            total_compras = c.get("total_compras", 0.0) or 0.0
            ticket = total_compras / total_docs if total_docs > 0 else 0.0

            # Obtener productos frecuentes
            productos = get_productos_cliente(db_path, c["id"])
            prods_str = ", ".join(p["descripcion"] for p in productos[:5])

            writer.writerow([
                c.get("rfc", ""),
                c.get("nombre", ""),
                c.get("empresa", ""),
                c.get("telefono", ""),
                c.get("email", ""),
                total_docs,
                f"{total_compras:.2f}",
                f"{ticket:.2f}",
                c.get("primera_fecha", ""),
                c.get("ultima_fecha", ""),
                c.get("clasificacion", ""),
                prods_str,
            ])

    logger.info(f"Reporte clientes: {ruta} ({len(clientes)} registros)")


def _generar_reporte_productos(db_path: str, output_dir: Path) -> None:
    """Genera reporte_productos.csv.

    Args:
        db_path: Ruta al archivo SQLite.
        output_dir: Path de la carpeta de salida.
    """
    productos = get_top_productos(db_path, limite=1000)
    ruta = output_dir / "reporte_productos.csv"

    with open(ruta, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "descripcion", "veces_comprado", "clientes_distintos",
            "cantidad_total", "valor_total", "ticket_promedio_producto",
        ])

        for p in productos:
            writer.writerow([
                p.get("descripcion", ""),
                p.get("veces_comprado", 0),
                p.get("clientes_distintos", 0),
                f"{p.get('cantidad_total', 0.0):.2f}",
                f"{p.get('valor_total', 0.0):.2f}",
                f"{p.get('ticket_promedio', 0.0):.2f}",
            ])

    logger.info(f"Reporte productos: {ruta} ({len(productos)} registros)")


def _generar_resumen(db_path: str, output_dir: Path) -> None:
    """Genera resumen.txt con métricas generales.

    Args:
        db_path: Ruta al archivo SQLite.
        output_dir: Path de la carpeta de salida.
    """
    m = get_metricas(db_path)
    top_clientes = get_top_clientes(db_path, 10)
    top_productos = get_top_productos(db_path, 10)

    ruta = output_dir / "resumen.txt"

    lines: list[str] = [
        "=" * 60,
        "RESUMEN DE ANALISIS DE PDFs",
        "=" * 60,
        "",
        "DOCUMENTOS",
        f"  Total procesados:  {m['documentos_total']}",
        f"  Exitosos:          {m['documentos_ok']}",
        f"  Con errores:       {m['documentos_error']}",
        "",
        "CLIENTES",
        f"  Total unicos:      {m['clientes_total']}",
        f"  ALTO (recurrente): {m['clientes_alto']}",
        f"  MEDIO:             {m['clientes_medio']}",
        f"  BAJO:              {m['clientes_bajo']}",
        "",
        "MONTOS",
        f"  Total analizado:   ${m['monto_total']:,.2f} MXN",
        f"  Rango de fechas:   {m['fecha_min']} a {m['fecha_max']}",
        "",
        "-" * 60,
        "TOP 10 CLIENTES POR RECURRENCIA",
        "-" * 60,
    ]

    for i, c in enumerate(top_clientes, 1):
        nombre = c.get("nombre") or c.get("empresa") or c.get("rfc") or "Sin nombre"
        lines.append(
            f"  {i:2d}. {nombre:<40} {c.get('total_documentos', 0):>4} docs  "
            f"${c.get('total_compras', 0.0):>12,.2f}"
        )

    lines.extend([
        "",
        "-" * 60,
        "TOP 10 PRODUCTOS POR FRECUENCIA",
        "-" * 60,
    ])

    for i, p in enumerate(top_productos, 1):
        lines.append(
            f"  {i:2d}. {p.get('descripcion', ''):<40} {p.get('veces_comprado', 0):>4} veces  "
            f"${p.get('valor_total', 0.0):>12,.2f}"
        )

    lines.extend(["", "=" * 60])

    with open(ruta, "w", encoding="utf-8-sig") as f:
        f.write("\n".join(lines))

    logger.info(f"Resumen: {ruta}")
