"""Detección y extracción de campos estructurados desde texto de PDF."""

import logging
import re
from typing import Any

from config import (
    RFC_MORAL, RFC_FISICA, TELEFONO_MX, RE_TELEFONO_MX, EMAIL,
    FECHA_SLASH, FECHA_TEXTO, MONTO, MONTO_MXN, NUMERO_DOCUMENTO,
    RE_NUM_OV, RE_NUM_PROPUESTA,
    RE_CLIENTE_PROPUESTA, RE_CLIENTE_FACTURA,
    RE_RFC_RECEPTOR, RE_BLOQUE_FACTURAR_A, RE_BLOQUE_FACTURAR_ENVIO,
    RE_BLOQUE_FACTURADO_A,
    KEYWORDS_FACTURA, KEYWORDS_COTIZACION, KEYWORDS_ORDEN_VENTA,
    PRODUCTOS_KEYWORDS, EMISORES_CONOCIDOS, TELEFONOS_EMISOR, MESES,
)

logger = logging.getLogger(__name__)


def parse_document(extraction_result: dict[str, Any]) -> dict[str, Any]:
    """Analiza el texto extraído y detecta campos estructurados.

    Args:
        extraction_result: Dict retornado por extractor.extract_text().

    Returns:
        Dict con tipo_documento, cliente, productos, montos, confianza, etc.
    """
    texto = extraction_result.get("texto", "")
    tablas = extraction_result.get("tablas", [])

    tipo_doc = _detectar_tipo(texto)

    resultado: dict[str, Any] = {
        "tipo_documento": tipo_doc,
        "numero_documento": _extraer_numero_documento(texto, tipo_doc),
        "fecha": _extraer_fecha(texto),
        "cliente": {
            "nombre": "",
            "empresa": "",
            "rfc": "",
            "telefono": "",
            "email": "",
            "direccion": "",
        },
        "productos": [],
        "monto_total": 0.0,
        "moneda": "MXN",
        "confianza": 0,
        "campos_encontrados": [],
    }

    # Extraer campos del cliente según tipo de documento
    _extraer_cliente(texto, tipo_doc, resultado)

    # Extraer productos — tablas primero, luego regex
    if extraction_result.get("tiene_tablas") and tablas:
        resultado["productos"] = _extraer_productos_de_tablas(tablas)

    if not resultado["productos"]:
        resultado["productos"] = _extraer_productos_de_texto(texto)

    # Extraer monto total
    resultado["monto_total"] = _extraer_monto_total(texto)
    if resultado["monto_total"] > 0:
        resultado["campos_encontrados"].append("monto_total")

    # Calcular confianza
    resultado["confianza"] = _calcular_confianza(resultado)

    return resultado


def _detectar_tipo(texto: str) -> str:
    """Detecta el tipo de documento basado en keywords.

    Args:
        texto: Texto completo del PDF.

    Returns:
        Tipo: factura, cotizacion, orden_venta o desconocido.
    """
    texto_lower = texto.lower()

    scores = {
        "factura": sum(1 for kw in KEYWORDS_FACTURA if kw in texto_lower),
        "cotizacion": sum(1 for kw in KEYWORDS_COTIZACION if kw in texto_lower),
        "orden_venta": sum(1 for kw in KEYWORDS_ORDEN_VENTA if kw in texto_lower),
    }

    mejor = max(scores, key=scores.get)
    if scores[mejor] > 0:
        return mejor
    return "desconocido"


def _extraer_numero_documento(texto: str, tipo_doc: str) -> str:
    """Extrae número de documento según el tipo.

    Args:
        texto: Texto completo del PDF.
        tipo_doc: Tipo de documento detectado.

    Returns:
        Número de documento o cadena vacía.
    """
    if tipo_doc == "orden_venta":
        match = RE_NUM_OV.search(texto)
        if match:
            return match.group(1).strip()

    if tipo_doc == "cotizacion":
        match = RE_NUM_PROPUESTA.search(texto)
        if match:
            return match.group(1).strip()

    # Fallback genérico para factura y desconocido
    match = NUMERO_DOCUMENTO.search(texto)
    return match.group(1).strip() if match else ""


