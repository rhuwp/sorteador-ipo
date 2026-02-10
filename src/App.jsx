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
  const { mode, actor } = useSession();
  const location = useLocation();

  // 1. Sem login -> Vai para Login
  if (!mode) return <Navigate to="/login" replace />;

  
  if (requireMode && mode !== requireMode) {
    return <Navigate to="/draw" replace />;
  }

  
  
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