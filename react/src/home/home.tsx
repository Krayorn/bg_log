import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom"
import { useLocalStorage } from '../hooks/useLocalStorage'
import NewEntryModal from "../entry/newEntryModal"

const host = import.meta.env.VITE_API_HOST

function Home() {
    let { playerId } = useParams() as { playerId: string }
    const [addEntryModalOpen, setAddEntryModalOpen] = useState(false)

    return (
    <>
        {addEntryModalOpen && <NewEntryModal playerId={playerId} close={() => setAddEntryModalOpen(false)} />}
        <div className='bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgba(40,69,102,1)] to-[rgba(14,21,32,1)] h-full min-h-screen p-6 flex flex-col'> 
            <header className="border-b-2 border-white pb-2 flex justify-between">
                <div className="flex" >
                    <div className="border-b-2 border-gray-600" >
                        <div className="rounded-full border-white border-2 p-1" >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                            </svg>
                        </div>
                    </div>
                    <div className="ml-4 text-white flex-col border-b-2 border-gray-600">
                        <h1 className="text-lg" >Game log</h1>
                        <h2 className="text-base" >
                            Welcome to your personalized game log network
                        </h2>
                    </div>
                </div>
                <div className="text-gray-600 flex flex-col">
                    <span>version 0.1.3</span>
                    <span>released 2023-11-09</span>
                </div>
            </header>

            <main className="flex flex-wrap mt-12">
                <Box title="Personal details">
                    <PlayerBox playerId={playerId} />
                </Box>
                <Box title="User General Statistics">
                    <GeneralStatistics playerId={playerId}/>
                </Box>
                <Box title="Games Statistics">
                    <GameStatistics playerId={playerId}/>
                </Box>
                <Box title="Players statistics">
                    <PlayerStatistics playerId={playerId}/>
                </Box>
            </main>

            <footer className="w-full mb-6 mt-auto" >
                <div className="mt-12 border-t-2 border-white w-full" ></div>
                <section className="flex mt-6 justify-center ">
                    <button onClick={() => setAddEntryModalOpen(true)} className="rounded-full p-1 bg-neutral-950 shadow-2xl" >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="gray" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </section>
            </footer>
        </div>
    </>
  )
}

export default Home


function Box({ title, children }: {title :string, children: JSX.Element | JSX.Element[]}) {
    return (
        <section className="w-2/6 h-52 my-1">
            <div className="border-2 border-gray-600 rounded mx-1 h-full flex-col text-white px-4 py-1">
                <header className="border-white border-b-2 uppercase text-sm mb-4" >{title}</header>
                {children}
            </div>
        </section>
    )
}

interface Player {
    name: string
    number: number
    registeredOn: {
        date: string
    }|null
}

function PlayerBox({ playerId }: {playerId: string}) {
    const [playerInfos, setPlayerInfos] = useState<Player|null>(null)
    const [token, _] = useLocalStorage('jwt', null)
    useEffect(() => {
        async function getPlayer() {
            const res = await fetch(`${host}/players/${playerId}`, { headers: { "Authorization": `Bearer ${token}`}})
            const data = await res.json()
    
            if (!ignore) {
                setPlayerInfos(data)
            }
        }
            

        let ignore = false
        getPlayer()

        return () => {
            ignore = true;
        }
    }, [playerId])
    
    return (
        <>
        {
            playerInfos === null
            ? <div>Loading</div>
            : (
                <>
                    <div className="flex items-center pb-4 border-b-2 border-gray-600">    
                        <div className="border-white border-2 rounded mr-2 p-1" >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="gray" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        </div>
                        <span className="h-fit">
                            {playerInfos.name}
                        </span>
                    </div>
                    <div className="flex flex-col mt-4" >
                        <span>User #{playerInfos.number.toString().padStart(4, '0')}</span>
                        {
                            playerInfos.registeredOn === null 
                            ? <span>guest user</span>
                            : <span>registered on the {(new Date(playerInfos.registeredOn.date)).toLocaleDateString('fr-FR')}</span>
                        }
                        
                    </div>
                </>
            )
            
        }
        </>
    )
}

interface GeneralStatistics {
    gamesOwned: number
    entriesPlayed: number
    gamePartners: number
    globalWinrate: number
    lastGameDate: Date
}

