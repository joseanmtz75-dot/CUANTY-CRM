"""Sincronización de clientes analizados con el CRM."""

import json
import logging
import urllib.request
import urllib.error
from datetime import datetime
from typing import Any

from modules.database import (
    get_clientes_para_crm, get_productos_cliente, marcar_importado,
)

logger = logging.getLogger(__name__)


def sync_to_crm(db_path: str, crm_url: str, modo: str) -> dict[str, int]:
    """Sincroniza clientes del análisis al CRM.

    Args:
        db_path: Ruta al archivo SQLite.
        crm_url: URL base del CRM (ej: http://localhost:3001).
        modo: "preview" para solo mostrar, "sync" para ejecutar, "enrich" para enriquecer todos.

    Returns:
        Dict con conteo de importados, actualizados, duplicados, errores.
    """
    solo_nuevos = modo != "enrich"
    clientes = get_clientes_para_crm(db_path, solo_nuevos=solo_nuevos)
    resultado = {"importados": 0, "actualizados": 0, "duplicados": 0, "errores": 0, "enriquecidos": 0}

    if not clientes:
        logger.info("No hay clientes nuevos para sincronizar")
        return resultado

    logger.info(f"{'[PREVIEW] ' if modo == 'preview' else ''}Clientes a sincronizar: {len(clientes)}")

    for cliente in clientes:
        try:
            productos = get_productos_cliente(db_path, cliente["id"])
            payload = _construir_payload(cliente, productos)

            if modo == "preview":
                _mostrar_preview(cliente, payload)
                continue

            if modo == "enrich":
                # Enrich mode: buscar por teléfono y actualizar campos vacíos + enriquecimiento
                telefono = cliente.get("telefono", "")
                if not telefono or telefono.startswith("0000"):
                    continue
                enriched = _enriquecer_cliente(crm_url, cliente, productos)
                if enriched:
                    resultado["enriquecidos"] += 1
                    logger.info(f"Enriquecido: {cliente.get('nombre', '')} → CRM ID {enriched}")
                continue

            # Intentar crear en el CRM
            crm_id = _crear_cliente_crm(crm_url, payload)

            if crm_id:
                # Crear interacción de historial
                _crear_interaccion_crm(crm_url, crm_id, cliente, productos)
                marcar_importado(db_path, cliente["id"], crm_id)
                resultado["importados"] += 1
                logger.info(f"Importado: {payload['nombre']} → CRM ID {crm_id}")
            else:
                resultado["errores"] += 1

        except _DuplicadoError as e:
            # Buscar cliente existente y actualizar
            try:
                crm_id = _buscar_y_actualizar(crm_url, cliente, productos, db_path)
                if crm_id:
                    resultado["actualizados"] += 1
                    logger.info(f"Actualizado: {cliente.get('nombre', '')} → CRM ID {crm_id}")
                else:
                    resultado["duplicados"] += 1
                    logger.warning(f"Duplicado no resuelto: {cliente.get('telefono', '')}")
            except Exception as update_err:
                logger.error(f"Error actualizando duplicado: {update_err}")
                resultado["errores"] += 1

        except Exception as e:
            logger.error(f"Error sincronizando cliente {cliente.get('nombre', '')}: {e}")
            resultado["errores"] += 1

    logger.info(
        f"Sincronización completada: {resultado['importados']} importados, "
        f"{resultado['actualizados']} actualizados, "
        f"{resultado['enriquecidos']} enriquecidos, "
        f"{resultado['duplicados']} duplicados, {resultado['errores']} errores"
    )
    return resultado


class _DuplicadoError(Exception):
    """Error cuando el teléfono ya existe en el CRM."""
    pass


def _construir_payload(cliente: dict, productos: list[dict]) -> dict[str, Any]:
    """Construye el payload para POST /clients.

    Args:
        cliente: Dict con datos del cliente del SQLite.
        productos: Lista de productos del cliente.

    Returns:
        Dict listo para enviar al CRM.
    """
    nombre = cliente.get("nombre") or cliente.get("empresa") or "Sin nombre"
    telefono = cliente.get("telefono") or ""

    # Si no hay teléfono, generar placeholder único
    if not telefono:
        telefono = f"0000{cliente['id']:06d}"

    top_prods = [p["descripcion"] for p in productos[:5]]
    prods_str = ", ".join(top_prods) if top_prods else ""

    return {
        "nombre": nombre,
        "telefono": telefono,
        "email": cliente.get("email") or "",
        "empresa": cliente.get("empresa") or "",
        "estatus": _clasificacion_a_estatus(cliente.get("clasificacion", "BAJO")),
        "rol": _detectar_rol(cliente, productos),
        "origen": "PDF Import",
        "notas": _construir_notas(cliente, productos),
        "clasificacion": cliente.get("clasificacion") or None,
        "productosFrecuentes": prods_str or None,
        "totalComprasPdf": float(cliente.get("total_compras", 0) or 0),
        "totalDocumentosPdf": int(cliente.get("total_documentos", 0) or 0),
    }