def _extraer_fecha(texto: str) -> str:
    """Extrae y normaliza fecha a formato YYYY-MM-DD.

    Args:
        texto: Texto completo del PDF.

    Returns:
        Fecha en formato YYYY-MM-DD o cadena vacía.
    """
    # Intentar formato texto: "15 de marzo de 2024"
    match_texto = FECHA_TEXTO.search(texto)
    if match_texto:
        dia = int(match_texto.group(1))
        mes = MESES.get(match_texto.group(2).lower(), 0)
        anio = int(match_texto.group(3))
        if mes > 0:
            return f"{anio:04d}-{mes:02d}-{dia:02d}"

    # Intentar formato DD/MM/YYYY o DD-MM-YYYY
    match_slash = FECHA_SLASH.search(texto)
    if match_slash:
        partes = re.split(r'[/\-]', match_slash.group(1))
        if len(partes) == 3:
            dia, mes_str, anio_str = partes
            dia_int = int(dia)
            mes_int = int(mes_str)
            anio_int = int(anio_str)
            if anio_int < 100:
                anio_int += 2000
            if 1 <= mes_int <= 12 and 1 <= dia_int <= 31:
                return f"{anio_int:04d}-{mes_int:02d}-{dia_int:02d}"

    return ""


def _extraer_cliente(texto: str, tipo_doc: str, resultado: dict) -> None:
    """Extrae datos del cliente/receptor según tipo de documento.

    Lógica:
    - cotizacion: "Attention to:" → nombre
    - orden_venta: bloque "Facturar a:" → empresa + RFC, "Envío a:" → teléfono
    - factura: bloque "Facturado a:" → nombre + RFC
    - desconocido: fallback genérico

    Filtra emisores conocidos (MAKO INTERNACIONAL).

    Args:
        texto: Texto completo del PDF.
        tipo_doc: Tipo de documento detectado.
        resultado: Dict de resultado donde se almacenan los datos.
    """
    cliente = resultado["cliente"]
    campos = resultado["campos_encontrados"]

    if tipo_doc == "cotizacion":
        _extraer_cliente_cotizacion(texto, cliente, campos)
    elif tipo_doc == "orden_venta":
        _extraer_cliente_orden_venta(texto, cliente, campos)
    elif tipo_doc == "factura":
        _extraer_cliente_factura(texto, cliente, campos)
    else:
        _extraer_cliente_generico(texto, cliente, campos)

    # Extraer email (común a todos los tipos)
    email_match = EMAIL.search(texto.lower())
    if email_match:
        cliente["email"] = email_match.group(1).lower().strip()
        if "email" not in campos:
            campos.append("email")

    # Limpiar nombres duplicados concatenados
    cliente["nombre"] = _limpiar_nombre(cliente.get("nombre", ""))
    cliente["empresa"] = _limpiar_nombre(cliente.get("empresa", ""))

    # Filtrar emisores conocidos
    _filtrar_emisores(cliente, campos)

    # Filtrar clientes basura
    if not _es_cliente_valido(cliente):
        logger.debug(f"Cliente inválido filtrado: {cliente.get('nombre', '')}")
        for key in ["nombre", "empresa", "rfc", "telefono", "email", "direccion"]:
            cliente[key] = ""
        campos.clear()


def _extraer_cliente_cotizacion(texto: str, cliente: dict, campos: list) -> None:
    """Extrae cliente de cotización/propuesta ("Attention to:").

    Args:
        texto: Texto completo del PDF.
        cliente: Dict del cliente a llenar.
        campos: Lista de campos encontrados.
    """
    match = RE_CLIENTE_PROPUESTA.search(texto)
    if match:
        nombre = match.group(1).strip()
        if nombre:
            cliente["nombre"] = nombre
            campos.append("nombre")


