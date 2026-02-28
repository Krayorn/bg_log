import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage, parseJwt } from './hooks/useLocalStorage'
import { login as apiLogin, register as apiRegister } from './api/auth'
import Layout from './Layout'
import { User } from 'lucide-react'

export default function Login() {
    const [error, setError] = useState('')
    const [isRegisterMode, setIsRegisterMode] = useState(false)
    const navigate = useNavigate();
    const [token, setToken] = useLocalStorage<string | null>('jwt', null)

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

    const login = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const { data, error: apiError, ok } = await apiLogin(Object.fromEntries(formData))
        
        if (!ok || !data) {
            setError(apiError ?? 'Login failed')
        } else {
            const obj = parseJwt(data.token)
            setToken(data.token)
            navigate('/players/' + obj.id)
        }
    }

    const register = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const formDataObj = Object.fromEntries(formData);

        if (formDataObj.password !== formDataObj.confirmPassword) {
            setError('Passwords do not match')
            return
        }
        
        const { error: apiError, ok } = await apiRegister({
            username: formDataObj.username,
            password: formDataObj.password
        })
        
        if (!ok) {
            setError(apiError ?? 'Registration failed')
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
                            <User className="w-5 h-5 text-cyan-400" />
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
