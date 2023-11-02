import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from './hooks/useLocalStorage'

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

export default function Login() {
    const [error, setError] = useState('')
    const navigate = useNavigate();
    const [_, setToken] = useLocalStorage('jwt', null)


    const login = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const response = await fetch('http://localhost/api/login_check', { method: "POST",    headers: {
            "Content-Type": "application/json",
          }, body: JSON.stringify(Object.fromEntries(formData))})
        
        const data = await response.json()
        if (response.status >= 400) {
            setError(data.error)
        } else {
            console.log('data', data)

            const obj = parseJwt(data.token)
            setToken(data.token)
            navigate('/players/' + obj.id)
        }
    }

  return (
    <main className='h-full min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgba(40,69,102,1)] to-[rgba(14,21,32,1)]'>
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
    </main>
  )
}