def _extraer_cliente_orden_venta(texto: str, cliente: dict, campos: list) -> None:
    """Extrae cliente de orden de venta ("Facturar a:" + "Envío a:").

    El formato típico es:
        Facturar a: Envío a:
        EMPRESA_FACTURAR    CONTACTO +52 1 XXX XXX XXXX
        DIRECCIÓN_1         EMPRESA_ENVIO
        CIUDAD, ESTADO      DIRECCIÓN_ENVIO
        México RFC: XXXXX   CIUDAD
                            México

    Args:
        texto: Texto completo del PDF.
        cliente: Dict del cliente a llenar.
        campos: Lista de campos encontrados.
    """
    # Intentar bloque combinado "Facturar a: Envío a:" (en misma línea)
    bloque = RE_BLOQUE_FACTURAR_ENVIO.search(texto)
    if bloque:
        bloque_texto = bloque.group(1).strip()
        lineas = bloque_texto.split("\n")

        if lineas:
            # Primera línea contiene empresa facturar + contacto envío
            primera = lineas[0].strip()

            # Buscar teléfono en primera línea (está junto al contacto de envío)
            _extraer_telefono(primera, cliente, campos)

            # La empresa está al inicio de la primera línea
            # Si hay teléfono, el nombre de empresa es lo que está antes del contacto
            # Típicamente: "DISTRIBUIDORA DE GAS NOEL HECTOR TALAVERA TORRES +52 1 449 257 4120"
            # Necesitamos separar empresa del contacto
            tel_match = RE_TELEFONO_MX.search(primera)
            if tel_match:
                before_tel = primera[:tel_match.start()].strip()

                # El nombre de empresa se repite en línea 2 (lado Envío a)
                # Formato línea 2: "DIRECCIÓN_FACTURAR  EMPRESA_ENVIO"
                # Si la empresa aparece en líneas posteriores, usarla para cortar
                empresa = before_tel
                for linea in lineas[1:3]:
                    # Buscar el nombre de empresa que aparece en before_tel
                    # y también se repite en esta línea
                    words_before = before_tel.split()
                    for end_idx in range(len(words_before), 1, -1):
                        candidate = " ".join(words_before[:end_idx])
                        if candidate in linea:
                            empresa = candidate
                            break
                    if empresa != before_tel:
                        break

                cliente["empresa"] = empresa
                cliente["nombre"] = empresa
                campos.append("nombre")
            else:
                # Sin teléfono en primera línea, toda la línea es empresa
                if primera:
                    cliente["empresa"] = primera
                    cliente["nombre"] = primera
                    campos.append("nombre")

        # Buscar RFC en todo el bloque
        rfc_match = RE_RFC_RECEPTOR.search(bloque_texto)
        if rfc_match:
            rfc = rfc_match.group(1).strip().upper().replace(" ", "")
            if not _es_emisor(rfc=rfc):
                cliente["rfc"] = rfc
                campos.append("rfc")

        # Buscar dirección (líneas entre primera y RFC)
        dir_lineas = []
        for linea in lineas[1:]:
            linea_strip = linea.strip()
            if linea_strip and not linea_strip.upper().startswith("RFC") and "México" not in linea_strip:
                dir_lineas.append(linea_strip)
        if dir_lineas:
            cliente["direccion"] = ", ".join(dir_lineas[:2])

        return

    # Fallback: "Facturar a:" sin "Envío a:" en misma línea
    bloque = RE_BLOQUE_FACTURAR_A.search(texto)
    if bloque:
        lineas = bloque.group(1).strip().split("\n")
        if lineas:
            empresa = lineas[0].strip()
            if empresa:
                cliente["empresa"] = empresa
                cliente["nombre"] = empresa
                campos.append("nombre")

            bloque_texto = bloque.group(1)
            rfc_match = RE_RFC_RECEPTOR.search(bloque_texto)
            if rfc_match:
                rfc = rfc_match.group(1).strip().upper().replace(" ", "")
                if not _es_emisor(rfc=rfc):
                    cliente["rfc"] = rfc
                    campos.append("rfc")

    # Buscar teléfono en todo el texto como fallback
    _extraer_telefono(texto, cliente, campos)


