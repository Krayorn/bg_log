import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './OldApp.tsx'
import Home from './home/home.tsx'
import Login from './login.tsx'
import './index.css'
import '../dist/output.css'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Games from './game/games.tsx';
import NewGame from './game/newGame.tsx';
import Game from './game/game.tsx';
import NewEntry from './entry/newEntry.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/old",
    element: <App />,
    children: [
      {
        path: "/old/games",
        element: <Games />
      },
      {
        path: "/old/games/new",
        element: <NewGame />
      },
      {
        path: "/old/games/:gameId",
        element: <Game />
      },
      {
        path: "/old/entries/new",
        element: <NewEntry />
      },
    ]
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
