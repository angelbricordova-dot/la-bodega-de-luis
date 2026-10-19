import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/Layout'
import { PickerHost } from './components/AddProductSheet'
import { ConfirmHost, Toaster } from './components/ui'
import { CloudSync, LicenseBanner } from './components/CloudSync'
import Venta from './pages/Venta'
import Catalogo from './pages/Catalogo'
import Inventario from './pages/Inventario'
import ProductForm from './pages/ProductForm'
import Etiquetas from './pages/Etiquetas'
import RevisarOrden from './pages/RevisarOrden'
import Historial from './pages/Historial'
import Ajustes from './pages/ajustes'

const MAIN = ['/', '/catalogo', '/inventario', '/historial', '/ajustes']

export default function App() {
  const { pathname } = useLocation()
  return (
    <>
      {MAIN.includes(pathname) && <LicenseBanner />}
      <Routes>
        <Route path="/" element={<Venta />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/inventario/:id" element={<ProductForm />} />
        <Route path="/etiquetas" element={<Etiquetas />} />
        <Route path="/orden" element={<RevisarOrden />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/ajustes/:section" element={<Ajustes />} />
        <Route path="*" element={<Venta />} />
      </Routes>
      {MAIN.includes(pathname) && <BottomNav />}
      <CloudSync />
      <PickerHost />
      <ConfirmHost />
      <Toaster />
    </>
  )
}
