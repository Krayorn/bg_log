import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import About from './about.tsx'
import Home from './home/home.tsx'
import Game from './game/game.tsx'
import Games from './game/games.tsx'
import Login from './login.tsx'
import Circle from './circle/circle.tsx'
import CampaignPage from './campaign/campaign.tsx'
import AdminDashboard from './admin/dashboard.tsx'
import AdminUsers from './admin/users.tsx'
import './index.css'
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate
} from "react-router-dom"
import { useLocalStorage } from './hooks/useLocalStorage'
import { CircleProvider } from './contexts/CircleContext'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/about",
    element: <About />,
  },
  {
    path: "/players",
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/players/:playerId",
        element: <Home />,
      },
      {
        path: "/players/:playerId/games",
        element: <Games />,
      },
      {
        path: "/players/:playerId/circle",
        element: <Circle />,
      }
    ]
  },
  {
    path: "/games",
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/games/:gameId",
        element: <Game />,
      }
    ]
  },
  {
    path: "/campaigns",
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/campaigns/:campaignId",
        element: <CampaignPage />,
      }
    ]
  },
  {
    path: "/admin",
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "/admin/users",
        element: <AdminUsers />,
      }
    ]
  },
])


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

export function ProtectedRoute() {
  const navigate = useNavigate()
  const [token] = useLocalStorage('jwt', null)

  useEffect(() => {
    if (token === null) {
      navigate('/')
    }
  }, [token, navigate])

  return (<div>
    {token !== null && <CircleProvider><Outlet /></CircleProvider>}
  </div>)
}

export function ErrorPage() {
  return (
    <main>
      This page does not exist.
    </main>
  )
}

