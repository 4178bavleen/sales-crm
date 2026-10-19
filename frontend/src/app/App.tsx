
import { Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">Sales CRM</h1>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
