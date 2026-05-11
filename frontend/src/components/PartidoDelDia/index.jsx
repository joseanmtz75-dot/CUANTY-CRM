import { useEffect, useState, useCallback } from 'react';
import { getDailyPlan, getVendedores, logInteraction } from '../../api/clients';
import {
  distribuirEnInnings,
  calcularSiguienteFase,
  mapOutcomeToPayload,
  loadRecordSemana,
  appendToRecordSemana,
} from '../../utils/partidoEngine';
import Dugout from './Dugout';
import TurnoAlBat from './TurnoAlBat';
import EntreInnings from './EntreInnings';
import FinDelPartido from './FinDelPartido';
import './partido.css';

const LS_VENDEDOR_KEY = 'partido-vendedor-actual';

function loadVendedorActual() {
  try { return localStorage.getItem(LS_VENDEDOR_KEY) || ''; }
  catch { return ''; }
}

function saveVendedorActual(v) {
  try {
    if (v) localStorage.setItem(LS_VENDEDOR_KEY, v);
    else localStorage.removeItem(LS_VENDEDOR_KEY);
  } catch { /* ignore */ }
}

function fechaLegible() {
  const d = new Date();
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PartidoDelDia() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineup, setLineup] = useState([]);
  // innings vive como state mutable: las sustituciones reemplazan in-place sin
  // re-distribuir (queremos que el sustituto herede la posición del original).
  const [innings, setInnings] = useState([[], [], []]);
  const [state, setState] = useState({
    fase: 'dugout',
    inningActual: 0,
    turnoEnInning: 0,
    siguienteInning: null,
    resultados: [], // { clienteId, cliente, outcome, inning, timestamp, detalle }
    balks: [],      // { clienteId, cliente, resolution, timestamp }
    cambios: [],    // { clienteId, cliente, rolNuevo, rolPersonalizado, type, substituteId, timestamp }
    iniciadoEn: null,
  });
  const [recordSemana, setRecordSemana] = useState(() => loadRecordSemana());
  const [registrando, setRegistrando] = useState(false);
  const [currentVendedor, setCurrentVendedor] = useState(() => loadVendedorActual());
  const [vendedoresList, setVendedoresList] = useState([]);

  const totalTurnos = innings.reduce((acc, i) => acc + i.length, 0);

  const cargarLineup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyPlan(15, currentVendedor || null);
      const lista = data.listaDelDia || [];
      setLineup(lista);
      setInnings(distribuirEnInnings(lista));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLineup([]);
      setInnings([[], [], []]);
    } finally {
      setLoading(false);
    }
  }, [currentVendedor]);

  useEffect(() => { cargarLineup(); }, [cargarLineup]);

  useEffect(() => {
    getVendedores()
      .then(d => setVendedoresList(d.vendedores || []))
      .catch(() => setVendedoresList([]));
  }, []);

  const handleVendedorChange = (v) => {
    setCurrentVendedor(v);
    saveVendedorActual(v);
  };

  const clienteActual = (() => {
    if (state.fase !== 'turno') return null;
    return innings[state.inningActual]?.[state.turnoEnInning] || null;
  })();

  const handleIniciar = () => {
    const firstWithClients = innings.findIndex(g => g.length > 0);
    if (firstWithClients === -1) return;
    setState(s => ({
      ...s,
      fase: 'turno',
      inningActual: firstWithClients,
      turnoEnInning: 0,
      iniciadoEn: new Date().toISOString(),
    }));
  };

  const avanzarFase = (resultadosActualizados, balksActualizados) => {
    const next = calcularSiguienteFase({
      innings,
      inningActual: state.inningActual,
      turnoEnInning: state.turnoEnInning,
    });

    if (next.fase === 'fin') {
      const updatedRecord = appendToRecordSemana(resultadosActualizados);
      setRecordSemana(updatedRecord);
    }

    setState(s => ({
      ...s,
      resultados: resultadosActualizados,
      balks: balksActualizados,
      fase: next.fase,
      inningActual: next.inningActual,
      turnoEnInning: next.turnoEnInning,
      siguienteInning: next.siguienteInning ?? null,
    }));
  };

  const handleOutcome = async (outcome, opts = {}) => {
    if (!clienteActual || registrando) return;

    if (outcome === 'balk') {
      const balksActualizados = [
        ...state.balks,
        {
          clienteId: clienteActual.clientId,
          cliente: clienteActual,
          resolution: opts.resolution,
          timestamp: new Date().toISOString(),
        },
      ];
      avanzarFase(state.resultados, balksActualizados);
      return;
    }

    setRegistrando(true);
    const payload = mapOutcomeToPayload(outcome, clienteActual, opts);
    try {
      if (payload) {
        await logInteraction(clienteActual.clientId, payload);
      }
      const resultadosActualizados = [
        ...state.resultados,
        {
          clienteId: clienteActual.clientId,
          cliente: clienteActual,
          outcome,
          inning: state.inningActual,
          timestamp: new Date().toISOString(),
          detalle: payload?.nuevoEstatus ? `→ ${payload.nuevoEstatus}` : null,
        },
      ];
      avanzarFase(resultadosActualizados, state.balks);
    } catch (err) {
      alert('Error al registrar outcome: ' + (err.response?.data?.error || err.message));
    } finally {
      setRegistrando(false);
    }
  };

  // Cambio de bateador: reclasifica al actual + opcionalmente lo sustituye con otro
  // contacto de la misma empresa (existente o recién creado).
  const handleCambio = ({ type, substitute, rolNuevo, rolPersonalizado }) => {
    if (!clienteActual) return;
    const cambioEntry = {
      clienteId: clienteActual.clientId,
      cliente: clienteActual,
      rolNuevo,
      rolPersonalizado,
      type, // 'sustitucion' | 'crear' | 'skip'
      substituteId: substitute?.clientId || null,
      timestamp: new Date().toISOString(),
    };

    if (substitute) {
      // Reemplazar en innings IN-PLACE (mismo turno, sin avanzar — el sustituto batea ahora)
      setInnings(prev => prev.map((g, i) =>
        i === state.inningActual
          ? g.map((c, j) => j === state.turnoEnInning ? substitute : c)
          : g
      ));
      setState(s => ({
        ...s,
        cambios: [...s.cambios, cambioEntry],
      }));
    } else {
      // Skip turn: avanza al siguiente sin sumar al scoreboard
      const next = calcularSiguienteFase({
        innings,
        inningActual: state.inningActual,
        turnoEnInning: state.turnoEnInning,
      });
      if (next.fase === 'fin') {
        const updatedRecord = appendToRecordSemana(state.resultados);
        setRecordSemana(updatedRecord);
      }
      setState(s => ({
        ...s,
        cambios: [...s.cambios, cambioEntry],
        fase: next.fase,
        inningActual: next.inningActual,
        turnoEnInning: next.turnoEnInning,
        siguienteInning: next.siguienteInning ?? null,
      }));
    }
  };

  const handleSiguienteInning = () => {
    const next = state.siguienteInning ?? state.inningActual + 1;
    setState(s => ({
      ...s,
      fase: 'turno',
      inningActual: next,
      turnoEnInning: 0,
      siguienteInning: null,
    }));
  };

  // Pasar turno sin registrar nada: avanza fase sin tocar al cliente ni sumar al scoreboard.
  // Útil cuando el cliente ya no aplica para mí (ej: lo reasigné en una sesión anterior).
  const handlePasarTurno = () => {
    if (!clienteActual || registrando) return;
    const next = calcularSiguienteFase({
      innings,
      inningActual: state.inningActual,
      turnoEnInning: state.turnoEnInning,
    });
    if (next.fase === 'fin') {
      const updatedRecord = appendToRecordSemana(state.resultados);
      setRecordSemana(updatedRecord);
    }
    setState(s => ({
      ...s,
      fase: next.fase,
      inningActual: next.inningActual,
      turnoEnInning: next.turnoEnInning,
      siguienteInning: next.siguienteInning ?? null,
    }));
  };

  const handleCerrarPartido = () => {
    setState({
      fase: 'dugout',
      inningActual: 0,
      turnoEnInning: 0,
      siguienteInning: null,
      resultados: [],
      balks: [],
      cambios: [],
      iniciadoEn: null,
    });
    cargarLineup();
  };

  const handleClientUpdated = (updated) => {
    if (!updated) return;
    // Actualiza lineup y innings sin reorganizar posiciones
    const merger = (c) => c.clientId === updated.id
      ? {
          ...c,
          ...updated,
          clientId: c.clientId,
          // preservar campos del lineup que el PUT no devuelve
          priorityScore: c.priorityScore,
          disposicion: c.disposicion,
          razonSeleccion: c.razonSeleccion,
        }
      : c;
    setLineup(prev => prev.map(merger));
    setInnings(prev => prev.map(g => g.map(merger)));
  };

  const resultadosInning = state.resultados.filter(r => r.inning === state.inningActual);

  if (error) {
    return (
      <div className="pd-root pd-container">
        <div className="pd-empty-lineup" style={{ marginTop: 80 }}>
          <h3>No pudimos cargar tu lineup</h3>
          <p style={{ marginBottom: 16 }}>{error}</p>
          <button className="pd-btn-primary" onClick={cargarLineup}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-root">
      <div className="pd-container">
        {state.fase === 'dugout' && (
          <Dugout
            innings={innings}
            recordSemana={recordSemana}
            onIniciar={handleIniciar}
            totalTurnos={totalTurnos}
            loading={loading}
            fecha={fechaLegible()}
            vendedoresList={vendedoresList}
            currentVendedor={currentVendedor}
            onVendedorChange={handleVendedorChange}
          />
        )}

        {state.fase === 'turno' && clienteActual && (
          <TurnoAlBat
            cliente={clienteActual}
            inningActual={state.inningActual}
            turnoEnInning={state.turnoEnInning}
            totalEnInning={innings[state.inningActual]?.length || 0}
            totalTurnos={totalTurnos}
            resultados={state.resultados}
            onOutcome={handleOutcome}
            onClientUpdated={handleClientUpdated}
            onCambio={handleCambio}
            onPasarTurno={handlePasarTurno}
          />
        )}

        {state.fase === 'entre_innings' && (
          <EntreInnings
            inningCerrado={state.inningActual}
            resultadosInning={resultadosInning}
            siguienteInningIndex={state.siguienteInning ?? state.inningActual + 1}
            onSiguiente={handleSiguienteInning}
          />
        )}

        {state.fase === 'fin' && (
          <FinDelPartido
            lineup={lineup}
            resultados={state.resultados}
            balks={state.balks}
            cambios={state.cambios}
            onCerrar={handleCerrarPartido}
          />
        )}
      </div>
    </div>
  );
}

export function usePartidoPendientes() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let mounted = true;
    const vendedor = loadVendedorActual();
    getDailyPlan(15, vendedor || null)
      .then(d => { if (mounted) setCount((d.listaDelDia || []).length); })
      .catch(() => { if (mounted) setCount(0); });
    return () => { mounted = false; };
  }, []);
  return count;
}
