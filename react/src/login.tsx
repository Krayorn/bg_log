import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage, parseJwt } from './hooks/useLocalStorage'
import Layout from './Layout'

export default function Login() {
    const [error, setError] = useState('')
    const navigate = useNavigate();
    const [_, setToken] = useLocalStorage('jwt', null)


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

  return (
    <Layout>
        <form className='flex flex-col items-center' method="post" onSubmit={login}>
            {
                error !== '' &&
                <div className="mb-4 text-red-400" >
                    {
                        <span>{error}</span>
                    }
                </div>
            }
            <input className='h-12 w-48 mb-6 rounded-lg bg-[#365e8b] placeholder:text-center placeholder-white text-center text-white' placeholder="username" name="username" type="text"></input>
            <input className='h-12 w-48 mb-6 rounded-lg bg-[#365e8b] placeholder:text-center placeholder-white text-center text-white' placeholder="password" name="password" type="password"></input>
            <button className='h-8 w-36 mb-6 rounded-3xl bg-[#cad5ff] text-center text-[#365e8b]'>Login</button>
        </form>
    </Layout>
  )
}