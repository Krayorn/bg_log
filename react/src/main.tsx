import React from 'react'
import ReactDOM from 'react-dom/client'
import Home from './home/home.tsx'
import Login from './login.tsx'
import './index.css'
import '../dist/output.css'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/players/:playerId",
    element: <Home />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
