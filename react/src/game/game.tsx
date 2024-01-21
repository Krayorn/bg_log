
import { useParams } from "react-router-dom"
import { useState } from "react";
import { useLocalStorage , parseJwt } from '../hooks/useLocalStorage'
import { useRequest } from '../hooks/useRequest'

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
    won: boolean|null
    player: {
      name: string
    }
  }

export default function Game() {
    let { gameId } = useParams() as { gameId: string }
    const [game, setGame] = useState<Game|null>(null)
    const [entries, setEntries] = useState<Entry[]|[]>([])
    const [selectedEntry, setSelectedEntry] = useState<Entry|null>(null)

    const [token, _] = useLocalStorage('jwt', null)
    const playerId = parseJwt(token).id
    
    useRequest(`/games/${gameId}`, [gameId], setGame)
    useRequest(`/entries?game=${gameId}&player=${playerId}`, [gameId, playerId], setEntries)

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
                            entries.map(entry => <Entry func={() => setSelectedEntry(entry)} entry={entry} />)
                        }
                    </div>
                </section>
                <section className="w-4/6" >
                    {
                        selectedEntry
                        ? <EntryDetail entry={selectedEntry} />
                        : <>Stats Game will be displayed there</>
                    }
                </section>
            </section>
        </div>
    )
}

function Entry({ entry, func }: {entry: Entry, func: () => void}) {
    const playedAt = new Date(entry.playedAt.date)
    return (
        <div onClick={func} className="flex border-b-2 border-gray h-[15vh]">
            <div className="flex items-center text-gray-500 mr-4">
                {playedAt.toLocaleDateString('fr-FR')}
            </div>
            <div className="flex flex-col overflow-y-scroll">
                {entry.note.split(';').map(e => <span>{e}</span>)}
                <span>Players: {entry.players.map(p => p.player.name).join(', ')}</span>
            </div>
        </div>
    )
}

function EntryDetail({ entry }: {entry: Entry}) {
    const playedAt = new Date(entry.playedAt.date)
    return (
        <div className="">
            <section>
                {entry.note}
                {playedAt.toLocaleDateString('fr-FR')}        
            </section>
            <section>
                {
                    entry.players.map((playerResult) => (
                        <div>
                            {playerResult.player.name}
                            {playerResult.note}
                            {playerResult.won ? 'won' : 'lost'}
                        </div>
                    ))    
                }
            </section>
        </div>
    )
}