def _extraer_cliente_factura(texto: str, cliente: dict, campos: list) -> None:
    """Extrae cliente de factura CFDI ("Facturado a:").

    Args:
        texto: Texto completo del PDF.
        cliente: Dict del cliente a llenar.
        campos: Lista de campos encontrados.
    """
    bloque = RE_BLOQUE_FACTURADO_A.search(texto)
    if bloque:
        bloque_texto = bloque.group(1).strip()
        lineas = bloque_texto.split("\n")

        # Primera línea = nombre
        if lineas:
            nombre = lineas[0].strip()
            # Limpiar si tiene "Facturado a:" en la misma línea
            nombre = re.sub(r'^Facturado\s+a\s*:\s*', '', nombre, flags=re.IGNORECASE).strip()
            if nombre:
                cliente["nombre"] = nombre
                campos.append("nombre")

        # RFC en el bloque
        rfc_match = RE_RFC_RECEPTOR.search(bloque_texto)
        if rfc_match:
            rfc = rfc_match.group(1).strip().upper().replace(" ", "")
            cliente["rfc"] = rfc
            campos.append("rfc")

        # Dirección
        dir_match = re.search(r'[Dd]irecci[oó]n\s*:\s*(.+?)(?:\n|RFC|$)', bloque_texto)
        if dir_match:
            cliente["direccion"] = dir_match.group(1).strip()

    else:
        # Fallback: buscar nombre con "Facturado a:" inline
        match = RE_CLIENTE_FACTURA.search(texto)
        if match:
            nombre = match.group(1).strip()
            if nombre:
                cliente["nombre"] = nombre
                campos.append("nombre")

        # Buscar RFC en todo el texto, tomar el que NO sea emisor
        _extraer_rfc_receptor(texto, cliente, campos)

    # Buscar teléfono
    _extraer_telefono(texto, cliente, campos)


def _extraer_cliente_generico(texto: str, cliente: dict, campos: list) -> None:
    """Extrae cliente con patrones genéricos (fallback).

    Args:
        texto: Texto completo del PDF.
        cliente: Dict del cliente a llenar.
        campos: Lista de campos encontrados.
    """
    texto_upper = texto.upper()

    # RFC — buscar todos y filtrar emisores
    _extraer_rfc_receptor(texto_upper, cliente, campos)

    # Teléfono
    _extraer_telefono(texto, cliente, campos)

    # Nombre/Empresa
    nombre_patterns = [
        re.compile(r'(?:cliente|razón social|razon social)[:\s]+([^\n]{3,60})', re.IGNORECASE),
        re.compile(r'(?:señor|sr\.?|sra\.?)[:\s]+([^\n]{3,60})', re.IGNORECASE),
    ]
    for pattern in nombre_patterns:
        match = pattern.search(texto)
        if match:
            nombre = match.group(1).strip().rstrip(".")
            if not _es_emisor(nombre=nombre):
                if re.search(r'\b(S\.?A\.?|S\.?C\.?|C\.?V\.?|S\.?\s*de\s*R\.?L\.?)\b', nombre, re.IGNORECASE):
                    cliente["empresa"] = nombre
                else:
                    cliente["nombre"] = nombre
                campos.append("nombre")
                break

    # Dirección
    dir_match = re.search(r'(?:dirección|direccion|domicilio)[:\s]+([^\n]{5,120})', texto, re.IGNORECASE)
    if dir_match:
        cliente["direccion"] = dir_match.group(1).strip()


def _extraer_telefono(texto: str, cliente: dict, campos: list) -> None:
    """Extrae y normaliza teléfono mexicano del texto.

    Normalización: quitar +52, espacios → últimos 10 dígitos.
    Ignora teléfonos del emisor (MAKO).

    Args:
        texto: Texto donde buscar.
        cliente: Dict del cliente a llenar.
        campos: Lista de campos encontrados.
    """
    if cliente.get("telefono"):
        return

    # Intentar formato +52 primero (buscar todos, filtrar emisor)
    for match in RE_TELEFONO_MX.finditer(texto):
        telefono = f"{match.group(1)}{match.group(2)}{match.group(3)}"
        if telefono not in TELEFONOS_EMISOR:
            cliente["telefono"] = telefono
            if "telefono" not in campos:
                campos.append("telefono")
            return

    # Fallback: formato con paréntesis o guiones
    for match in TELEFONO_MX.finditer(texto):
        digitos = f"{match.group(1)}{match.group(2)}{match.group(3)}"
        digitos = re.sub(r'\D', '', digitos)
        if len(digitos) >= 10:
            digitos = digitos[-10:]
        if digitos not in TELEFONOS_EMISOR:
            cliente["telefono"] = digitos
            if "telefono" not in campos:
                campos.append("telefono")
            return


