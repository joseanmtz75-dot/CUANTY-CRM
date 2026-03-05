"""SQLite local para almacenar resultados del análisis de PDFs."""

import sqlite3
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Commit batch size
BATCH_SIZE = 50


def _get_connection(db_path: str) -> sqlite3.Connection:
    """Crea conexión SQLite con PRAGMAs optimizados.

    Args:
        db_path: Ruta al archivo SQLite.

    Returns:
        Conexión SQLite configurada.
    """
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str) -> None:
    """Crea las tablas si no existen.

    Args:
        db_path: Ruta al archivo SQLite.
    """
    conn = _get_connection(db_path)
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS documentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ruta TEXT UNIQUE,
                nombre_archivo TEXT,
                carpeta TEXT,
                tipo_documento TEXT,
                numero_documento TEXT,
                fecha TEXT,
                monto_total REAL,
                moneda TEXT,
                metodo_extraccion TEXT,
                confianza INTEGER,
                procesado_en TEXT,
                error TEXT
            );

            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rfc TEXT,
                nombre TEXT,
                empresa TEXT,
                telefono TEXT,
                email TEXT,
                direccion TEXT,
                total_documentos INTEGER DEFAULT 0,
                total_compras REAL DEFAULT 0,
                primera_fecha TEXT,
                ultima_fecha TEXT,
                clasificacion TEXT,
                crm_id INTEGER,
                UNIQUE(rfc),
                UNIQUE(telefono)
            );

            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                documento_id INTEGER REFERENCES documentos(id),
                cliente_id INTEGER REFERENCES clientes(id),
                descripcion TEXT,
                cantidad REAL,
                unidad TEXT,
                precio_unitario REAL,
                subtotal REAL
            );

            CREATE TABLE IF NOT EXISTS documento_cliente (
                documento_id INTEGER REFERENCES documentos(id),
                cliente_id INTEGER REFERENCES clientes(id),
                PRIMARY KEY (documento_id, cliente_id)
            );
        """)
        conn.commit()
        logger.info(f"Base de datos inicializada: {db_path}")
    finally:
        conn.close()


def documento_ya_procesado(db_path: str, ruta: str) -> bool:
    """Verifica si un documento ya fue procesado sin error.

    Args:
        db_path: Ruta al archivo SQLite.
        ruta: Ruta del PDF a verificar.

    Returns:
        True si ya fue procesado exitosamente.
    """
    conn = _get_connection(db_path)
    try:
        row = conn.execute(
            "SELECT id, error FROM documentos WHERE ruta = ?", (ruta,)
        ).fetchone()
        return row is not None and not row["error"]
    finally:
        conn.close()


def insert_documento(db_path: str, datos: dict[str, Any]) -> int | None:
    """Inserta un documento, ignorando si la ruta ya existe.

    Args:
        db_path: Ruta al archivo SQLite.
        datos: Dict con campos del documento.

    Returns:
        ID del documento insertado o None si ya existía.
    """
    conn = _get_connection(db_path)
    try:
        cursor = conn.execute("""
            INSERT OR IGNORE INTO documentos
            (ruta, nombre_archivo, carpeta, tipo_documento, numero_documento,
             fecha, monto_total, moneda, metodo_extraccion, confianza, procesado_en, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        """, (
            datos.get("ruta"),
            datos.get("nombre_archivo"),
            datos.get("carpeta"),
            datos.get("tipo_documento"),
            datos.get("numero_documento"),
            datos.get("fecha"),
            datos.get("monto_total", 0.0),
            datos.get("moneda", "MXN"),
            datos.get("metodo_extraccion"),
            datos.get("confianza", 0),
            datos.get("error"),
        ))
        conn.commit()
        return cursor.lastrowid if cursor.rowcount > 0 else None
    finally:
        conn.close()


def upsert_cliente(db_path: str, datos: dict[str, Any]) -> int:
    """Inserta o actualiza un cliente por RFC o teléfono.

    Args:
        db_path: Ruta al archivo SQLite.
        datos: Dict con campos del cliente.

    Returns:
        ID del cliente (nuevo o existente).
    """
    conn = _get_connection(db_path)
    try:
        rfc = datos.get("rfc", "").strip()
        telefono = datos.get("telefono", "").strip()

        # Buscar existente por RFC o teléfono
        existente = None
        if rfc:
            existente = conn.execute(
                "SELECT id, total_documentos, total_compras, primera_fecha, ultima_fecha FROM clientes WHERE rfc = ?",
                (rfc,)
            ).fetchone()
        if not existente and telefono:
            existente = conn.execute(
                "SELECT id, total_documentos, total_compras, primera_fecha, ultima_fecha FROM clientes WHERE telefono = ?",
                (telefono,)
            ).fetchone()

        fecha = datos.get("fecha", "")
        monto = datos.get("monto", 0.0)

        if existente:
            # Actualizar acumulados
            nuevo_total_docs = existente["total_documentos"] + 1
            nuevo_total_compras = existente["total_compras"] + monto
            primera = existente["primera_fecha"]
            if fecha and (not primera or fecha < primera):
                primera = fecha
            ultima = existente["ultima_fecha"]
            if fecha and (not ultima or fecha > ultima):
                ultima = fecha

            conn.execute("""
                UPDATE clientes SET
                    nombre = COALESCE(NULLIF(?, ''), nombre),
                    empresa = COALESCE(NULLIF(?, ''), empresa),
                    email = COALESCE(NULLIF(?, ''), email),
                    direccion = COALESCE(NULLIF(?, ''), direccion),
                    total_documentos = ?,
                    total_compras = ?,
                    primera_fecha = ?,
                    ultima_fecha = ?
                WHERE id = ?
            """, (
                datos.get("nombre", ""),
                datos.get("empresa", ""),
                datos.get("email", ""),
                datos.get("direccion", ""),
                nuevo_total_docs,
                nuevo_total_compras,
                primera,
                ultima,
                existente["id"],
            ))
            conn.commit()
            return existente["id"]
        else:
            # Insertar nuevo
            cursor = conn.execute("""
                INSERT INTO clientes
                (rfc, nombre, empresa, telefono, email, direccion,
                 total_documentos, total_compras, primera_fecha, ultima_fecha)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """, (
                rfc or None,
                datos.get("nombre", ""),
                datos.get("empresa", ""),
                telefono or None,
                datos.get("email", ""),
                datos.get("direccion", ""),
                monto,
                fecha or None,
                fecha or None,
            ))
            conn.commit()
            return cursor.lastrowid
    finally:
        conn.close()


def insert_producto(db_path: str, documento_id: int, cliente_id: int, datos: dict[str, Any]) -> None:
    """Inserta un producto asociado a documento y cliente.

    Args:
        db_path: Ruta al archivo SQLite.
        documento_id: ID del documento.
        cliente_id: ID del cliente.
        datos: Dict con campos del producto.
    """
    conn = _get_connection(db_path)
    try:
        conn.execute("""
            INSERT INTO productos
            (documento_id, cliente_id, descripcion, cantidad, unidad, precio_unitario, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            documento_id,
            cliente_id,
            datos.get("descripcion", ""),
            datos.get("cantidad", 0.0),
            datos.get("unidad", ""),
            datos.get("precio_unitario", 0.0),
            datos.get("subtotal", 0.0),
        ))
        conn.commit()
    finally:
        conn.close()


