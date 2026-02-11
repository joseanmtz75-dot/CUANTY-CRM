// Shared helpers extracted from index.js

const { calcularTemperatura, generarSugerencias, diasDesde } = require('./followup-rules');

const LOWERCASE_WORDS = new Set(['de', 'del', 'los', 'las', 'y', 'e', 'el', 'la']);

function formatName(name) {
  if (!name) return '';
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned.split(' ').map((word, i) => {
    const lower = word.toLowerCase();
    if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

function formatPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.substring(3);
  else if (digits.length === 12 && digits.startsWith('52')) digits = digits.substring(2);
  if (digits.length === 10) {
    return `+52 ${digits.substring(0, 2)} ${digits.substring(2, 6)} ${digits.substring(6)}`;
  }
  return digits;
}

function enrichClient(client) {
  const temperatura = calcularTemperatura(client);
  const sugerencias = generarSugerencias(client);
  const diasSinContacto = diasDesde(client.ultimoContacto || client.createdAt);
  let diasVencido = 0;
  if (client.proximoContacto && new Date(client.proximoContacto) < new Date()) {
    diasVencido = diasDesde(client.proximoContacto);
  }
  return { ...client, temperatura, sugerencias, diasSinContacto, diasVencido };
}

module.exports = { formatName, formatPhone, enrichClient };