function GeneralStatistics({ playerId }: {playerId: string}) {
    const [generalStats, setGeneralStats] = useState<GeneralStatistics|null>(null)
    const [token, _] = useLocalStorage('jwt', null)
        useEffect(() => {
            async function getGeneralStats() {
                const res = await fetch(`${host}/players/${playerId}/stats`, { headers: { "Authorization": `Bearer ${token}`}})        
                const data = await res.json()
        
                if (!ignore) {
                    setGeneralStats(data)
                }
            }
              
    
            let ignore = false
            getGeneralStats()
    
            return () => {
                ignore = true;
            }
        }, [playerId])
    

    const dateNow = new Date()
    const lastGameDate = new Date(generalStats?.lastGameDate ?? '')

    return (
        <div className="flex justify-between w-full">
            {
                generalStats === null 
                ? <div>Loading</div>
                : ( <>
                     <div className="flex flex-col" >
                            <span>Number of games in libray: {generalStats.gamesOwned}</span>
                            <span>Number of plays: {generalStats.entriesPlayed}</span>
                            <span>Number of different players: {generalStats.gamePartners}</span>
                            <span>Global Winrate: {generalStats.globalWinrate}%</span>
                        </div>
                        <div className="flex flex-col" >
                            <span>Days since last game: {Math.ceil(Math.abs(dateNow.getTime() - lastGameDate.getTime()) / (1000 * 60 * 60 * 24))}</span>
                        </div>
                    </>
                )
            }
        </div>
    )
}

interface GameStats {
    id: string
    count: number
    name: string
    in_library: boolean
}

function GameStatistics({ playerId }: {playerId: string}) {
    const [gameStats, setGameStats] = useState<GameStats[]>([])
    const [token, _] = useLocalStorage('jwt', null)
        useEffect(() => {
            async function getGameStats() {
                const res = await fetch(`${host}/players/${playerId}/games/stats`, { headers: { "Authorization": `Bearer ${token}`}})        
                const data = await res.json()
        
                if (!ignore) {
                    setGameStats(data)
                }
            }
              
    
            let ignore = false
            getGameStats()
    
            return () => {
                ignore = true;
            }
        }, [playerId])
    

    return (
        <div className="flex justify-between w-full" >
            {
                gameStats.length === 0 
                ? <div>Loading</div>
                : ( <>
                        <div className="flex flex-col w-1/2" >
                            <h3>Most played Games:</h3>
                            {
                                gameStats.sort((a, b) => b.count - a.count).slice(0, 5).map(game => {
                                    return (
                                        <span key={game.id} className="truncate" >{game.count} - {game.name}</span>
                                    )
                                })
                            }
                        </div>
                        <div className="flex flex-col w-1/2" >
                            <h3>Least played Games (in library):</h3>
                            {
                                gameStats.sort((a, b) => a.count - b.count).filter(a => a.in_library).slice(0, 5).map(game => {
                                    return (
                                        <span key={game.id} className="truncate" >{game.count} - {game.name}</span>
                                    )
                                })
                            }
                        </div>
                    </>
                )
            }
        </div>
    )
}

interface PlayerStats {
    id: string
    count: number
    name: string
    losses: number
    wins: number
}

function PlayerStatistics({ playerId }: {playerId: string}) {
    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
    const [token, _] = useLocalStorage('jwt', null)
        useEffect(() => {
            async function getPlayerStats() {
                const res = await fetch(`${host}/players/${playerId}/friends/stats`, { headers: { "Authorization": `Bearer ${token}`}})        
                const data = await res.json()
        
                if (!ignore) {
                    setPlayerStats(data)
                }
            }
              
    
            let ignore = false
            getPlayerStats()
    
            return () => {
                ignore = true;
            }
        }, [playerId])
    
        let wins = []
        let losses = []
        if (playerStats.length > 0) {
            wins = playerStats.sort((a, b) => b.wins - a.wins)
            losses = playerStats.sort((a, b) => b.losses - a.losses)
        }

    return (
        <div className="flex justify-between w-full" >
            {
                playerStats.length === 0
                ? <div>Loading</div>
                : ( <>
                        <div className="flex flex-col w-1/2" >
                            <h3>Played most with:</h3>
                            <div className="overflow-scroll h-32" >
                            {
                                playerStats.sort((a, b) => b.count - a.count).map(player => {
                                    return (
                                        <div key={player.id} className="flex justify-between mr-8" >
                                            <span className="truncate" >{player.count} - {player.name}</span>
                                            <Link to={`/players/${player.id}`} >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                                </svg>
                                            </Link>
                                        </div>
                                    )
                                })
                            }
                            </div>
                        </div>
                        <div className="flex flex-col w-1/2" >
                            <span>Most victories against: {wins.filter(player => player.wins === wins[0].wins).map(p => p.name).join(', ')} ({wins[0].wins})</span>
                            <span>Most losses against: {losses.filter(player => player.losses === losses[0].losses).map(p => p.name).join(', ')} ({losses[0].losses})</span>
                        </div>
                    </>
                )
            }
        </div>
    )
}