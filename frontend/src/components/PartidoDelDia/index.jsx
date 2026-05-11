import { useEffect, useState, useMemo, useCallback } from 'react';
import { getDailyPlan, logInteraction } from '../../api/clients';
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

function fechaLegible() {
  const d = new Date();
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PartidoDelDia() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineup, setLineup] = useState([]);
  const [state, setState] = useState({
    fase: 'dugout',
    inningActual: 0,
    turnoEnInning: 0,
    siguienteInning: null,
    resultados: [], // { clienteId, cliente, outcome, inning, timestamp, detalle }
    balks: [],      // { clienteId, cliente, resolution, timestamp }
    iniciadoEn: null,
  });
  const [recordSemana, setRecordSemana] = useState(() => loadRecordSemana());
  const [registrando, setRegistrando] = useState(false);

  const innings = useMemo(() => distribuirEnInnings(lineup), [lineup]);
  const totalTurnos = innings.reduce((acc, i) => acc + i.length, 0);

  const cargarLineup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyPlan(15);
      setLineup(data.listaDelDia || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLineup([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarLineup(); }, [cargarLineup]);

  const clienteActual = useMemo(() => {
    if (state.fase !== 'turno') return null;
    return innings[state.inningActual]?.[state.turnoEnInning] || null;
  }, [innings, state.fase, state.inningActual, state.turnoEnInning]);

  const handleIniciar = () => {
    // Primer inning con clientes
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
      // Persistir record semanal
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

    // Balk no crea Interaction (ya se manejó eliminar/reasignar en BalkPanel)
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

  const handleCerrarPartido = () => {
    // Reset y vuelve a Dugout. Se recarga el lineup por si hubo cambios.
    setState({
      fase: 'dugout',
      inningActual: 0,
      turnoEnInning: 0,
      siguienteInning: null,
      resultados: [],
      balks: [],
      iniciadoEn: null,
    });
    cargarLineup();
  };

  const handleClientUpdated = (updated) => {
    if (!updated) return;
    setLineup(prev => prev.map(c => c.clientId === updated.id
      ? { ...c, ...updated, clientId: c.clientId, estatus: updated.estatus ?? c.estatus, nextActionNote: updated.nextActionNote ?? c.nextActionNote, vendedor: updated.vendedor ?? c.vendedor }
      : c
    ));
  };

  // Resultados del inning actual (para EntreInnings)
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
            onCerrar={handleCerrarPartido}
          />
        )}
      </div>
    </div>
  );
}

export function usePartidoPendientes() {
  // Hook auxiliar para el badge del Sidebar: cuenta turnos pendientes en el daily-plan
  const [count, setCount] = useState(null);
  useEffect(() => {
    let mounted = true;
    getDailyPlan(15)
      .then(d => { if (mounted) setCount((d.listaDelDia || []).length); })
      .catch(() => { if (mounted) setCount(0); });
    return () => { mounted = false; };
  }, []);
  return count;
}