def _clasificacion_a_estatus(clasificacion: str) -> str:
    """Mapea clasificación de recurrencia a estatus del CRM.

    Args:
        clasificacion: ALTO, MEDIO o BAJO.

    Returns:
        Estatus del CRM.
    """
    mapeo = {"ALTO": "Negociando", "MEDIO": "Contactado", "BAJO": "Nuevo"}
    return mapeo.get(clasificacion, "Nuevo")


def _detectar_rol(cliente: dict, productos: list[dict]) -> str:
    """Detecta el rol del cliente basado en empresa y productos.

    Args:
        cliente: Dict con datos del cliente.
        productos: Lista de productos del cliente.

    Returns:
        Rol: empresa, distribuidor o compras.
    """
    nombre = cliente.get("nombre", "").lower()
    empresa = cliente.get("empresa", "").lower()

    # Si tiene empresa distinta del nombre
    if empresa and empresa != nombre and len(empresa) > 2:
        return "empresa"

    # Si productos incluyen tanque o cilindro → distribuidor
    keywords_distribuidor = ["tanque", "cilindro"]
    for prod in productos:
        desc = prod.get("descripcion", "").lower()
        for kw in keywords_distribuidor:
            if kw in desc:
                return "distribuidor"

    return "compras"


def _construir_notas(cliente: dict, productos: list[dict]) -> str:
    """Construye notas multilínea con resumen del análisis.

    Args:
        cliente: Dict con datos del cliente.
        productos: Lista de productos del cliente.

    Returns:
        String multilínea con notas.
    """
    fecha_hoy = datetime.now().strftime("%Y-%m-%d")
    total_docs = cliente.get("total_documentos", 0) or 0
    total_compras = cliente.get("total_compras", 0.0) or 0.0
    ticket = total_compras / total_docs if total_docs > 0 else 0.0

    top_prods = [p["descripcion"] for p in productos[:5]]
    prods_str = "\n".join(f"  - {p}" for p in top_prods) if top_prods else "  (ninguno detectado)"

    return (
        f"[Importado desde analisis PDF - {fecha_hoy}]\n"
        f"RFC: {cliente.get('rfc', '') or 'N/A'}\n"
        f"Direccion: {cliente.get('direccion', '') or 'N/A'}\n"
        f"Documentos encontrados: {total_docs}\n"
        f"Periodo: {cliente.get('primera_fecha', 'N/A')} → {cliente.get('ultima_fecha', 'N/A')}\n"
        f"Compras totales: ${total_compras:,.2f} MXN\n"
        f"Ticket promedio: ${ticket:,.2f} MXN\n"
        f"\n"
        f"Productos frecuentes:\n"
        f"{prods_str}"
    )


def _http_request(url: str, method: str = "GET", data: dict | None = None) -> dict | None:
    """Hace una request HTTP al CRM usando urllib.

    Args:
        url: URL completa.
        method: GET, POST o PUT.
        data: Dict para body JSON (POST/PUT).

    Returns:
        Dict parseado de la respuesta JSON, o None.
    """
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"} if body else {},
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        if "ya está registrado" in error_body or "teléfono" in error_body.lower():
            raise _DuplicadoError(error_body)
        logger.error(f"HTTP {e.code} en {method} {url}: {error_body}")
        return None
    except Exception as e:
        logger.error(f"Error en {method} {url}: {e}")
        return None


def _crear_cliente_crm(crm_url: str, payload: dict) -> int | None:
    """Crea un cliente en el CRM.

    Args:
        crm_url: URL base del CRM.
        payload: Dict con datos del cliente.

    Returns:
        ID del cliente creado o None.
    """
    result = _http_request(f"{crm_url}/clients", "POST", payload)
    if result and "id" in result:
        return result["id"]
    return None


def _crear_interaccion_crm(crm_url: str, crm_id: int, cliente: dict, productos: list[dict]) -> None:
    """Crea una interacción de historial en el CRM.

    Args:
        crm_url: URL base del CRM.
        crm_id: ID del cliente en el CRM.
        cliente: Dict con datos del cliente.
        productos: Lista de productos del cliente.
    """
    total_docs = cliente.get("total_documentos", 0) or 0
    top_3 = ", ".join(p["descripcion"] for p in productos[:3]) or "N/A"

    payload = {
        "tipo": "historial_pdf",
        "contenido": (
            f"Cliente importado desde analisis de {total_docs} PDFs. "
            f"Periodo: {cliente.get('primera_fecha', 'N/A')} a {cliente.get('ultima_fecha', 'N/A')}. "
            f"Productos principales: {top_3}"
        ),
        "resultado": "importado",
    }

    _http_request(f"{crm_url}/clients/{crm_id}/interactions", "POST", payload)


