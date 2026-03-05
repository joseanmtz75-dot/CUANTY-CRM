# PDF Analyzer para CRM

Modulo de analisis de PDFs completamente local (sin APIs externas, sin LLMs, sin embeddings).
Escanea carpetas de PDFs (facturas, cotizaciones, ordenes), extrae datos de clientes y productos
usando regex, y los sincroniza con el CRM de clientes.

**Costo: $0** — todo se ejecuta localmente.

## Instalacion

```bash
cd scripts/pdf-analyzer
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

## Uso rapido

```bash
# Pipeline completo (escanear + procesar + reportar)
python main.py full --carpeta "C:/ruta/a/mis/pdfs"

# Con limite para pruebas
python main.py full --carpeta "C:/ruta/a/mis/pdfs" --limite 5
```

## Comandos disponibles

### scan — Escanear carpeta
Cuenta PDFs sin procesarlos. Util para verificar antes de procesar.

```bash
python main.py scan --carpeta "C:/ruta/a/pdfs"
python main.py scan --carpeta "C:/ruta/a/pdfs" --verbose
```

### process — Procesar PDFs
Extrae texto, detecta campos (cliente, RFC, telefono, productos, montos)
y almacena en SQLite local.

```bash
python main.py process --carpeta "C:/ruta/a/pdfs"
python main.py process --carpeta "C:/ruta/a/pdfs" --limite 100
```

- Si se interrumpe, se puede reanudar ejecutando el mismo comando (skip automatico de PDFs ya procesados)
- Progreso en tiempo real con barra de progreso

### report — Generar reportes
Genera archivos CSV y resumen en la carpeta `output/`.

```bash
python main.py report
```

Archivos generados:
- `output/reporte_clientes.csv` — Todos los clientes con metricas
- `output/reporte_productos.csv` — Productos por frecuencia
- `output/resumen.txt` — Resumen ejecutivo con top 10s

### sync — Sincronizar al CRM
Importa clientes al CRM de forma segura.

```bash
# Primero: ver que se importaria (sin hacer cambios)
python main.py sync --modo preview

# Luego: ejecutar la importacion
python main.py sync --modo sync
```

### full — Pipeline completo
Ejecuta scan + process + report en secuencia.

```bash
python main.py full --carpeta "C:/ruta/a/pdfs"
```

## Flags globales

| Flag | Default | Descripcion |
|------|---------|-------------|
| `--db` | `data/analisis.db` | Ruta a la base de datos SQLite |
| `--output` | `output/` | Carpeta de salida para reportes |
| `--crm` | `http://localhost:3001` | URL del CRM |
| `--verbose` | off | Muestra progreso detallado |

## Estructura de salida

```
output/
  reporte_clientes.csv    — RFC, nombre, empresa, telefono, compras, clasificacion
  reporte_productos.csv   — Producto, frecuencia, valor total
  resumen.txt             — Resumen ejecutivo
  proceso_YYYYMMDD_HHMMSS.log  — Log detallado del proceso

data/
  analisis.db             — Base de datos SQLite con todo el analisis
```

## Clasificacion de clientes

Los clientes se clasifican por recurrencia (cantidad de documentos):

| Clasificacion | Significado | Estatus CRM |
|---------------|-------------|-------------|
| **ALTO** | Percentil 75+ (cliente recurrente) | Negociando |
| **MEDIO** | Percentil 25-74 | Contactado |
| **BAJO** | Percentil 0-24 (cliente esporadico) | Nuevo |

Si hay menos de 10 clientes, se usan umbrales fijos: ALTO(8+ docs), MEDIO(3-7), BAJO(1-2).

## Troubleshooting

### "requiere_ocr" en muchos PDFs
PDFs escaneados (imagenes) no tienen texto extraible. Opciones:
1. Descomentar `pytesseract` y `pdf2image` en requirements.txt
2. Instalar Tesseract OCR en el sistema
3. Ignorar estos PDFs (el proceso continua sin crashear)

### PDFs protegidos
Los PDFs con contraseña se marcan con error="protegido" y se omiten.

### El proceso se interrumpio
Simplemente ejecuta el mismo comando otra vez. Los PDFs ya procesados se saltan automaticamente.

### Los CSVs se ven mal en Excel
Los archivos se generan con BOM UTF-8 para compatibilidad con Excel en Windows.
Si aun hay problemas, abre Excel > Datos > Desde texto/CSV y selecciona UTF-8.

### Error de conexion al CRM
Verifica que el backend este corriendo en el puerto correcto:
```bash
python main.py sync --modo sync --crm http://localhost:3001
```

## Dependencias

| Paquete | Version | Uso |
|---------|---------|-----|
| pdfplumber | 0.11.0 | Extraccion de texto y tablas |
| pypdf | 4.3.1 | Fallback de extraccion |
| sqlite3 | (stdlib) | Base de datos local |
| csv | (stdlib) | Generacion de reportes |
| re | (stdlib) | Deteccion de campos |
| urllib | (stdlib) | Comunicacion con CRM |

Requiere Python 3.10+. Compatible con Windows y Mac/Linux.