def _extraer_rfc_receptor(texto: str, cliente: dict, campos: list) -> None:
    """Extrae RFC del receptor, filtrando emisores conocidos.

    Args:
        texto: Texto donde buscar.
        cliente: Dict del cliente a llenar.
        campos: Lista de campos encontrados.
    """
    if cliente.get("rfc"):
        return

    texto_upper = texto.upper()

    # Buscar todos los RFC con formato "RFC: XXX..."
    for match in RE_RFC_RECEPTOR.finditer(texto):
        rfc = match.group(1).strip().upper().replace(" ", "")
        if not _es_emisor(rfc=rfc):
            cliente["rfc"] = rfc
            if "rfc" not in campos:
                campos.append("rfc")
            return

    # Fallback: buscar RFC sueltos
    for pattern in [RFC_MORAL, RFC_FISICA]:
        for match in pattern.finditer(texto_upper):
            rfc = match.group(1).strip()
            if not _es_emisor(rfc=rfc):
                cliente["rfc"] = rfc
                if "rfc" not in campos:
                    campos.append("rfc")
                return


def _es_emisor(nombre: str = "", rfc: str = "") -> bool:
    """Verifica si un nombre o RFC pertenece a un emisor conocido.

    Args:
        nombre: Nombre a verificar.
        rfc: RFC a verificar.

    Returns:
        True si es emisor conocido.
    """
    nombre_upper = nombre.upper().strip()
    rfc_upper = rfc.upper().strip()

    for emisor in EMISORES_CONOCIDOS:
        emisor_upper = emisor.upper()
        if nombre_upper and emisor_upper in nombre_upper:
            return True
        if rfc_upper and rfc_upper == emisor_upper:
            return True
    return False


def _limpiar_nombre(nombre: str) -> str:
    """Detecta y elimina nombres duplicados concatenados."""
    nombre = nombre.strip()
    if not nombre:
        return nombre
    mid = len(nombre) // 2
    for offset in range(-2, 3):
        pos = mid + offset
        if pos < 1 or pos >= len(nombre):
            continue
        left = nombre[:pos].strip()
        right = nombre[pos:].strip()
        if left and left == right:
            return left
    return nombre


def _es_cliente_valido(cliente: dict) -> bool:
    """Valida que el cliente tenga datos reales, no basura."""
    nombre = cliente.get("nombre", "").strip()
    empresa = cliente.get("empresa", "").strip()
    rfc = cliente.get("rfc", "").strip()
    telefono = cliente.get("telefono", "").strip()

    # RFC válido (12-13 chars) o teléfono 10 dígitos = válido
    if rfc and len(rfc) >= 12:
        return True
    if telefono and len(telefono) >= 10:
        return True

    texto = nombre or empresa
    if not texto:
        return False

    # Rechazar RFC suelto usado como nombre
    if re.match(r'^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$', texto):
        return False
    # Rechazar texto que empieza con minúscula (frase genérica)
    if texto[0].islower():
        return False
    # Rechazar muy corto o muy largo
    if len(texto) < 4 or len(texto) > 80:
        return False
    # Rechazar patrones basura
    basura = ["sin nombre", "rfc:", "n/a", "---", "por sueldos", "más tardar", "a más"]
    if any(b in texto.lower() for b in basura):
        return False

    return True


def _filtrar_emisores(cliente: dict, campos: list) -> None:
    """Limpia datos del cliente si resulta ser un emisor conocido.

    Args:
        cliente: Dict del cliente a verificar.
        campos: Lista de campos encontrados.
    """
    nombre = cliente.get("nombre", "")
    empresa = cliente.get("empresa", "")
    rfc = cliente.get("rfc", "")

    if _es_emisor(nombre=nombre, rfc=rfc) or _es_emisor(nombre=empresa, rfc=rfc):
        logger.debug(f"Emisor conocido detectado como cliente, limpiando: {nombre or empresa} / {rfc}")
        cliente["nombre"] = ""
        cliente["empresa"] = ""
        cliente["rfc"] = ""
        cliente["telefono"] = ""
        cliente["direccion"] = ""
        # Limpiar campos
        for field in ["nombre", "rfc", "telefono"]:
            while field in campos:
                campos.remove(field)


