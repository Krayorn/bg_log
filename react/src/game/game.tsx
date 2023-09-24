import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

  type Game = {
    name: string
    price: number
  }
  
  type Play = {
    id: string
    note: string
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
  
  export default function Game() {
    const [game, setGame] = useState(null)
    const [gameStats, setGameStats] = useState({})
    const [plays, setPlays] = useState([])
    let { gameId } = useParams();

    useEffect(() => {
            async function getGameStats(gameId: string) {
                const res = await fetch(`http://localhost/games/${gameId}/stats`)
                
                const data = await res.json()
                if (!ignore) {
                    setGameStats(data)
                }
              }
                
              async function getGame(gameId: string) {
                const res = await fetch(`http://localhost/games/${gameId}`)
                
                const data = await res.json()
                if (!ignore) {
                    setGame(data)
                }
              }
               
              async function getPlays(gameId: string) {
                const res = await fetch(`http://localhost/entries?gameId=${gameId}`)
                
                const data = await res.json()
                if (!ignore) {
                    setPlays(data)
                }
              }
              
        let ignore = false
        getPlays(gameId)
        getGame(gameId)
        getGameStats(gameId)

        return () => {
        ignore = true;
        }
    }, [])

    return (
      <main>
        {
            game && gameStats && gameStats.game && 
            <div className="grid grid-cols-3">
            <h1 className="text-2xl text-center font-semibold col-start-2 col-span-1">{game.name}</h1>
            <div className="flex flex-col text-right col-start-3 col-span-1" >
              <span>Price: {game.price ? (game.price / 100) + '€' : 'Not available'}</span>
              <span>Number of games: {gameStats.game.count}</span>
              <span>Price per game: {gameStats.game.pricePerGame ? (gameStats.game.pricePerGame / 100) + '€' : 'Not available'}</span>
            </div>
          </div>
        }
        <div className="grid grid-cols-4 m-4" >
            {
                plays && 
                <div className="col-start-1 col-span-3">
                    {
                    plays.map(play => {
                        const playedAt = new Date(play.playedAt.date)
                        return (
                        <div className="flex flex-col border-b pb-4 mb-4">
                            <div className="flex mb-2">
                            <span>
                                {playedAt.toLocaleDateString('fr-FR')}
                            </span>
                            {
                                play.note != "" && <span className="ml-2" >note: {play.note}</span>
                            }
                            </div>
                            <div>
                            {
                                play.players.map(playerResult => {
                                return (
                                    <div className="flex flex-col">
                                    <div className="flex">
                                        <span>{/*playerResult.player.name[0]}{'*'.repeat(playerResult.player.name.length - 1)*/playerResult.player.name}</span>
                                        <span className="ml-2">{playerResult.won ? 'Won !' : 'Lost'}</span>
                                    </div>
                                    {
                                        playerResult.note != "" && <span>note: {playerResult.note}</span>
                                    }
                                    </div>
                                )
                                })
                            }
                            </div>
                        </div>
                        )
                    })
                    }
                </div>
            }
            {
                gameStats && gameStats.playerParticipation &&
                <section className="flex flex-col border-2 border-white rounded col-start-4 col-span-1 p-4 h-fit" >
                    <h2 className="text-lg mb-4 text-center">Players participation</h2>
                    {
                    gameStats.playerParticipation.sort((a, b) => b.count - a.count).map((player: {name: string, count: number, winrate: number}) => {
                        return (
                        <div className="flex justify-between"> 
                            <span>
                            {/*player.name[0]}{'*'.repeat(player.name.length - 1)*/player.name} played {player.count} time{player.count > 1 && 's'}
                            </span>
                            <span>
                            Winrate: {player.winrate}%
                            </span>
                        </div>
                        )
                        })
                    }
                </section>
            }

        </div>
      </main>
    )
  }