def link_documento_cliente(db_path: str, documento_id: int, cliente_id: int) -> None:
    """Crea relación documento-cliente.

    Args:
        db_path: Ruta al archivo SQLite.
        documento_id: ID del documento.
        cliente_id: ID del cliente.
    """
    conn = _get_connection(db_path)
    try:
        conn.execute(
            "INSERT OR IGNORE INTO documento_cliente (documento_id, cliente_id) VALUES (?, ?)",
            (documento_id, cliente_id),
        )
        conn.commit()
    finally:
        conn.close()


def actualizar_clasificaciones(db_path: str) -> None:
    """Recalcula clasificación de todos los clientes.

    Usa percentiles si hay >= 10 clientes, umbrales fijos si < 10.

    Args:
        db_path: Ruta al archivo SQLite.
    """
    from config import UMBRAL_ALTO, UMBRAL_MEDIO

    conn = _get_connection(db_path)
    try:
        rows = conn.execute(
            "SELECT id, total_documentos FROM clientes ORDER BY total_documentos"
        ).fetchall()

        if not rows:
            return

        total = len(rows)

        if total >= 10:
            # Percentiles
            p25_idx = max(0, int(total * 0.25) - 1)
            p75_idx = min(total - 1, int(total * 0.75))
            umbral_bajo = rows[p25_idx]["total_documentos"]
            umbral_alto = rows[p75_idx]["total_documentos"]
            # Fallback si percentiles no discriminan
            if umbral_bajo == umbral_alto:
                umbral_bajo = UMBRAL_MEDIO
                umbral_alto = UMBRAL_ALTO
        else:
            umbral_bajo = UMBRAL_MEDIO
            umbral_alto = UMBRAL_ALTO

        for row in rows:
            docs = row["total_documentos"]
            if docs >= umbral_alto:
                clasificacion = "ALTO"
            elif docs >= umbral_bajo:
                clasificacion = "MEDIO"
            else:
                clasificacion = "BAJO"

            conn.execute(
                "UPDATE clientes SET clasificacion = ? WHERE id = ?",
                (clasificacion, row["id"]),
            )

        conn.commit()
        logger.info(f"Clasificaciones actualizadas para {total} clientes")
    finally:
        conn.close()


