import { useMemo, useState } from "react";
import { AREAS } from "../data/seed";
import { useEvents } from "../lib/firestore";
import { db } from "../firebase";
import { writeBatch, doc } from "firebase/firestore";

function fmt(isoDate: string) {
  try { return new Date(isoDate).toLocaleString(); } catch { return "-"; }
}

export default function History() {
  const { events, loading } = useEvents();
  const [area, setArea] = useState("ALL");
  const [isProcessing, setIsProcessing] = useState(false);

  const filtered = useMemo(() => events.filter(e => area === "ALL" || e.area === area), [events, area]);

  function exportCSV() {
    if (filtered.length === 0) return alert("Nada para exportar.");
    
    const headers = ["Data", "Tipo", "Area", "Quem Realizou", "Resultado"];
    const rows = filtered.map(e => {
      const date = fmt(e.createdAt).replace(/,/g, " ");
      const type = e.type === "DRAW" ? "Sorteio" : "Indicação";
      const actor = e.actorDoctorName || "-";
      const result = e.resultDoctorName || "-";
      
      return `${date},${type},${e.area},${actor},${result}`;
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `historico_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function clearHistory() {
    if (events.length === 0) return;
    
    if (!confirm("TEM CERTEZA? Isso apagará TODO o histórico permanentemente.")) return;

    setIsProcessing(true);
    try {
      const chunkSize = 400;
      for (let i = 0; i < events.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = events.slice(i, i + chunkSize);
        
        chunk.forEach((event) => {
          const ref = doc(db, "events", event.id);
          batch.delete(ref);
        });

        await batch.commit();
      }
      alert("Histórico limpo com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao limpar histórico.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (loading) return <div className="card">Carregando histórico...</div>;

  return (
    <div className="stack">
      <div className="card">
        <div className="nav" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>Histórico</h1>
            <p className="muted" style={{ margin: 0 }}>{filtered.length} registros encontrados</p>
          </div>
          
          <div className="hstack">
            <button 
              className="btn" 
              onClick={exportCSV}
              disabled={filtered.length === 0}
            >
               Exportar Planilha
            </button>

            <button 
              className="btn danger" 
              onClick={clearHistory}
              disabled={events.length === 0 || isProcessing}
            >
              {isProcessing ? "Apagando..." : " Limpar Histórico"}
            </button>
          </div>
        </div>

        <div className="hr" />

        <div className="field">
          <label>Filtrar por Área</label>
          <select value={area} onChange={e => setArea(e.target.value)}>
            <option value="ALL">Todas</option>
            {/* ESCONDEMOS O INDICADOR AQUI TAMBÉM */}
            {AREAS.filter(a => a !== "Indicador").map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Área</th>
              <th>Quem Realizou</th>
              <th>Selecionado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td style={{ fontSize: 13, color: "#666" }}>{fmt(e.createdAt)}</td>
                <td><span className="badge">{e.type === "DRAW" ? "Sorteio" : "Indicação"}</span></td>
                <td>{e.area}</td>
                <td style={{ color: "#444" }}>{e.actorDoctorName}</td>
                <td><strong>{e.resultDoctorName}</strong></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>Nenhum registro encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}