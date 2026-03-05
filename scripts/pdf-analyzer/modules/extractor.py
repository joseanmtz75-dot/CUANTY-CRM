"""Extracción de texto y tablas de archivos PDF."""

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Umbral mínimo de caracteres para considerar extracción exitosa
MIN_TEXT_LENGTH = 20


def extract_text(ruta_pdf: str) -> dict[str, Any]:
    """Extrae texto y tablas de un PDF usando cascada pdfplumber → pypdf.

    Args:
        ruta_pdf: Ruta absoluta al archivo PDF.

    Returns:
        Dict con texto, paginas, metodo, tiene_tablas, tablas, error.
    """
    result: dict[str, Any] = {
        "texto": "",
        "paginas": 0,
        "metodo": "fallido",
        "tiene_tablas": False,
        "tablas": [],
        "error": None,
    }

    ruta = Path(ruta_pdf)
    if not ruta.exists():
        result["error"] = "archivo_no_encontrado"
        return result

    # Intento 1: pdfplumber
    texto_plumber = _extraer_con_pdfplumber(ruta, result)
    if texto_plumber and len(texto_plumber) >= MIN_TEXT_LENGTH:
        result["texto"] = texto_plumber
        result["metodo"] = "pdfplumber"
        return result

    # Intento 2: pypdf como fallback
    texto_pypdf = _extraer_con_pypdf(ruta, result)
    if texto_pypdf and len(texto_pypdf) >= MIN_TEXT_LENGTH:
        result["texto"] = texto_pypdf
        result["metodo"] = "pypdf"
        return result

    # Ambos fallaron — marcar para OCR
    result["texto"] = texto_plumber or texto_pypdf or ""
    result["metodo"] = "requiere_ocr"
    logger.warning(f"Texto insuficiente en {ruta.name}, requiere OCR")

    return result


def _extraer_con_pdfplumber(ruta: Path, result: dict) -> str | None:
    """Intenta extraer texto y tablas con pdfplumber.

    Args:
        ruta: Path al PDF.
        result: Dict de resultado para actualizar paginas y tablas.

    Returns:
        Texto extraído o None si falla.
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber no instalado")
        return None

    try:
        with pdfplumber.open(str(ruta)) as pdf:
            result["paginas"] = len(pdf.pages)
            textos: list[str] = []
            todas_tablas: list[list] = []

            for i, page in enumerate(pdf.pages):
                try:
                    texto_pagina = page.extract_text() or ""
                    textos.append(texto_pagina)

                    tablas_pagina = page.extract_tables()
                    if tablas_pagina:
                        todas_tablas.extend(tablas_pagina)
                except Exception as e:
                    logger.warning(f"Error en página {i + 1} de {ruta.name}: {e}")
                    continue

            if todas_tablas:
                result["tiene_tablas"] = True
                result["tablas"] = todas_tablas

            return "\n".join(textos)

    except Exception as e:
        error_str = str(e).lower()
        if "password" in error_str or "encrypt" in error_str:
            result["error"] = "protegido"
            logger.warning(f"PDF protegido: {ruta.name}")
        else:
            logger.warning(f"pdfplumber falló en {ruta.name}: {e}")
        return None


def _extraer_con_pypdf(ruta: Path, result: dict) -> str | None:
    """Intenta extraer texto con pypdf como fallback.

    Args:
        ruta: Path al PDF.
        result: Dict de resultado para actualizar paginas.

    Returns:
        Texto extraído o None si falla.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        logger.error("pypdf no instalado")
        return None

    try:
        reader = PdfReader(str(ruta))
        result["paginas"] = len(reader.pages)
        textos: list[str] = []

        for i, page in enumerate(reader.pages):
            try:
                texto_pagina = page.extract_text() or ""
                textos.append(texto_pagina)
            except Exception as e:
                logger.warning(f"pypdf error en página {i + 1} de {ruta.name}: {e}")
                continue

        return "\n".join(textos)

    except Exception as e:
        error_str = str(e).lower()
        if "password" in error_str or "encrypt" in error_str:
            result["error"] = "protegido"
            logger.warning(f"PDF protegido (pypdf): {ruta.name}")
        else:
            logger.warning(f"pypdf falló en {ruta.name}: {e}")
        return None
