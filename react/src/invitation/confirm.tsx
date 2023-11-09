
import { useEffect, useState } from "react";
import { useLocalStorage, parseJwt } from '../hooks/useLocalStorage'
import { useParams, useNavigate } from "react-router-dom"

const host = import.meta.env.VITE_API_HOST

export default function Confirm() {
    const [error, setError] = useState('')
    const [invitation, setInvitation] = useState(null)
    const navigate = useNavigate();
    const [token] = useLocalStorage('jwt', null)

    let { inviteCode } = useParams() as { inviteCode: string }

    useEffect(() => {
        if (token !== null) {
            const obj = parseJwt(token)
            navigate('/players/' + obj.id)
        }
    }, [token])

    useEffect(() => {
        async function getInvitation() {
            const res = await fetch(`${host}/invitations/${inviteCode}`)
            const data = await res.json()
    
            if (res.status === 404) {
                setError('Invite code is invalid.')
            }

            if (!ignore) {
                setInvitation(data)
            }
        }
            

        let ignore = false
        getInvitation()

        return () => {
            ignore = true;
        }
    }, [inviteCode])

    const confirmInvite = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const response = await fetch(`${import.meta.env.VITE_API_HOST}/invitations/${inviteCode}/validate`, { method: "POST",    headers: {
            "Content-Type": "application/json",
          }, body: JSON.stringify(Object.fromEntries(formData))})
        
        const data = await response.json()
        if (response.status >= 400) {
            setError(data.error)
        } else {
            navigate('/')
        }
    }

  return (
    <main className='h-full min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgba(40,69,102,1)] to-[rgba(14,21,32,1)]'>
        { invitation
            && <>
                <h2 className="text-white mb-12 text-xl">Welcome {invitation.player.name}</h2>
                <div className="text-white mb-12" >Please enter a password to confirm your inscription.</div>
                <form className='flex flex-col items-center' method="post" onSubmit={confirmInvite}>
                    {
                        error !== '' &&
                        <div className="mb-4 text-red-400" >
                            {
                                <span>{error}</span>
                            }
                        </div>
                    }
                    <input className='h-12 w-48 mb-6 rounded-lg bg-[#365e8b] placeholder:text-center placeholder-white text-center text-white' placeholder="password" name="password" type="password"></input>
                    <input className='h-12 w-48 mb-6 rounded-lg bg-[#365e8b] placeholder:text-center placeholder-white text-center text-white' placeholder="confirm password" name="confirmPassword" type="password"></input>
                    <button className='h-8 w-36 mb-6 rounded-3xl bg-[#cad5ff] text-center text-[#365e8b]'>Join !</button>
                </form>
            </>
        }
    </main>
  )
}