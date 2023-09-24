import { Link } from "react-router-dom";
import { useEffect, useState } from "react";


export default function Games() {
    const [games, setGames] = useState([])

    useEffect(() => {
        async function getGames() {
            const res = await fetch('http://localhost/games/stats')        
            const data = await res.json()
    
            if (!ignore) {
                setGames(data)
            }
        }
          

        let ignore = false
        getGames()

        return () => {
        ignore = true;
        }
    }, [])

  return (
    <main className="">
      <div className='flex justify-end' >
        <Link to={`/games/new`} className='mr-4 border rounded p-2 bg-highlight text-ambiance hover:bg-inter transition-colors'>
          Add a new game
        </Link>
      </div>
      <div className="flex flex-wrap justify-center">  
        {
          games.sort((a, b) => b['count'] - a['count']).map((game) => {
            return (
              <Game key={game['name']} id={game['id']} name={game['name']} plays={game['count']} /> 
              )
            })
        }
      </div>
    </main>
  )
}

function Game({ id, name, plays }: {id: string, name: string, plays: number}) {
  return (
    <Link to={`/games/${id}`} className='w-1/6 border rounded border-highlight m-4 p-2 flex flex-col justify-between hover:shadow-highlight duration-150 hover:border-highlight'>
      <span className='text-lg text-center'>{name}</span>
      <span className='text-right mt-4' >played {plays} time{ plays > 1 && 's'}</span>
    </Link>
  )
}