def get_metricas(db_path: str) -> dict[str, Any]:
    """Obtiene métricas generales del análisis.

    Args:
        db_path: Ruta al archivo SQLite.

    Returns:
        Dict con métricas de documentos, clientes y productos.
    """
    conn = _get_connection(db_path)
    try:
        docs_total = conn.execute("SELECT COUNT(*) as c FROM documentos").fetchone()["c"]
        docs_error = conn.execute("SELECT COUNT(*) as c FROM documentos WHERE error IS NOT NULL").fetchone()["c"]
        clientes_total = conn.execute("SELECT COUNT(*) as c FROM clientes").fetchone()["c"]
        clientes_alto = conn.execute("SELECT COUNT(*) as c FROM clientes WHERE clasificacion = 'ALTO'").fetchone()["c"]
        clientes_medio = conn.execute("SELECT COUNT(*) as c FROM clientes WHERE clasificacion = 'MEDIO'").fetchone()["c"]
        clientes_bajo = conn.execute("SELECT COUNT(*) as c FROM clientes WHERE clasificacion = 'BAJO'").fetchone()["c"]
        monto_total = conn.execute("SELECT COALESCE(SUM(monto_total), 0) as s FROM documentos").fetchone()["s"]
        fecha_min = conn.execute("SELECT MIN(fecha) as f FROM documentos WHERE fecha IS NOT NULL AND fecha != ''").fetchone()["f"]
        fecha_max = conn.execute("SELECT MAX(fecha) as f FROM documentos WHERE fecha IS NOT NULL AND fecha != ''").fetchone()["f"]

        return {
            "documentos_total": docs_total,
            "documentos_error": docs_error,
            "documentos_ok": docs_total - docs_error,
            "clientes_total": clientes_total,
            "clientes_alto": clientes_alto,
            "clientes_medio": clientes_medio,
            "clientes_bajo": clientes_bajo,
            "monto_total": monto_total,
            "fecha_min": fecha_min or "",
            "fecha_max": fecha_max or "",
        }
    finally:
        conn.close()


def get_clientes_para_crm(db_path: str, solo_nuevos: bool = True) -> list[dict]:
    """Obtiene clientes listos para sincronizar al CRM.

    Args:
        db_path: Ruta al archivo SQLite.
        solo_nuevos: Si True, solo retorna clientes sin crm_id.

    Returns:
        Lista de dicts con datos de cada cliente.
    """
    conn = _get_connection(db_path)
    try:
        query = "SELECT * FROM clientes"
        if solo_nuevos:
            query += " WHERE crm_id IS NULL"
        query += " ORDER BY total_documentos DESC"

        rows = conn.execute(query).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_productos_cliente(db_path: str, cliente_id: int) -> list[dict]:
    """Obtiene productos de un cliente.

    Args:
        db_path: Ruta al archivo SQLite.
        cliente_id: ID del cliente.

    Returns:
        Lista de dicts con descripcion y frecuencia.
    """
    conn = _get_connection(db_path)
    try:
        rows = conn.execute("""
            SELECT descripcion, COUNT(*) as veces, SUM(subtotal) as valor_total
            FROM productos
            WHERE cliente_id = ?
            GROUP BY descripcion
            ORDER BY veces DESC
        """, (cliente_id,)).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def marcar_importado(db_path: str, cliente_id: int, crm_id: int) -> None:
    """Marca un cliente como importado al CRM.

    Args:
        db_path: Ruta al archivo SQLite.
        cliente_id: ID local del cliente.
        crm_id: ID del cliente en el CRM.
    """
    conn = _get_connection(db_path)
    try:
        conn.execute(
            "UPDATE clientes SET crm_id = ? WHERE id = ?",
            (crm_id, cliente_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_top_clientes(db_path: str, limite: int = 10) -> list[dict]:
    """Obtiene top clientes por recurrencia.

    Args:
        db_path: Ruta al archivo SQLite.
        limite: Cantidad máxima a retornar.

    Returns:
        Lista de dicts con datos de clientes.
    """
    conn = _get_connection(db_path)
    try:
        rows = conn.execute(
            "SELECT * FROM clientes ORDER BY total_documentos DESC LIMIT ?",
            (limite,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_top_productos(db_path: str, limite: int = 10) -> list[dict]:
    """Obtiene top productos por frecuencia.

    Args:
        db_path: Ruta al archivo SQLite.
        limite: Cantidad máxima a retornar.

    Returns:
        Lista de dicts con métricas de productos.
    """
    conn = _get_connection(db_path)
    try:
        rows = conn.execute("""
            SELECT
                descripcion,
                COUNT(*) as veces_comprado,
                COUNT(DISTINCT cliente_id) as clientes_distintos,
                SUM(cantidad) as cantidad_total,
                SUM(subtotal) as valor_total,
                CASE WHEN COUNT(*) > 0 THEN SUM(subtotal) / COUNT(*) ELSE 0 END as ticket_promedio
            FROM productos
            GROUP BY descripcion
            ORDER BY veces_comprado DESC
            LIMIT ?
        """, (limite,)).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
