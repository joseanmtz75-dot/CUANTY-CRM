"""Escaneo recursivo de carpetas para encontrar archivos PDF."""

import os
import logging
from pathlib import Path
from typing import Generator

logger = logging.getLogger(__name__)


def scan_folder(carpeta_raiz: str) -> Generator[dict, None, None]:
    """Escanea recursivamente una carpeta y genera info de cada PDF encontrado.

    Args:
        carpeta_raiz: Ruta a la carpeta raíz donde buscar PDFs.

    Yields:
        Dict con ruta, nombre, carpeta y tamanio_kb de cada PDF.
    """
    root_path = Path(carpeta_raiz)

    if not root_path.exists():
        logger.error(f"La carpeta no existe: {carpeta_raiz}")
        return

    if not root_path.is_dir():
        logger.error(f"La ruta no es una carpeta: {carpeta_raiz}")
        return

    total_encontrados = 0

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Ignorar carpetas ocultas
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        # Filtrar PDFs, ignorar archivos ocultos
        pdfs = [
            f for f in filenames
            if f.lower().endswith(".pdf") and not f.startswith(".")
        ]

        if not pdfs:
            continue

        # Ordenar por tamaño ascendente dentro de la carpeta
        carpeta = Path(dirpath)
        pdfs_con_tamanio = []
        for nombre in pdfs:
            ruta = carpeta / nombre
            try:
                tamanio_kb = int(ruta.stat().st_size / 1024)
            except OSError:
                tamanio_kb = 0
            pdfs_con_tamanio.append((nombre, ruta, tamanio_kb))

        pdfs_con_tamanio.sort(key=lambda x: x[2])

        for nombre, ruta, tamanio_kb in pdfs_con_tamanio:
            total_encontrados += 1
            yield {
                "ruta": str(ruta),
                "nombre": nombre,
                "carpeta": str(carpeta),
                "tamanio_kb": tamanio_kb,
            }

    logger.info(f"Total de PDFs encontrados: {total_encontrados}")
