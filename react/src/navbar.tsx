import { NavLink } from "react-router-dom";

export default function Navbar() {
    return (
      <nav className='flex flex-row w-full px-2 mb-10 bg-highlight text-ambiance'>
        <NavLink className={({ isActive }) => (isActive ? "font-bold" : "") + ' pl-3 pr-4 py-2 md:hover:text-blue-700'} to={`/`}>Home</NavLink>
        <NavLink className={({ isActive }) => (isActive ? "font-bold" : "") + ' pl-3 pr-4 py-2 md:hover:text-blue-700'} to={`/games`}>Games</NavLink>
        <NavLink className={({ isActive }) => (isActive ? "font-bold" : "") + ' pl-3 pr-4 py-2 md:hover:text-blue-700'} to={`/entries/new`}>New Entry</NavLink>
      </nav>
    )
  }
  