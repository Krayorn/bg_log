import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useLocalStorage } from './hooks/useLocalStorage'
import { CircleProvider } from './contexts/CircleContext'

export default function ProtectedRoute() {
    const navigate = useNavigate()
    const [token] = useLocalStorage('jwt', null)

    useEffect(() => {
        if (token === null) {
            navigate('/')
        }
    }, [token, navigate])

    return (
        <div>
            {token !== null && (
                <CircleProvider>
                    <Outlet />
                </CircleProvider>
            )}
        </div>
    )
}
