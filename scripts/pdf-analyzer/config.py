"""Configuración central: patrones regex, keywords, umbrales y constantes."""

import re

# ═══════════════════════════════════════════════════════════════
# URL del CRM
# ═══════════════════════════════════════════════════════════════

CRM_URL = "http://localhost:3001"

# ═══════════════════════════════════════════════════════════════
# EMISORES CONOCIDOS (se ignoran como clientes/receptores)
# ═══════════════════════════════════════════════════════════════

EMISORES_CONOCIDOS: list[str] = [
    "MAKO INTERNACIONAL",
    "MIN030521IC1",
]

# Teléfonos del emisor a ignorar
TELEFONOS_EMISOR: list[str] = [
    "3336091092",
]

# ═══════════════════════════════════════════════════════════════
# PATRONES REGEX — CLIENTE POR TIPO DE DOCUMENTO
# ═══════════════════════════════════════════════════════════════

# Cotización/Propuesta — cliente en "Attention to:" (puede incluir numero + nombre)
RE_CLIENTE_PROPUESTA = re.compile(
    r'Attention\s+to\s*:\s*(.+?)(?:\n|$)', re.IGNORECASE
)

# Orden de venta — "Facturar a:" y "Envío a:" en misma línea como headers,
# datos en líneas siguientes. El bloque va de la línea después de los headers
# hasta encontrar "Forma de Pago" o línea con muchas columnas.
RE_BLOQUE_FACTURAR_ENVIO = re.compile(
    r'Facturar\s+a\s*:\s*Env[ií]o\s+a\s*:\s*\n(.*?)(?:Forma\s+de\s+Pago|Trasporte|Precio|\n\s*\n)',
    re.IGNORECASE | re.DOTALL
)

# Fallback: "Facturar a:" solo (sin "Envío a:" en misma línea)
RE_BLOQUE_FACTURAR_A = re.compile(
    r'Facturar\s+a\s*:\s*\n(.*?)(?:\n\s*\n|Env[ií]o\s+a|Forma\s+de\s+Pago|$)',
    re.IGNORECASE | re.DOTALL
)

# Factura CFDI — "Facturado a:" inline o bloque
RE_CLIENTE_FACTURA = re.compile(
    r'Facturado\s+a\s*:\s*(.+?)(?:\n|RFC|$)', re.IGNORECASE
)

RE_BLOQUE_FACTURADO_A = re.compile(
    r'Facturado\s+a\s*:\s*(.*?)(?:\n\s*\n|$)',
    re.IGNORECASE | re.DOTALL
)

# ═══════════════════════════════════════════════════════════════
# PATRONES REGEX — CAMPOS GENERALES
# ═══════════════════════════════════════════════════════════════

# RFC genérico (persona moral: 3 letras, física: 4 letras)
RFC_MORAL = re.compile(r'\b([A-ZÑ&]{3}\d{6}[A-Z0-9]{3})\b')
RFC_FISICA = re.compile(r'\b([A-ZÑ&]{4}\d{6}[A-Z0-9]{3})\b')

# RFC en bloque del receptor (después de "RFC:")
RE_RFC_RECEPTOR = re.compile(
    r'RFC\s*:\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})', re.IGNORECASE
)

# Teléfono mexicano con +52 o lada local
RE_TELEFONO_MX = re.compile(
    r'(?:\+52\s*1?\s*)?(\d{3})\s*(\d{3})\s*(\d{4})'
)

# Teléfono con paréntesis: (33) 3609 1092
TELEFONO_MX = re.compile(r'\(?(\d{2,3})\)?\s*(\d{3,4})[\s\-]?(\d{4})')

# Email
EMAIL = re.compile(r'([\w.\-]+@[\w.\-]+\.\w{2,})')

# Fechas — múltiples formatos
FECHA_SLASH = re.compile(r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b')
FECHA_TEXTO = re.compile(
    r'\b(\d{1,2})\s+de\s+'
    r'(enero|febrero|marzo|abril|mayo|junio|julio|agosto|'
    r'septiembre|octubre|noviembre|diciembre)\s+'
    r'(?:de\s+)?(\d{4})\b',
    re.IGNORECASE
)

# Total / Importe (con $, MXN, separadores de miles)
MONTO = re.compile(r'\$\s*([\d,]+\.?\d{0,2})')
MONTO_MXN = re.compile(r'([\d,]+\.?\d{0,2})\s*MXN')

# Número de documento — genérico (fallback)
NUMERO_DOCUMENTO = re.compile(
    r'(?:folio|factura|cotizaci[oó]n|presupuesto|pedido|remisi[oó]n|orden)[:\s#]*([A-Z0-9\-]+)',
    re.IGNORECASE
)

# Número de orden de venta (SO10270, OV123, F456)
RE_NUM_OV = re.compile(
    r'(?:Numero|Número)\s*:\s*(SO\d+|OV\d+|F\d+)', re.IGNORECASE
)

# Número de propuesta/cotización
RE_NUM_PROPUESTA = re.compile(
    r'(?:Number|Número|Numero)\s*:\s*(\d+)', re.IGNORECASE
)

# ═══════════════════════════════════════════════════════════════
# KEYWORDS POR TIPO DE DOCUMENTO
# ═══════════════════════════════════════════════════════════════

KEYWORDS_FACTURA: list[str] = [
    "facturado a:", "cfdi", "folio fiscal", "uuid", "sello digital",
    "comprobante fiscal", "timbre", "regimen fiscal",
]

KEYWORDS_COTIZACION: list[str] = [
    "commercial proposal", "cotización", "cotizacion", "attention to:",
    "vigencia", "presupuesto", "propuesta",
]

KEYWORDS_ORDEN_VENTA: list[str] = [
    "orden de venta", "numero:so", "facturar a:",
    "pedido", "remisión", "remision",
]

# ═══════════════════════════════════════════════════════════════
# PRODUCTOS — KEYWORDS
# ═══════════════════════════════════════════════════════════════

PRODUCTOS_KEYWORDS: list[str] = [
    "sgp-", "gas-par", "modulos", "display", "transductor",
    "encoder", "impresora", "autotanque", "volumen",
    "gas lp", "gas l.p.", "cilindro", "tanque",
    "regulador", "manguera", "válvula", "valvula",
    "instalación", "instalacion",
    "servicio técnico", "servicio tecnico",
    "renta de tanque", "suministro", "carga",
]

# ═══════════════════════════════════════════════════════════════
# UMBRALES DE CLASIFICACIÓN (fallback si < 10 clientes)
# ═══════════════════════════════════════════════════════════════

UMBRAL_ALTO: int = 8
UMBRAL_MEDIO: int = 3

# ═══════════════════════════════════════════════════════════════
# MESES EN ESPAÑOL (para parseo de fechas)
# ═══════════════════════════════════════════════════════════════

MESES: dict[str, int] = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}

# ═══════════════════════════════════════════════════════════════
# EXTRACCIÓN
# ═══════════════════════════════════════════════════════════════

MIN_TEXT_LENGTH: int = 20
MAX_PAGES_SEQUENTIAL: int = 10
