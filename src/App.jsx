import React from "react";
import { Navigate, Route, Routes, Link, useNavigate, useLocation } from "react-router-dom";
import { useSession } from "./state/SessionContext";

import Login from "./pages/login";
import Identify from "./pages/Identify";
import Draw from "./pages/Draw";
import History from "./pages/History";
import Admin from "./pages/admin";

function TopNav() {
  const { mode, actor, logout } = useSession();
  const nav = useNavigate();

  return (
    <div className="nav">
      <div className="nav-left">
        
        <Link className="btn" to="/draw">Sorteio/Indicação</Link>
        
        {mode === "admin" && (
          <Link className="btn" to="/history">Histórico</Link>
        )}
        
        {mode === "admin" && (
          <Link className="btn" to="/admin">Admin</Link>
        )}
      </div>
      
      <div className="nav-right">
        <span className="badge">{mode ? `modo: ${mode}` : "sem sessão"}</span>
        {actor?.doctorName && <span className="badge">ator: {actor.doctorName}</span>}
        <button className="btn" onClick={() => { logout(); nav("/login"); }}>
          Sair
        </button>
      </div>
    </div>
  );
}

function Guard({ children, requireMode }) {
  // 1. loadingSession do contexto
  const { mode, actor, loadingSession } = useSession();
  const location = useLocation();

  // 2. Se o Firebase ainda estiver verificando o usuário, mostramos um "Carregando..."
  
  if (loadingSession) {
    return <div className="card" style={{ padding: "20px", textAlign: "center" }}>Carregando sessão...</div>;
  }

  // 3. Lógica original: Sem login -> Vai para Login
  if (!mode) return <Navigate to="/login" replace />;

  // 4. Se a rota exige um modo específico (ex: admin) e o usuário não tem
  if (requireMode && mode !== requireMode) {
    return <Navigate to="/draw" replace />;
  }

  // 5. Se for médico mas ainda não se identificou (não escolheu quem é)
  if (mode === "medicos" && !actor && location.pathname !== "/identify") {
    return <Navigate to="/identify" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="container">
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/identify" element={
          <Guard>
            <TopNav />
            <Identify />
          </Guard>
        } />

        <Route path="/draw" element={
          <Guard>
            <TopNav />
            <Draw />
          </Guard>
        } />

        <Route path="/history" element={
          <Guard requireMode="admin">
            <TopNav />
            <History />
          </Guard>
        } />

        <Route path="/admin" element={
          <Guard requireMode="admin">
            <TopNav />
            <Admin />
          </Guard>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}