def _extraer_productos_de_tablas(tablas: list[list]) -> list[dict]:
    """Extrae productos de las tablas detectadas por pdfplumber.

    Soporta tablas con header explícito y tablas donde la primera
    columna es cantidad numérica y la segunda es descripción.

    Args:
        tablas: Lista de tablas, cada una es una lista de filas.

    Returns:
        Lista de dicts con descripcion, cantidad, unidad, precio_unitario, subtotal.
    """
    productos: list[dict] = []

    for tabla in tablas:
        if not tabla or len(tabla) < 2:
            continue

        # Intentar con header explícito primero
        header = tabla[0]
        if header:
            header_lower = [str(h).lower().strip() if h else "" for h in header]
            col_desc = _buscar_columna(header_lower, [
                "descripcion", "descripción", "concepto", "producto",
                "articulo", "artículo", "description",
            ])

            if col_desc is not None:
                productos.extend(_extraer_con_header(tabla, header_lower, col_desc))
                continue

        # Fallback: tablas sin header — primera col numérica, segunda texto
        productos.extend(_extraer_sin_header(tabla))

    return productos


def _extraer_con_header(tabla: list, header_lower: list[str], col_desc: int) -> list[dict]:
    """Extrae productos de tabla con header identificado.

    Args:
        tabla: Tabla completa (incluyendo header).
        header_lower: Header en minúsculas.
        col_desc: Índice de la columna de descripción.

    Returns:
        Lista de productos extraídos.
    """
    col_cant = _buscar_columna(header_lower, ["cantidad", "cant", "cant.", "qty", "ordered"])
    col_unidad = _buscar_columna(header_lower, ["unidad", "und", "u.m.", "um", "uom"])
    col_precio = _buscar_columna(header_lower, [
        "precio", "p.u.", "p. u.", "precio unitario", "unit price",
        "price", "valor unitario", "costo",
    ])
    col_subtotal = _buscar_columna(header_lower, [
        "subtotal", "importe", "total", "monto", "amount",
        "delivered", "invoiced",
    ])

    productos: list[dict] = []
    for fila in tabla[1:]:
        if not fila or len(fila) <= col_desc:
            continue

        desc = str(fila[col_desc] or "").strip()
        if not desc or len(desc) < 2:
            continue

        productos.append({
            "descripcion": desc,
            "cantidad": _parse_float(fila[col_cant]) if col_cant is not None and col_cant < len(fila) else 0.0,
            "unidad": str(fila[col_unidad] or "").strip() if col_unidad is not None and col_unidad < len(fila) else "",
            "precio_unitario": _parse_float(fila[col_precio]) if col_precio is not None and col_precio < len(fila) else 0.0,
            "subtotal": _parse_float(fila[col_subtotal]) if col_subtotal is not None and col_subtotal < len(fila) else 0.0,
        })

    return productos


def _extraer_sin_header(tabla: list) -> list[dict]:
    """Extrae productos de tabla sin header explícito.

    Detecta filas donde primera columna es numérica (cantidad)
    y alguna columna contiene código de producto (SGP-, etc.).

    Args:
        tabla: Tabla completa.

    Returns:
        Lista de productos extraídos.
    """
    productos: list[dict] = []

    for fila in tabla:
        if not fila or len(fila) < 2:
            continue

        # Verificar si primera columna parece cantidad
        primera = str(fila[0] or "").strip()
        try:
            cantidad = float(primera.replace(",", ""))
        except (ValueError, TypeError):
            continue

        if cantidad <= 0:
            continue

        # Buscar columna con descripción de producto
        desc = ""
        precio = 0.0
        subtotal = 0.0

        for i, celda in enumerate(fila[1:], 1):
            celda_str = str(celda or "").strip()
            if not celda_str:
                continue

            celda_lower = celda_str.lower()
            # Si contiene keyword de producto o código SGP
            es_producto = any(kw in celda_lower for kw in PRODUCTOS_KEYWORDS)
            es_codigo = bool(re.match(r'[A-Z]{2,5}-', celda_str))

            if (es_producto or es_codigo) and not desc:
                desc = celda_str
            elif not desc and len(celda_str) > 10 and not celda_str.replace(",", "").replace(".", "").isdigit():
                desc = celda_str

        if desc:
            # Últimas columnas numéricas = precio y subtotal
            nums = []
            for celda in reversed(fila[1:]):
                val = _parse_float(celda)
                if val > 0:
                    nums.append(val)
                if len(nums) >= 2:
                    break

            if len(nums) >= 2:
                subtotal = nums[0]
                precio = nums[1]
            elif len(nums) == 1:
                subtotal = nums[0]

            productos.append({
                "descripcion": desc,
                "cantidad": cantidad,
                "unidad": "",
                "precio_unitario": precio,
                "subtotal": subtotal,
            })

    return productos


