import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import AuthScreen from './components/AuthScreen'
import { openDb } from './db'
import { cloudEnabled } from './lib/cloud'
import { useAccount } from './lib/account'
import { initStoreDb, seedIfEmpty } from './lib/seed'
import './index.css'

registerSW({ immediate: true })

navigator.storage?.persist?.().catch(() => {})

const root = ReactDOM.createRoot(document.getElementById('root')!)
const render = (el: React.ReactNode) => root.render(<React.StrictMode>{el}</React.StrictMode>)

async function boot() {
  // Sin Supabase configurado: la app funciona como antes, todo en el teléfono
  if (!cloudEnabled) {
    openDb('bodega')
    await seedIfEmpty()
    return render(<BrowserRouter><App /></BrowserRouter>)
  }

  const { account, license } = useAccount.getState()
  const isAdminPath = location.pathname.startsWith('/admin')

  if (!account) return render(<AuthScreen />)

  if (account.mode === 'admin') {
    if (!isAdminPath) history.replaceState(null, '', '/admin')
    const { default: AdminApp } = await import('./admin/AdminApp')
    return render(<BrowserRouter><AdminApp /></BrowserRouter>)
  }

  if (isAdminPath) history.replaceState(null, '', '/')

  if (account.mode === 'demo') {
    openDb('tubodega-demo')
    await seedIfEmpty()
    return render(<BrowserRouter><App /></BrowserRouter>)
  }

  openDb(`tubodega-${account.storeId}`)
  const store = license?.store
  await initStoreDb({ name: store?.name ?? 'Mi Bodega', rif: store?.rif, address: store?.address, phone: store?.phone })
  render(<BrowserRouter><App /></BrowserRouter>)
}

boot()