def _buscar_y_actualizar(crm_url: str, cliente: dict, productos: list[dict], db_path: str) -> int | None:
    """Busca cliente existente por teléfono y actualiza sus notas.

    Args:
        crm_url: URL base del CRM.
        cliente: Dict con datos del cliente local.
        productos: Lista de productos.
        db_path: Ruta al SQLite para marcar importado.

    Returns:
        CRM ID del cliente actualizado o None.
    """
    telefono = cliente.get("telefono", "")
    if not telefono:
        return None

    # Buscar en CRM
    encoded_tel = urllib.parse.quote(telefono)
    result = _http_request(f"{crm_url}/clients?search={encoded_tel}")

    if not result or not isinstance(result, list) or len(result) == 0:
        return None

    crm_client = result[0]
    crm_id = crm_client["id"]

    # Actualizar notas + enrichment fields
    notas_existentes = crm_client.get("notas", "") or ""
    notas_nuevas = _construir_notas(cliente, productos)
    notas_combinadas = f"{notas_existentes}\n\n{notas_nuevas}" if notas_existentes else notas_nuevas

    update_data = {"notas": notas_combinadas}

    # Fill empty fields
    if not crm_client.get("email") and cliente.get("email"):
        update_data["email"] = cliente["email"]
    if not crm_client.get("empresa") and cliente.get("empresa"):
        update_data["empresa"] = cliente["empresa"]

    # Enrichment fields
    if cliente.get("clasificacion"):
        update_data["clasificacion"] = cliente["clasificacion"]
    top_prods = [p["descripcion"] for p in productos[:5]]
    if top_prods:
        update_data["productosFrecuentes"] = ", ".join(top_prods)
    total_compras = float(cliente.get("total_compras", 0) or 0)
    if total_compras > 0:
        update_data["totalComprasPdf"] = total_compras
    total_docs = int(cliente.get("total_documentos", 0) or 0)
    if total_docs > 0:
        update_data["totalDocumentosPdf"] = total_docs

    _http_request(f"{crm_url}/clients/{crm_id}", "PUT", update_data)

    # Crear interacción
    _crear_interaccion_crm(crm_url, crm_id, cliente, productos)

    # Marcar importado
    marcar_importado(db_path, cliente["id"], crm_id)

    return crm_id


def _enriquecer_cliente(crm_url: str, cliente: dict, productos: list[dict]) -> int | None:
    """Busca cliente en CRM por teléfono y enriquece campos vacíos.

    Args:
        crm_url: URL base del CRM.
        cliente: Dict con datos del cliente local (SQLite).
        productos: Lista de productos del cliente.

    Returns:
        CRM ID del cliente enriquecido o None.
    """
    telefono = cliente.get("telefono", "")
    if not telefono:
        return None

    encoded_tel = urllib.parse.quote(telefono)
    result = _http_request(f"{crm_url}/clients?search={encoded_tel}")

    if not result or not isinstance(result, list) or len(result) == 0:
        return None

    crm_client = result[0]
    crm_id = crm_client["id"]

    # Build update payload: fill empty fields + always update enrichment fields
    update = {}

    # Fill empty CRM fields with PDF data
    if not crm_client.get("email") and cliente.get("email"):
        update["email"] = cliente["email"]
    if not crm_client.get("empresa") and cliente.get("empresa"):
        update["empresa"] = cliente["empresa"]

    # Always update enrichment fields
    clasificacion = cliente.get("clasificacion")
    if clasificacion:
        update["clasificacion"] = clasificacion

    top_prods = [p["descripcion"] for p in productos[:5]]
    if top_prods:
        update["productosFrecuentes"] = ", ".join(top_prods)

    total_compras = float(cliente.get("total_compras", 0) or 0)
    if total_compras > 0:
        update["totalComprasPdf"] = total_compras

    total_docs = int(cliente.get("total_documentos", 0) or 0)
    if total_docs > 0:
        update["totalDocumentosPdf"] = total_docs

    if not update:
        return None

    _http_request(f"{crm_url}/clients/{crm_id}", "PUT", update)
    return crm_id


def _mostrar_preview(cliente: dict, payload: dict) -> None:
    """Muestra preview de lo que se importaría.

    Args:
        cliente: Dict con datos del cliente local.
        payload: Payload que se enviaría al CRM.
    """
    print(f"\n{'-' * 50}")
    print(f"  Nombre:   {payload['nombre']}")
    print(f"  Telefono: {payload['telefono']}")
    print(f"  Empresa:  {payload.get('empresa', '')}")
    print(f"  RFC:      {cliente.get('rfc', '')}")
    print(f"  Clasif:   {payload.get('clasificacion', '')}")
    print(f"  Estatus:  {payload['estatus']}")
    print(f"  Rol:      {payload['rol']}")
    print(f"  Docs:     {cliente.get('total_documentos', 0)}")
    print(f"  Compras:  ${cliente.get('total_compras', 0.0):,.2f}")
    print(f"  Productos: {payload.get('productosFrecuentes', '') or 'N/A'}")


# Necesario para urllib.parse en _buscar_y_actualizar
import urllib.parse