def _extraer_productos_de_texto(texto: str) -> list[dict]:
    """Extrae productos mencionados por keywords en el texto.

    Args:
        texto: Texto completo del PDF.

    Returns:
        Lista de dicts con descripcion básica de productos encontrados.
    """
    productos: list[dict] = []
    texto_lower = texto.lower()
    encontrados: set[str] = set()

    for keyword in PRODUCTOS_KEYWORDS:
        if keyword in texto_lower and keyword not in encontrados:
            encontrados.add(keyword)
            precio = 0.0
            for linea in texto.split("\n"):
                if keyword in linea.lower():
                    montos = MONTO.findall(linea)
                    if montos:
                        valores = [_parse_float(m) for m in montos]
                        precio = max(valores)
                    break
            productos.append({
                "descripcion": keyword,
                "cantidad": 0.0,
                "unidad": "",
                "precio_unitario": precio,
                "subtotal": precio,
            })

    return productos


def _extraer_monto_total(texto: str) -> float:
    """Extrae el monto total del documento.

    Args:
        texto: Texto completo del PDF.

    Returns:
        Monto total como float, o 0.0 si no se encuentra.
    """
    # Buscar "Total" (no "Subtotal") para mayor precisión
    # Usar negative lookbehind para excluir "Subtotal"
    total_pattern = re.compile(r'(?<!Sub)total[:\s]*\$\s*([\d,]+\.?\d{0,2})', re.IGNORECASE)
    match = total_pattern.search(texto)
    if match:
        return _parse_float(match.group(1))

    # Fallback: buscar Subtotal si no hay Total
    subtotal_pattern = re.compile(r'Subtotal[:\s]*\$\s*([\d,]+\.?\d{0,2})', re.IGNORECASE)
    match_sub = subtotal_pattern.search(texto)
    if match_sub:
        return _parse_float(match_sub.group(1))

    # Fallback: buscar montos MXN
    match_mxn = MONTO_MXN.search(texto)
    if match_mxn:
        return _parse_float(match_mxn.group(1))

    # Último recurso: el monto más grande con $
    montos = MONTO.findall(texto)
    if montos:
        valores = [_parse_float(m) for m in montos]
        return max(valores)

    return 0.0


def _buscar_columna(header: list[str], opciones: list[str]) -> int | None:
    """Busca el índice de una columna por nombre en el header.

    Args:
        header: Lista de nombres de columnas en minúsculas.
        opciones: Posibles nombres a buscar.

    Returns:
        Índice de la columna o None.
    """
    for i, h in enumerate(header):
        for opcion in opciones:
            if opcion in h:
                return i
    return None


def _parse_float(valor: Any) -> float:
    """Convierte un valor a float, limpiando caracteres.

    Args:
        valor: Valor a convertir (str, int, float, None).

    Returns:
        Float parseado o 0.0.
    """
    if valor is None:
        return 0.0
    try:
        limpio = str(valor).replace("$", "").replace(",", "").replace(" ", "").strip()
        return float(limpio) if limpio else 0.0
    except (ValueError, TypeError):
        return 0.0


def _calcular_confianza(resultado: dict) -> int:
    """Calcula score de confianza basado en campos encontrados.

    Args:
        resultado: Dict completo del parseo.

    Returns:
        Score de 0 a 100.
    """
    campos = resultado["campos_encontrados"]
    score = 0

    if "rfc" in campos:
        score += 30
    if "telefono" in campos:
        score += 20
    if "nombre" in campos:
        score += 20
    if "email" in campos:
        score += 10
    if "monto_total" in campos:
        score += 10
    if resultado["fecha"]:
        score += 10

    return min(score, 100)
