import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Article from './pages/Article'
export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/en" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/admin" element={<Admin />} />
    <Route path="/:lang" element={<Home />} />
    <Route path="/:lang/:slug" element={<Article />} />
  </Routes>
}
