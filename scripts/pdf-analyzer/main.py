"""Orquestador principal y CLI para el análisis de PDFs."""

import argparse
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

# Agregar directorio raíz al path para imports
sys.path.insert(0, str(Path(__file__).parent))

from config import CRM_URL
from modules.scanner import scan_folder
from modules.extractor import extract_text
from modules.parser import parse_document
from modules.database import (
    init_db, documento_ya_procesado, insert_documento,
    upsert_cliente, insert_producto, link_documento_cliente,
    actualizar_clasificaciones,
)
from modules.reporter import generate_report
from modules.crm_sync import sync_to_crm


def setup_logging(output_dir: str, verbose: bool) -> None:
    """Configura logging a archivo y consola.

    Args:
        output_dir: Carpeta donde guardar el log.
        verbose: Si True, muestra nivel DEBUG en consola.
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = out / f"proceso_{timestamp}.log"

    handlers = [
        logging.FileHandler(str(log_file), encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ]

    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
        handlers=handlers,
    )

    # Silenciar loggers ruidosos de dependencias
    for noisy in ["pdfminer", "pdfplumber", "PIL"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)

    logging.info(f"Log guardado en: {log_file}")


def print_progress(current: int, total: int, start_time: float) -> None:
    """Muestra barra de progreso en consola.

    Args:
        current: Número actual procesado.
        total: Total a procesar.
        start_time: Timestamp de inicio.
    """
    if total == 0:
        return

    pct = current / total
    bar_len = 20
    filled = int(bar_len * pct)
    bar = "#" * filled + "-" * (bar_len - filled)

    elapsed = time.time() - start_time
    if current > 0:
        eta = (elapsed / current) * (total - current)
        mins, secs = divmod(int(eta), 60)
        hours, mins = divmod(mins, 60)
        eta_str = f"{hours:02d}:{mins:02d}:{secs:02d}"
    else:
        eta_str = "--:--:--"

    sys.stdout.write(f"\r  [{bar}] {current}/{total} PDFs ({pct*100:.1f}%) - {eta_str} restante")
    sys.stdout.flush()

    if current == total:
        sys.stdout.write("\n")


# ═══════════════════════════════════════════════════════════════
# COMANDOS
# ═══════════════════════════════════════════════════════════════

def cmd_scan(args: argparse.Namespace) -> None:
    """Comando: escanea carpeta y muestra PDFs encontrados.

    Args:
        args: Argumentos del CLI.
    """
    logger = logging.getLogger("scan")
    logger.info(f"Escaneando: {args.carpeta}")

    count = 0
    total_kb = 0
    for pdf in scan_folder(args.carpeta):
        count += 1
        total_kb += pdf["tamanio_kb"]
        if args.verbose:
            logger.debug(f"  {pdf['nombre']} ({pdf['tamanio_kb']} KB) — {pdf['carpeta']}")

    print(f"\nTotal: {count} PDFs encontrados ({total_kb / 1024:.1f} MB)")


def cmd_process(args: argparse.Namespace) -> None:
    """Comando: procesa PDFs extrayendo datos y almacenando en SQLite.

    Args:
        args: Argumentos del CLI.
    """
    logger = logging.getLogger("process")
    init_db(args.db)

    # Contar total primero
    pdfs = list(scan_folder(args.carpeta))
    total = len(pdfs)

    if args.limite and args.limite < total:
        total = args.limite
        pdfs = pdfs[:total]

    logger.info(f"Procesando {total} PDFs de {args.carpeta}")

    procesados = 0
    errores = 0
    omitidos = 0
    start_time = time.time()

    for i, pdf_info in enumerate(pdfs):
        ruta = pdf_info["ruta"]

        # Checkpoint: saltar si ya procesado
        if documento_ya_procesado(args.db, ruta):
            omitidos += 1
            print_progress(i + 1, total, start_time)
            continue

        try:
            # 1. Extraer texto
            extraction = extract_text(ruta)

            # 2. Parsear campos
            parsed = parse_document(extraction)

            # 3. Guardar documento
            doc_data = {
                "ruta": ruta,
                "nombre_archivo": pdf_info["nombre"],
                "carpeta": pdf_info["carpeta"],
                "tipo_documento": parsed["tipo_documento"],
                "numero_documento": parsed["numero_documento"],
                "fecha": parsed["fecha"],
                "monto_total": parsed["monto_total"],
                "moneda": parsed["moneda"],
                "metodo_extraccion": extraction["metodo"],
                "confianza": parsed["confianza"],
                "error": extraction.get("error"),
            }
            doc_id = insert_documento(args.db, doc_data)

            if doc_id and not extraction.get("error"):
                # 4. Guardar cliente si tiene datos
                cliente_data = parsed["cliente"]
                if cliente_data.get("rfc") or cliente_data.get("telefono") or cliente_data.get("nombre"):
                    cliente_data["fecha"] = parsed["fecha"]
                    cliente_data["monto"] = parsed["monto_total"]
                    cliente_id = upsert_cliente(args.db, cliente_data)

                    # 5. Guardar productos
                    for prod in parsed["productos"]:
                        insert_producto(args.db, doc_id, cliente_id, prod)

                    # 6. Vincular documento-cliente
                    link_documento_cliente(args.db, doc_id, cliente_id)

                procesados += 1
            else:
                errores += 1

        except Exception as e:
            logger.error(f"Error procesando {pdf_info['nombre']}: {e}")
            # Guardar documento con error
            insert_documento(args.db, {
                "ruta": ruta,
                "nombre_archivo": pdf_info["nombre"],
                "carpeta": pdf_info["carpeta"],
                "metodo_extraccion": "fallido",
                "confianza": 0,
                "error": str(e),
            })
            errores += 1

        print_progress(i + 1, total, start_time)

    # Actualizar clasificaciones al final
    actualizar_clasificaciones(args.db)

    elapsed = time.time() - start_time
    print(f"\nCompletado en {elapsed:.1f}s: {procesados} procesados, {errores} errores, {omitidos} omitidos")


def cmd_report(args: argparse.Namespace) -> None:
    """Comando: genera reportes CSV y resumen.

    Args:
        args: Argumentos del CLI.
    """
    generate_report(args.db, args.output)
    print(f"\nReportes generados en {args.output}/")


def cmd_sync(args: argparse.Namespace) -> None:
    """Comando: sincroniza clientes al CRM.

    Args:
        args: Argumentos del CLI.
    """
    resultado = sync_to_crm(args.db, args.crm, args.modo)

    if args.modo == "preview":
        print(f"\n[PREVIEW] No se realizaron cambios")
    else:
        print(f"\nResultado: {resultado['importados']} importados, "
              f"{resultado['actualizados']} actualizados, "
              f"{resultado.get('enriquecidos', 0)} enriquecidos, "
              f"{resultado['duplicados']} duplicados, "
              f"{resultado['errores']} errores")


def cmd_enrich(args: argparse.Namespace) -> None:
    """Comando: enriquece clientes existentes del CRM con datos del PDF analyzer.

    Args:
        args: Argumentos del CLI.
    """
    modo = "preview" if args.preview else "enrich"
    resultado = sync_to_crm(args.db, args.crm, modo)

    if args.preview:
        print(f"\n[PREVIEW] No se realizaron cambios")
    else:
        print(f"\nEnriquecimiento: {resultado.get('enriquecidos', 0)} clientes enriquecidos, "
              f"{resultado['errores']} errores")


def cmd_full(args: argparse.Namespace) -> None:
    """Comando: ejecuta pipeline completo (scan → process → report).

    Args:
        args: Argumentos del CLI.
    """
    logger = logging.getLogger("full")

    logger.info("=== PASO 1/3: Escaneando ===")
    cmd_scan(args)

    logger.info("=== PASO 2/3: Procesando ===")
    cmd_process(args)

    logger.info("=== PASO 3/3: Generando reportes ===")
    cmd_report(args)

    print("\nPipeline completo. Revisa los reportes en output/")
    print("Para sincronizar al CRM: python main.py sync --modo preview")


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

def main() -> None:
    """Punto de entrada principal del CLI."""
    base_dir = Path(__file__).parent

    parser = argparse.ArgumentParser(
        description="Analizador de PDFs para CRM de clientes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest="comando", help="Comando a ejecutar")

    # Flags heredados por todos los subcomandos
    parent = argparse.ArgumentParser(add_help=False)
    parent.add_argument("--db", default=str(base_dir / "data" / "analisis.db"),
                        help="Ruta a la base de datos SQLite")
    parent.add_argument("--output", default=str(base_dir / "output"),
                        help="Carpeta de salida para reportes")
    parent.add_argument("--crm", default=CRM_URL, help="URL del CRM")
    parent.add_argument("--verbose", action="store_true", help="Progreso detallado")

    # scan
    p_scan = subparsers.add_parser("scan", parents=[parent], help="Escanea carpeta y cuenta PDFs")
    p_scan.add_argument("--carpeta", required=True, help="Carpeta raíz con PDFs")

    # process
    p_process = subparsers.add_parser("process", parents=[parent], help="Procesa PDFs y extrae datos")
    p_process.add_argument("--carpeta", required=True, help="Carpeta raíz con PDFs")
    p_process.add_argument("--limite", type=int, default=None,
                           help="Límite de PDFs a procesar")

    # report
    subparsers.add_parser("report", parents=[parent], help="Genera reportes CSV y resumen")

    # sync
    p_sync = subparsers.add_parser("sync", parents=[parent], help="Sincroniza clientes al CRM")
    p_sync.add_argument("--modo", choices=["preview", "sync"], required=True,
                        help="preview=solo muestra, sync=ejecuta")

    # enrich
    p_enrich = subparsers.add_parser("enrich", parents=[parent], help="Enriquece clientes CRM con datos PDF")
    p_enrich.add_argument("--preview", action="store_true",
                          help="Solo mostrar que se actualizaria")

    # full
    p_full = subparsers.add_parser("full", parents=[parent], help="Pipeline completo: scan + process + report")
    p_full.add_argument("--carpeta", required=True, help="Carpeta raíz con PDFs")
    p_full.add_argument("--limite", type=int, default=None,
                        help="Límite de PDFs a procesar")

    args = parser.parse_args()

    if not args.comando:
        parser.print_help()
        sys.exit(1)

    setup_logging(
        getattr(args, "output", str(base_dir / "output")),
        getattr(args, "verbose", False),
    )

    commands = {
        "scan": cmd_scan,
        "process": cmd_process,
        "report": cmd_report,
        "sync": cmd_sync,
        "enrich": cmd_enrich,
        "full": cmd_full,
    }

    commands[args.comando](args)


if __name__ == "__main__":
    main()
