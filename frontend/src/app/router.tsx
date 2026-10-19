
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import LeadsPage from '../features/leads/pages/Leadspage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'leads', element: <LeadsPage /> },
    ],
  },
])
