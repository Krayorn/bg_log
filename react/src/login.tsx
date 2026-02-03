import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage, parseJwt } from './hooks/useLocalStorage'
import Layout from './Layout'

export default function Login() {
    const [error, setError] = useState('')
    const [isRegisterMode, setIsRegisterMode] = useState(false)
    const navigate = useNavigate();
    const [token, setToken] = useLocalStorage('jwt', null)

    useEffect(() => {
        if (token !== null) {
            try {
                const obj = parseJwt(token)
                navigate('/players/' + obj.id)
            } catch (e) {
                // Invalid token, stay on login page
            }
        }
    }, [token, navigate])

    const login = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const response = await fetch(`${import.meta.env.VITE_API_HOST}/login_check`, { method: "POST",    headers: {
            "Content-Type": "application/json",
          }, body: JSON.stringify(Object.fromEntries(formData))})
        
        const data = await response.json()
        if (response.status >= 400) {
            setError(data.error)
        } else {
            const obj = parseJwt(data.token)
            setToken(data.token)
            navigate('/players/' + obj.id)
        }
    }

    const register = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        if (data.password !== data.confirmPassword) {
            setError('Passwords do not match')
            return
        }
        
        const response = await fetch(`${import.meta.env.VITE_API_HOST}/register`, { 
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }, 
            body: JSON.stringify({
                username: data.username,
                password: data.password
            })
        })
        
        const responseData = await response.json()
        if (response.status >= 400) {
            setError(responseData.error)
        } else {
            setError('')
            setIsRegisterMode(false)
        }
    }

    const toggleMode = () => {
        setError('')
        setIsRegisterMode(!isRegisterMode)
    }

  return (
    <Layout noNav>
        <div className="flex items-center justify-center min-h-[80vh]">
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 overflow-hidden w-80">
                <header className="border-b border-slate-500/50 px-6 py-3 bg-slate-800/70">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full border-cyan-400/50 border p-2 bg-cyan-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-cyan-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        </div>
                        <span className="uppercase text-xs font-medium text-slate-300 tracking-wider">
                            {isRegisterMode ? 'Create Account' : 'Access Terminal'}
                        </span>
                    </div>
                </header>
                <div className="p-6">
                    {error !== '' && (
                        <div className="mb-4 p-2 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}
                    <form className='flex flex-col' method="post" onSubmit={isRegisterMode ? register : login}>
                        <label className="text-xs uppercase text-slate-500 mb-1 font-medium tracking-wide">Username</label>
                        <input 
                            className='p-3 mb-4 rounded bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none transition-colors' 
                            placeholder="Enter username" 
                            name="username" 
                            type="text"
                        />
                        <label className="text-xs uppercase text-slate-500 mb-1 font-medium tracking-wide">Password</label>
                        <input 
                            className='p-3 mb-4 rounded bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none transition-colors' 
                            placeholder="Enter password" 
                            name="password" 
                            type="password"
                        />
                        {isRegisterMode && (
                            <>
                                <label className="text-xs uppercase text-slate-500 mb-1 font-medium tracking-wide">Confirm Password</label>
                                <input 
                                    className='p-3 mb-4 rounded bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none transition-colors' 
                                    placeholder="Confirm password" 
                                    name="confirmPassword" 
                                    type="password"
                                />
                            </>
                        )}
                        <button className='mt-2 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 font-medium hover:bg-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all'>
                            {isRegisterMode ? 'Register' : 'Login'}
                        </button>
                    </form>
                    <div className="mt-4 pt-4 border-t border-slate-600/30 text-center">
                        <button 
                            onClick={toggleMode}
                            className='text-slate-400 text-sm hover:text-cyan-400 transition-colors'
                        >
                            {isRegisterMode ? 'Already have an account? Login' : 'No account? Register'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </Layout>
  )
}
