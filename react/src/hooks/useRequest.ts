
import { useEffect } from "react";
import { useLocalStorage } from '../hooks/useLocalStorage'

const host = import.meta.env.VITE_API_HOST

export const useRequest = (uri: string, deps: Array<any>, setFunc: Function) => {
    const [token, _] = useLocalStorage('jwt', null)
    
    useEffect(() => {
        async function getFunc() {
            const res = await fetch(`${host}${uri}`, { headers: { "Authorization": `Bearer ${token}`}})        
            const data = await res.json()

            if (!ignore) {
                setFunc(data)
            }
        }
            

        let ignore = false
        getFunc()

        return () => {
            ignore = true;
        }
    }, deps)
}
