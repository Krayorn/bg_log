import Navbar from "./navbar"
import { Outlet } from "react-router-dom";

function App() {
  return (
    <div className='bg-ambiance text-highlight h-full min-h-screen' > 
    <Navbar />
    <Outlet />
    </div>
  )
}

export default App
