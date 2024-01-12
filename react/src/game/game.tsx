
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react";
import { useLocalStorage , parseJwt } from '../hooks/useLocalStorage'

interface Game {
    name: string
    id: string
    registeredOn: {
        date: string
    }|null
}

interface Entry {
    id: string,
    note: string,
    players: PlayerResult[]
    playedAt: {
      date: string
    }
  }

  type PlayerResult = {
    id: string
    note: string
    won: boolean
    player: {
      name: string
    }
  }
const host = import.meta.env.VITE_API_HOST

export default function Game() {
    let { gameId } = useParams() as { gameId: string }
    const [game, setGame] = useState<Game|null>(null)
    const [entries, setEntries] = useState<Entry[]|[]>([])

    const [token, _] = useLocalStorage('jwt', null)
    const playerId = parseJwt(token).id
    
    useEffect(() => {
        async function getGame() {
            const res = await fetch(`${host}/games/${gameId}`, { headers: { "Authorization": `Bearer ${token}`}})        
            const data = await res.json()

            if (!ignore) {
                setGame(data)
            }
        }
            

        let ignore = false
        getGame()

        return () => {
            ignore = true;
        }
    }, [gameId])

    useEffect(() => {
        async function getEntries() {
            const res = await fetch(`${host}/entries?game=${gameId}&player=${playerId}`, { headers: { "Authorization": `Bearer ${token}`}})        
            const data = await res.json()

            if (!ignore) {
                setEntries(data)
            }
        }
            

        let ignore = false
        getEntries()

        return () => {
            ignore = true;
        }
    }, [gameId, playerId])

    if (game === null) {
        return (
            <div>loading</div>
        )
    }

    return (
        <div className='bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgba(40,69,102,1)] to-[rgba(14,21,32,1)] h-full min-h-screen p-6 flex flex-col'> 
            {game.name}
            {game.id}

            {
                entries.map(entry => <Entry entry={entry} />)
            }
        </div>
    )
}

function Entry({ entry }: {entry: Entry}) {
    const playedAt = new Date(entry.playedAt.date)
    return (
        <div>
            {entry.id}
            {entry.note}
            {playedAt.toLocaleDateString('fr-FR')}        
        </div>
    )
}