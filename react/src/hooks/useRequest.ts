
import { useEffect } from "react";
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useNavigate } from "react-router-dom"

const host = import.meta.env.VITE_API_HOST

export const useRequest = (uri: string, deps: unknown[], setFunc: (data: unknown) => void, condition: boolean = true) => {
    const [token] = useLocalStorage('jwt', null)
    const navigate = useNavigate()
    
    useEffect(() => {
        async function getFunc() {
            const res = await fetch(`${host}${uri}`, { headers: { "Authorization": `Bearer ${token}`}})        
            const data = await res.json()

            if (data.code === 401) {
                navigate('/')
            }

            if (!ignore) {
                setFunc(data)
            }
        }

        let ignore = false
        if (condition) {
            getFunc()
        }

        return () => {
            ignore = true;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
}
