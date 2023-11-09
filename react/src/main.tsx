import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import Home from './home/home.tsx'
import Confirm from './invitation/confirm.tsx'
import Login from './login.tsx'
import './index.css'
import '../dist/output.css'
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate
} from "react-router-dom"
import { useLocalStorage } from './hooks/useLocalStorage'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/join/:inviteCode",
    element: <Confirm />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/players",
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/players/:playerId",
        element: <Home />,
      }   
    ]
  },
])


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

function ProtectedRoute() {
  const navigate = useNavigate()
  const [token, _] = useLocalStorage('jwt', null)
  

  useEffect(() => {
    if (token === null) {
      navigate('/')
    }
    return () => {}
  }, [token])

  return (<div>
    {token !== null && <Outlet />}
  </div>)
}

function ErrorPage(e) {
  return (
    <main>
      This page does not exist.
    </main>
  )
}

