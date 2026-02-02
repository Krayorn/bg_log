import { ReactNode, useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRequest } from './hooks/useRequest';
import { useLocalStorage, parseJwt } from './hooks/useLocalStorage';

type LayoutProps = {
  children: ReactNode;
  noNav?: boolean;
}

interface Game {
  name: string
  id: string
}

export default function Layout({ children, noNav = false }: LayoutProps) {
  const { playerId: playerIdFromParams } = useParams() as { playerId?: string };
  const [token] = useLocalStorage('jwt', null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const location = useLocation();

  let playerId = playerIdFromParams;
  if (!playerId && token) {
    try {
      const decoded = parseJwt(token);
      playerId = decoded.id;
    } catch (e) {
      // Invalid token
    }
  }

  const isActive = (path: string) => {
    if (path === `/players/${playerId}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className='bg-[radial-gradient(ellipse_at_center,rgba(40,69,102,1),rgba(14,21,32,1))] h-screen overflow-y-auto'>
      {searchModalOpen && playerId && (
        <SearchModal playerId={playerId} close={() => setSearchModalOpen(false)} />
      )}
      <main className={`p-6 ${!noNav && playerId ? 'pb-24' : ''}`}>
        {children}
      </main>
      {!noNav && playerId && (
        <nav className='fixed bottom-0 left-0 right-0'>
          <div className="border-t border-slate-500/50 w-full"></div>
          <div className="flex justify-center py-4 gap-10 bg-slate-900/80 backdrop-blur-md">
            <Link 
              to={`/players/${playerId}`} 
              className={`rounded-full p-3 backdrop-blur-md border transition-all duration-200 ${
                isActive(`/players/${playerId}`) 
                  ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                  : 'bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${isActive(`/players/${playerId}`) ? 'text-cyan-400' : 'text-slate-400'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            </Link>
            <Link 
              to={`/players/${playerId}/games`} 
              className={`rounded-full p-3 backdrop-blur-md border transition-all duration-200 ${
                isActive(`/players/${playerId}/games`) 
                  ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                  : 'bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${isActive(`/players/${playerId}/games`) ? 'text-cyan-400' : 'text-slate-400'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
              </svg>
            </Link>
            <button 
              onClick={() => setSearchModalOpen(true)} 
              className="rounded-full p-3 backdrop-blur-md border bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

function SearchModal({ close, playerId }: { close: () => void, playerId: string }) {
  const [results, setResults] = useState<Game[]>([])
  const [query, setQuery] = useState<string>("")
  const [selected, setSelected] = useState<Game | null>(null)
  const navigate = useNavigate();

  const setResultsResetSelected = (results: Game[]) => {
    setResults(results)
    setSelected(null)
  }

  useRequest(`/games?query=${query}`, [query], setResultsResetSelected, query !== "")

  if (query === "" && results.length > 0) {
    setResultsResetSelected([])
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (selected === null) {
          setSelected(results[0])
        } else {
          const idxCurrentlySelected = results.findIndex(r => r.id === selected.id)
          if (results.length > idxCurrentlySelected + 1) {
            setSelected(results[idxCurrentlySelected + 1])
          }
        }
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (selected !== null) {
          const idxCurrentlySelected = results.findIndex(r => r.id === selected.id)
          if (idxCurrentlySelected - 1 >= 0) {
            setSelected(results[idxCurrentlySelected - 1])
          }
        }
      }

      if (event.key === 'Enter') {
        if (selected !== null) {
          navigate('/games/' + selected.id + "?playerId=" + playerId)
          close()
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selected, results]);

  return (
    <div className="absolute inset-0 z-50 backdrop-blur-sm text-white flex justify-center items-center" onClick={close}>
      <section className="bg-slate-900/90 backdrop-blur-md rounded-lg p-4 border border-slate-600/50" onClick={e => e.stopPropagation()}>
        <div className="flex align-center justify-between mb-2 border-b border-slate-500/50 pb-2">
          <input
            onClick={() => setSelected(null)}
            className="bg-transparent text-slate-200 focus:outline-none placeholder-slate-500"
            autoFocus
            type="text"
            name="query"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Game"
          />
          <button onClick={close} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col mt-2">
          {results.map(result => (
            <Link
              className={`p-2 rounded-md transition-all ${
                selected && selected.id === result.id 
                  ? 'bg-cyan-500/20 border border-cyan-400/50' 
                  : 'hover:bg-slate-700/50'
              }`}
              to={`/games/${result.id}?playerId=${playerId}`}
              key={result.id}
              onClick={close}
            >
              {result.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
