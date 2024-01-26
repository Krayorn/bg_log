
import { useParams } from "react-router-dom"
import { useState } from "react";
import { useLocalStorage , parseJwt } from '../hooks/useLocalStorage'
import { useRequest } from '../hooks/useRequest'

interface Game {
    name: string
    id: string
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
    won: boolean|null
    player: {
        name: string
        id: string
    }
}

type GameStats = {
    entriesCount: number
    owned: boolean
    winrate: string
}

export default function Game() {
    let { gameId } = useParams() as { gameId: string }
    const [game, setGame] = useState<Game|null>(null)
    const [gameStats, setGameStats] = useState<GameStats|null>(null)
    const [entries, setEntries] = useState<Entry[]|[]>([])
    const [selectedEntry, setSelectedEntry] = useState<Entry|null>(null)

    const [token, _] = useLocalStorage('jwt', null)
    const playerId = parseJwt(token).id
    
    useRequest(`/games/${gameId}`, [gameId], setGame)
    useRequest(`/entries?game=${gameId}&player=${playerId}`, [gameId, playerId], setEntries)
    useRequest(`/games/${gameId}/stats?player=${playerId}`, [gameId, playerId], setGameStats)

    if (game === null) {
        return (
            <div>loading</div>
        )
    }

    return (
        <div className='bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgba(40,69,102,1)] to-[rgba(14,21,32,1)] h-full min-h-screen p-6 flex flex-col text-white'> 
            <section className="border-2 border-white flex h-[95vh] ">
                <section className="border-r-2 border-white w-2/6">
                    <div onClick={() => setSelectedEntry(null)} className="border-b-2 h-[15vh] flex items-center justify-center">
                        {game.name}
                    </div>
                    <div className="overflow-y-scroll h-[80vh]" >
                        {
                            entries.map(entry => <Entry isCurrent={selectedEntry?.id === entry.id} func={() => setSelectedEntry(entry)} entry={entry} playerId={playerId} />)
                        }
                    </div>
                </section>
                <section className="w-4/6" >
                    {
                        selectedEntry
                        ? <EntryDetail entry={selectedEntry} />
                        : <GameDetail gameStats={gameStats} />
                    }
                </section>
            </section>
        </div>
    )
}

function Entry({ entry, func, isCurrent, playerId }: {entry: Entry, func: () => void, isCurrent: boolean, playerId: string}) {
    const playedAt = new Date(entry.playedAt.date)
    return (
        <div onClick={func} className={`flex justify-between border-b-2 h-[15vh] ${entry.players.find(p => p.player.id === playerId)?.won ? "bg-lime-500/[.2]" : "bg-red-900/50" }`}>
            <div className="flex items-center text-gray-500 mx-4">
                {playedAt.toLocaleDateString('fr-FR')}
            </div>
            <div className="flex flex-col overflow-y-scroll">
                {entry.note.split(';').map(e => <span>{e}</span>)}
                <span>Players: {entry.players.map(p => p.player.name).join(', ')}</span>
            </div>
            <div className={`h-[15vh] w-2 ${isCurrent ? 'bg-white' : 'bg-transparent'}`} />
        </div>
    )
}

function EntryDetail({ entry }: {entry: Entry}) {
    const playedAt = new Date(entry.playedAt.date)
    return (
        <div className="m-4">
            <header className="flex justify-end" >
                {playedAt.toLocaleDateString('fr-FR')}        
            </header>
            <section className="flex flex-col" >
                {entry.note.split(';').map(e => <span className="mb-4" >{e}</span>)}
            </section>
            <section className="flex flex-col">
                {
                    entry.players.sort((a, b) => a.won && !b.won ? -1 : 1).map((playerResult) => (
                        <div className="flex flex-col mt-4 border-b-2 border-slate-500" >
                            <span className="flex">
                                {playerResult.player.name} {
                                playerResult.won && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}                   stroke="currentColor" className="w-6 h-6 ml-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                                    </svg>
                                    }
                            </span>
                            {playerResult.note.split(';').map(e => <span className="mb-2" >{e}</span>)}
                        </div>
                    ))    
                }
            </section>
        </div>
    )
}

function GameDetail({ gameStats }: {gameStats: GameStats|null}) {
    if (gameStats === null) {
        return <div>Loading stylé</div>
    }
    
    return (
        <div className="flex flex-col m-4" >
            <span>Games played: {gameStats.entriesCount}</span>
            {gameStats.owned && <span>Game is in Library</span> }
            <span>Your winrate on this game is: {gameStats.winrate}%</span>
        </div>
    )
}
