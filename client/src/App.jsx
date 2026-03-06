import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { createContext, useEffect, useMemo, useState } from 'react';
import HomePage from './pages/HomePage';
import ListingPage from './pages/ListingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NewListingPage from './pages/NewListingPage';
import FavoritesPage from './pages/FavoritesPage';
import MessagesPage from './pages/MessagesPage';
import AdminPage from './pages/AdminPage';
import { api } from './api';

export const AppContext = createContext(null);

export default function App() {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
    const token = localStorage.getItem('token');
    if (token) api('/auth/me').then(setUser).catch(() => localStorage.removeItem('token'));
  }, []);

  const value = useMemo(() => ({ user, setUser, categories, refreshUser: async () => setUser(await api('/auth/me')) }), [user, categories]);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <AppContext.Provider value={value}>
      <div className="app-shell">
        <header className="topbar">
          <Link className="brand" to="/">MarketSquare</Link>
          <nav>
            <Link to="/new">Post Listing</Link>
            {user && <Link to="/favorites">Favorites</Link>}
            {user && <Link to="/messages">Messages</Link>}
            {user && <Link to="/dashboard">Dashboard</Link>}
            {user?.isAdmin && <Link to="/admin">Admin</Link>}
            {!user ? <Link to="/login">Login</Link> : <button className="link-btn" onClick={logout}>Logout</button>}
          </nav>
        </header>

        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listing/:id" element={<ListingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/new" element={<NewListingPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </AppContext.Provider>
  );
}
