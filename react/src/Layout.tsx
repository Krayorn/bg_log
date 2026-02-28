import { ReactNode, useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRequest } from './hooks/useRequest';
import { useLocalStorage, parseJwt } from './hooks/useLocalStorage';
import { Landmark, Puzzle, Users, Search, X, Shield } from 'lucide-react';
import { Game } from './types';

type LayoutProps = {
  children: ReactNode;
  noNav?: boolean;
}

export default function Layout({ children, noNav = false }: LayoutProps) {
  const { playerId: playerIdFromParams } = useParams() as { playerId?: string };
  const [token, setToken] = useLocalStorage<string | null>('jwt', null);
  const navigate = useNavigate();
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

  const isAdmin = token ? (parseJwt(token).roles || []).includes('ROLE_ADMIN') : false;

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
              <Landmark className={`w-6 h-6 ${isActive(`/players/${playerId}`) ? 'text-cyan-400' : 'text-slate-400'}`} />
            </Link>
            <Link 
              to={`/players/${playerId}/games`} 
              className={`rounded-full p-3 backdrop-blur-md border transition-all duration-200 ${
                isActive(`/players/${playerId}/games`) 
                  ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                  : 'bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
              }`}
            >
              <Puzzle className={`w-6 h-6 ${isActive(`/players/${playerId}/games`) ? 'text-cyan-400' : 'text-slate-400'}`} />
            </Link>
            <Link 
              to={`/players/${playerId}/circle`} 
              className={`rounded-full p-3 backdrop-blur-md border transition-all duration-200 ${
                isActive(`/players/${playerId}/circle`) 
                  ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                  : 'bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
              }`}
            >
              <Users className={`w-6 h-6 ${isActive(`/players/${playerId}/circle`) ? 'text-cyan-400' : 'text-slate-400'}`} />
            </Link>
            <button 
              onClick={() => setSearchModalOpen(true)} 
              className="rounded-full p-3 backdrop-blur-md border bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200"
            >
              <Search className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          <div className="absolute bottom-2 right-3 flex gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="text-slate-500 text-xs hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                admin
              </Link>
            )}
            <Link
              to="/about"
              className="text-slate-500 text-xs hover:text-slate-300 transition-colors"
            >
              about
            </Link>
            <button 
              onClick={() => { setToken(null); navigate('/'); }} 
              className="text-slate-500 text-xs hover:text-slate-300 transition-colors"
            >
              logout
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
  }, [selected, results, close, navigate, playerId]);

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
            <X className="w-6 h-6" />
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
