import { useState } from "react"
import { useLocalStorage } from '../hooks/useLocalStorage'
// replace by crypto.UUID() when site migrated to https
import { v4 as uuidv4 } from 'uuid'
import { useRequest } from '../hooks/useRequest'

const host = import.meta.env.VITE_API_HOST


export default function NewEntryModal({ close, playerId }: {close: Function, playerId: string}) {
    const [playerGames, setPlayerGames] = useState([])
    const [playersList, setPlayersList] = useState([])
    const [playersOwningGame, setPlayersOwningGame] = useState([])
    
    const [selectedGame, setSelectedGame] = useState('');

    const handleSelectChange = (event) => {
        setPlayersOwningGame([])
        setSelectedGame(event.target.value);
    };

    const [token, _] = useLocalStorage('jwt', null)
    
    const [players, setPlayers] = useState([{genId: uuidv4(), id: "", note: "", won: false}])
    const [errors, setErrors] = useState([])

    const addPlayer = (e) => {
        e.preventDefault();
        setPlayers([...players, {genId: uuidv4(), id: "", note: "", won: false}])
    }

    useRequest(`/games`, [playerId], setPlayerGames)
    useRequest(`/players`, [playerId], setPlayersList)
    
    useRequest(`/games/${selectedGame}/owners`, [selectedGame], setPlayersOwningGame, selectedGame !== "")

    const handleFieldChange = (e, genId) => {
        setPlayers(players.map(player => {
            if (player.genId === genId) {
                return {...player, [e.target.name.replace("player_", "")]: e.target.name === 'player_won' ? e.target.checked : e.target.value}
            }
            return player
        }))
    }
    
    const addPlayerGuest = async (e) => {
        e.preventDefault();
        console.log(e)
        const formData = new FormData(e.target);
        const formJson = Object.fromEntries(formData.entries())

        const response = await fetch(`${host}/players`, 
            { 
                method: "POST", 
                headers: { "Authorization": `Bearer ${token}`},
                body: JSON.stringify(formJson)
            })

        const data = await response.json()
        if (response.status === 400) {
            setErrors(data.errors)
        } else {
            console.log(data)
        }
    }

    const addEntry = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const formJson = Object.fromEntries(formData.entries());

        delete formJson.player_won
        delete formJson.player_note
        delete formJson.player_id

        const response = await fetch(`${host}/entries`, 
            { 
                method: "POST", 
                headers: { "Authorization": `Bearer ${token}`},
                body: JSON.stringify(
                    {...formJson, playedAt: formJson.playedAt + ':00+02:00', players: players.map(player => {
                        delete player.genId
                        return player
                    })
                })})

        const data = await response.json()
        if (response.status === 400) {
            setErrors(data.errors)
        } else {
            close()
        }
    }

    return (
        <main className="absolute w-full h-full backdrop-blur-sm text-white flex justify-center items-center"> 
            <div className="bg-zinc-800 rounded flex flex-col p-2 w-8/12 h-4/6 overflow-scroll">
                <button className="self-end" onClick={() => close()}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-center text-xl mb-8" >Add an Entry</h2>
                    <form className="text-black flex flex-col" onSubmit={addEntry} >
                        <section className="flex flex-col" >
                            <select className="mb-2" name="game" value={selectedGame} onChange={handleSelectChange}>
                                <option value="">Select the game</option>
                                {playerGames.map(game => (
                                    <option value={game.id}> {game.name} </option>
                                    ))}
                            </select>
                            {
                                playersOwningGame.length > 0 && 
                                <select className="mb-2" name="gameUsed" defaultValue="" >
                                    <option value="">Select the Owner or keep here if none</option>
                                    {playersOwningGame.map(playersOwningGame => (
                                        <option value={playersOwningGame.id}> {playersOwningGame.player.name} </option>
                                        ))}
                                </select>
                            }
                            <textarea className="mb-2" name="note" placeholder="Any note on the general game..." ></textarea>
                            <input className="mb-2" name="playedAt" type="datetime-local" ></input>
                        </section>
                        <div className="flex flex-wrap">
                            {
                                players.map(player => {
                                    return (
                                        <section key={player.genId} className="w-2/6 h-64 my-1" >
                                            <div className="border-2 border-white rounded mx-1 h-full flex flex-col">
                                                <button className="self-end" onClick={(e) => {e.preventDefault(); setPlayers(players.filter(fil => player.genId !== fil.genId))}}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                                <div className="flex flex-col px-4 pb-4" >
                                                    <select className="mb-2" onChange={(e) => handleFieldChange(e, player.genId)} value={player.id} required name="player_id">
                                                        <option value="">Player name</option>
                                                        {playersList.map(p => (
                                                            <option value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    <textarea className="mb-2" onChange={(e) => handleFieldChange(e, player.genId)} name="player_note" placeholder="Any note on the player game..." ></textarea>
                                                    <div className="text-white" >
                                                        <label>Won the game: </label>
                                                        <input className="mb-2" onChange={(e) => handleFieldChange(e, player.genId)} type="checkbox" name="player_won" ></input>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>


                                    )
                                })
                            }
                            <button className="w-1/6 my-1 mx-1 h-64 border-dashed border-2 rounded border-white flex items-center justify-center flex-col" onClick={addPlayer}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-12 h-12">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                </svg>
                                <span className="text-white" >Add a player</span>
                            </button>
                        </div>
                        <button className="rounded-xl border-2 border-[#536878] mt-6 p-2 self-center text-white" >Submit</button>
                    </form>
                    <form name="registerPlayer" className="w-1/6 my-1 mx-1 h-64 border-dashed border-2 rounded border-white flex items-center justify-center flex-col text-black" onSubmit={addPlayerGuest}>       
                            <input className="w-5/6" name="name" type="text" placeholder="player name"></input>

                            <button className="rounded-xl border-2 border-[#536878] mt-6 p-2 self-center text-white">Register a new guest player</button>
                    </form>
                    {
                        errors.length > 0 &&
                        <div className="mt-4" >
                            {
                                errors.map(err => (<span key={err} >{err}</span>))
                            }
                        </div>
                    }
                </div>
            </div>
        </main>
  )
}
