import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NewGame() {
    const [errors, setErrors] = useState([])
    const [players, setPlayers] = useState([])
    const navigate = useNavigate();

    const addPlayer = (e) => {
        e.preventDefault();
        setPlayers([...players, {id: crypto.randomUUID(), name: "", won: false, note: ""}])
    }

    const handleFieldChange = (e, id) => {
        setPlayers(players.map(player => {
            if (player.id === id) {
                return {...player, [e.target.name.replace("player_", "")]: e.target.name === 'player_won' ? e.target.checked : e.target.value}
            }
            return player
        }))
    }
 
    const addEntry = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const formJson = Object.fromEntries(formData.entries());

        delete formJson.player_won
        delete formJson.player_note
        delete formJson.player_name

        const response = await fetch('http://localhost/entries', 
            { 
                method: "POST", 
                body: JSON.stringify(
                    {...formJson, playedAt: formJson.playedAt + ':00+02:00', players: players.map(player => {
                        delete player.id
                        return player
                    })
                })})
        
        const data = await response.json()
        if (response.status === 400) {
            setErrors(data.errors)
        } else {
            navigate('/games/' + data.game.id)
        }
    }

  return (
    <main className="" >
        
        
        <form method="post" onSubmit={addEntry} className='flex flex-col justify-around m-4 items-center'>
            <h1 className="text-xl font-semibold" >New Entry</h1>  
            
            <label className="mt-8 flex flex-col" >
                <span className="text-center" >Game:</span> 
                <input className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="game" type="text"></input>
            </label>

            <label className="mt-8 flex flex-col" >
                <span className="text-center" >Note:</span> 
                <textarea className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="note"></textarea>
            </label>

            <label className="mt-8 flex flex-col" >
                <span className="text-center" >Date:</span> 
                <input className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="playedAt" type="datetime-local"></input>
            </label>

            {
                players.map(player => {
                    return (
                        <div key={player.id} >
                            <label className="mt-8 flex flex-col" >
                                <span className="text-center" >Player Name:</span> 
                                <input onChange={(e) => handleFieldChange(e, player.id)} className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="player_name" type="text" value={player.name}></input>
                            </label>

                            <label className="mt-8 flex flex-col" >
                                <span className="text-center" >Note:</span> 
                                <textarea onChange={(e) => handleFieldChange(e, player.id)} className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="player_note"  value={player.note}></textarea>
                            </label>

                            <label className="mt-8 flex flex-col" >
                                <span className="text-center" >Won:</span> 
                                <input onChange={(e) => handleFieldChange(e, player.id)} className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="player_won" type="checkbox" value={player.won}></input>
                            </label>
                        </div>
                    )
                })
            }

            <button onClick={addPlayer} className="mt-8 border rounded p-2 bg-highlight text-ambiance hover:bg-inter transition-colors">Add a player</button>

            {
                errors.length > 0 &&
                <div className="mt-4" >
                    {
                        errors.map(err => (<span key={err} >{err}</span>))
                    }
                </div>
            }

            <button className="mt-8 border rounded p-2 bg-highlight text-ambiance hover:bg-inter transition-colors">Add the Entry</button>
        </form>
    </main>
  )
}