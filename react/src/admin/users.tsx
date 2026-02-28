import { useState, useMemo } from 'react'
import { useLocalStorage, parseJwt } from '../hooks/useLocalStorage'
import { useRequest } from '../hooks/useRequest'
import { deleteAdminUser, toggleAdminRole } from '../api/admin'
import { AdminLayout } from './dashboard'
import { Shield, Trash2, UserCheck, UserX, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { AdminUser } from '../types'

type SortKey = 'number' | 'name' | 'registeredOn' | 'email' | 'admin'
type SortDir = 'asc' | 'desc'

function getSortValue(user: AdminUser, key: SortKey): string | number {
    switch (key) {
        case 'number': return user.number
        case 'name': return user.name.toLowerCase()
        case 'registeredOn': return user.registeredOn ? new Date(user.registeredOn.date).getTime() : 0
        case 'email': return (user.email ?? '').toLowerCase()
        case 'admin': return user.isAdmin ? 0 : 1
    }
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
    if (sortKey !== column) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc'
        ? <ChevronUp className="w-3 h-3 text-cyan-400" />
        : <ChevronDown className="w-3 h-3 text-cyan-400" />
}

export default function AdminUsers() {
    const [users, setUsers] = useState<AdminUser[] | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [token] = useLocalStorage('jwt', null)
    const currentUserId = token ? parseJwt(token).id : null
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    useRequest<AdminUser[]>('/admin/users', [refreshKey], setUsers)

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            if (sortDir === 'asc') {
                setSortDir('desc')
            } else {
                setSortKey(null)
                setSortDir('asc')
            }
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    const filteredUsers = useMemo(() => {
        if (!users) return null
        const q = search.toLowerCase().trim()

        let result = users
        if (q) {
            result = result.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.number.toString().includes(q) ||
                (u.email ?? '').toLowerCase().includes(q)
            )
        }

        if (sortKey) {
            result = [...result].sort((a, b) => {
                const va = getSortValue(a, sortKey)
                const vb = getSortValue(b, sortKey)
                const cmp = va < vb ? -1 : va > vb ? 1 : 0
                return sortDir === 'asc' ? cmp : -cmp
            })
        }

        return result
    }, [users, search, sortKey, sortDir])

    const handleDelete = async (playerId: string) => {
        const { ok } = await deleteAdminUser(playerId)
        if (ok) {
            setConfirmDelete(null)
            setRefreshKey(k => k + 1)
        }
    }

    const handleToggleAdmin = async (playerId: string) => {
        const { ok } = await toggleAdminRole(playerId)
        if (ok) {
            setRefreshKey(k => k + 1)
        }
    }

    const thClass = (key: SortKey) =>
        `px-4 py-3 text-[10px] uppercase tracking-wider font-medium cursor-pointer select-none transition-colors hover:text-cyan-400 ${
            sortKey === key ? 'text-cyan-400' : 'text-slate-500'
        }`

    return (
        <AdminLayout>
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl font-bold text-white tracking-wide">USER MANAGEMENT</h1>
                    <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent"></div>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                    {users ? `${filteredUsers?.length ?? 0} of ${users.length} users` : 'Loading...'}
                </div>
            </div>

            {users === null ? (
                <div className="text-slate-500">Loading user data...</div>
            ) : (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 overflow-hidden">
                    <header className="border-b border-slate-500/50 px-4 py-2 bg-slate-800/70 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"></div>
                        <span className="uppercase text-[10px] font-medium text-slate-400 tracking-[0.2em]">ALL USERS</span>
                        <div className="ml-auto relative">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search users..."
                                className="bg-slate-900/60 border border-slate-600/40 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-400/50 focus:outline-none transition-colors w-56"
                            />
                        </div>
                    </header>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-left">
                                    <th className={thClass('number')} onClick={() => handleSort('number')}>
                                        <div className="flex items-center gap-1">
                                            # <SortIcon column="number" sortKey={sortKey} sortDir={sortDir} />
                                        </div>
                                    </th>
                                    <th className={thClass('name')} onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">
                                            Name <SortIcon column="name" sortKey={sortKey} sortDir={sortDir} />
                                        </div>
                                    </th>
                                    <th className={thClass('registeredOn')} onClick={() => handleSort('registeredOn')}>
                                        <div className="flex items-center gap-1">
                                            Registered On <SortIcon column="registeredOn" sortKey={sortKey} sortDir={sortDir} />
                                        </div>
                                    </th>
                                    <th className={thClass('email')} onClick={() => handleSort('email')}>
                                        <div className="flex items-center gap-1">
                                            Email <SortIcon column="email" sortKey={sortKey} sortDir={sortDir} />
                                        </div>
                                    </th>
                                    <th className={thClass('admin')} onClick={() => handleSort('admin')}>
                                        <div className="flex items-center gap-1">
                                            Admin <SortIcon column="admin" sortKey={sortKey} sortDir={sortDir} />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers?.map(user => {
                                    const isSelf = user.id === currentUserId
                                    return (
                                        <tr
                                            key={user.id}
                                            className={`border-b border-slate-800/50 transition-colors ${
                                                isSelf
                                                    ? 'bg-cyan-500/5 border-l-2 border-l-cyan-400/50'
                                                    : 'hover:bg-slate-800/30'
                                            }`}
                                        >
                                            <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                                                {user.number.toString().padStart(4, '0')}
                                            </td>
                                            <td className="px-4 py-3 text-white font-medium">
                                                {user.name}
                                                {isSelf && <span className="ml-2 text-[10px] text-cyan-400">(you)</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                                {user.registeredOn
                                                    ? new Date(user.registeredOn.date).toLocaleDateString('fr-FR')
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">
                                                {user.email ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.isAdmin && (
                                                    <Shield className="w-4 h-4 text-cyan-400" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isSelf ? (
                                                    <span className="text-[10px] text-slate-600">—</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleAdmin(user.id)}
                                                            className={`p-1.5 rounded transition-colors ${
                                                                user.isAdmin
                                                                    ? 'text-cyan-400 hover:bg-cyan-500/15'
                                                                    : 'text-slate-500 hover:text-cyan-400 hover:bg-slate-800/50'
                                                            }`}
                                                            title={user.isAdmin ? 'Remove admin' : 'Make admin'}
                                                        >
                                                            {user.isAdmin
                                                                ? <UserX className="w-4 h-4" />
                                                                : <UserCheck className="w-4 h-4" />
                                                            }
                                                        </button>
                                                        {confirmDelete === user.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleDelete(user.id)}
                                                                    className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-400/30"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDelete(null)}
                                                                    className="text-[10px] text-slate-400 hover:text-slate-300 px-2 py-1"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmDelete(user.id)}
                                                                className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                                title="Delete user"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredUsers?.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                                            No users matching &quot;{search}&quot;
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
