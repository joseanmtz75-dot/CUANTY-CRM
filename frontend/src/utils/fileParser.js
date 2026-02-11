import * as XLSX from 'xlsx';
import { formatName, formatPhone } from './formatters';

const COLUMN_PATTERNS = {
  nombre: /nombre|name|full.?name|contact/i,
  telefono: /telefono|teléfono|phone|tel|mobile|celular|cel/i,
  email: /email|correo|e-mail|mail/i,
  empresa: /empresa|company|org|compañ[ií]a/i,
};

function autoMapColumns(headers) {
  const mapping = {};
  for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
    const index = headers.findIndex(h => pattern.test(String(h).trim()));
    if (index !== -1) {
      mapping[field] = index;
    }
  }
  return mapping;
}

function decodeBuffer(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function parseRows(rows) {
  if (rows.length < 2) {
    throw new Error('El archivo no contiene datos suficientes');
  }

  const headers = rows[0].map(h => String(h || '').trim());
  const mapping = autoMapColumns(headers);

  if (mapping.nombre === undefined && mapping.telefono === undefined) {
    throw new Error(
      'No se encontraron columnas reconocibles. Asegúrate de que el archivo tenga columnas como "Nombre", "Teléfono", "Email", "Empresa".'
    );
  }

  const clients = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const client = {
      nombre: mapping.nombre !== undefined ? formatName(row[mapping.nombre]) : '',
      telefono: mapping.telefono !== undefined ? formatPhone(row[mapping.telefono]) : '',
      email: mapping.email !== undefined ? String(row[mapping.email] || '').trim() : '',
      empresa: mapping.empresa !== undefined ? String(row[mapping.empresa] || '').trim() : '',
    };

    if (client.nombre || client.telefono) {
      clients.push(client);
    }
  }

  return { headers, clients, columnMapping: mapping };
}

function parseExcelOrCSV(data) {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return parseRows(rows);
}

function parseVCF(text) {
  const cards = text.split(/BEGIN:VCARD/i).filter(c => c.trim());
  const clients = [];

  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    let nombre = '';
    let telefono = '';
    let email = '';
    let empresa = '';
    let cellPhone = '';
    let anyPhone = '';

    for (const line of lines) {
      const upper = line.toUpperCase();

      if (upper.startsWith('FN:') || upper.startsWith('FN;')) {
        nombre = formatName(line.substring(line.indexOf(':') + 1));
      } else if (upper.startsWith('TEL')) {
        const value = line.substring(line.indexOf(':') + 1).trim();
        if (!anyPhone) anyPhone = value;
        if (/CELL|MOBILE/i.test(line)) {
          cellPhone = value;
        }
      } else if (upper.startsWith('EMAIL')) {
        email = line.substring(line.indexOf(':') + 1).trim();
      } else if (upper.startsWith('ORG')) {
        empresa = line.substring(line.indexOf(':') + 1).trim().replace(/;+$/, '');
      }
    }

    telefono = formatPhone(cellPhone || anyPhone);

    if (nombre || telefono) {
      clients.push({ nombre, telefono, email, empresa });
    }
  }

  return { clients };
}

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Error al leer el archivo'));

    if (ext === 'vcf') {
      reader.onload = (e) => {
        try {
          const text = decodeBuffer(e.target.result);
          const result = parseVCF(text);
          if (result.clients.length === 0) {
            reject(new Error('No se encontraron contactos en el archivo VCF'));
            return;
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === 'csv') {
      reader.onload = (e) => {
        try {
          const text = decodeBuffer(e.target.result);
          const workbook = XLSX.read(text, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const result = parseRows(rows);
          if (result.clients.length === 0) {
            reject(new Error('No se encontraron contactos válidos en el archivo'));
            return;
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (['xlsx', 'xls'].includes(ext)) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const result = parseExcelOrCSV(data);
          if (result.clients.length === 0) {
            reject(new Error('No se encontraron contactos válidos en el archivo'));
            return;
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Formato no soportado: .${ext}. Usa archivos .xlsx, .csv o .vcf`));
    }
  });
}
