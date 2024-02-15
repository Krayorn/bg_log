import { useState } from "react"
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useRequest } from '../hooks/useRequest'

const host = import.meta.env.VITE_API_HOST
interface Game {
    name: string
    id: string
}

export default function NewGameModal({ close, playerId }: {close: Function, playerId: string}) {
    const [token, _] = useLocalStorage('jwt', null)
    const [errors, setErrors] = useState<string[]>([])
    const [games, setGames] = useState<Game[]>([])

    useRequest(`/games`, [], setGames)

    const addGame = async (e: any) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const formJson = Object.fromEntries(formData.entries())
        if (formJson.price === "") {
            delete formJson.price
        }

        const response = await fetch(`${host}/players/${playerId}/games`, 
            { 
                method: "POST", 
                headers: { "Authorization": `Bearer ${token}`},
                body: JSON.stringify(formJson)
            })

        const data = await response.json()
        if (response.status === 400) {
            setErrors(data.errors)
        } else if (response.status === 201) {
            setErrors(['Game added to your collection'])
        }
    }

    const addGameGlobal = async (e: any) => {
        e.preventDefault();
        console.log(e)
        const formData = new FormData(e.target);
        const formJson = Object.fromEntries(formData.entries())

        const response = await fetch(`${host}/games`, 
            { 
                method: "POST", 
                headers: { "Authorization": `Bearer ${token}`},
                body: JSON.stringify(formJson)
            })

        const data = await response.json()
        if (response.status === 400) {
            setErrors(data.errors)
        } else if (response.status === 201) {
            setGames([...games, data])
            setErrors(['Game added to the global database'])
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
                    <h2 className="text-center text-xl mb-8" >Add a Game</h2>
                    <form className="text-black flex flex-col" onSubmit={addGame}>       
                        <select className="mb-2" name="gameId">
                            <option value="">Select the game</option>
                            {games.map(game => (
                                <option key={game.id} value={game.id}> {game.name} </option>
                            ))}
                        </select>
                        <input className="mb-2" name="price" type="number" placeholder="price (optional)"></input>

                        <button className="rounded-xl border-2 border-[#536878] mt-6 p-2 self-center text-white">Add to my collection</button>
                    </form>
                    <form className="text-black flex flex-col" onSubmit={addGameGlobal}>       
                        <input className="mb-2" name="name" type="text" placeholder="game name"></input>

                        <button className="rounded-xl border-2 border-[#536878] mt-6 p-2 self-center text-white">Add to site database</button>
                    </form>
                    {
                        errors.length > 0 &&
                        <div className="mt-4 flex flex-col" >
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
