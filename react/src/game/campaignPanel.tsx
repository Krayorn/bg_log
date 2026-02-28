import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { createCampaign as apiCreateCampaign } from '../api/campaigns'
import { useRequest } from '../hooks/useRequest'
import { Plus, Scroll, ChevronRight } from 'lucide-react'
import { Campaign } from '../types'

type CampaignPanelProps = {
    gameId: string
}

export function CampaignPanel({ gameId }: CampaignPanelProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [newCampaignName, setNewCampaignName] = useState("")
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchParams] = useSearchParams()
    const playerId = searchParams.get('playerId')

    useRequest(`/campaigns?game=${gameId}`, [gameId], setCampaigns)

    const createCampaign = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!newCampaignName.trim()) {
            setError("Name can't be empty")
            return
        }

        const { data, error: apiError, ok } = await apiCreateCampaign({
            name: newCampaignName,
            game: gameId,
        })

        if (!ok || !data) {
            setError(apiError ?? 'Failed to create campaign')
        } else {
            setCampaigns([data, ...campaigns])
            setNewCampaignName("")
            setShowCreateForm(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-white">Campaigns</h2>

            <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
            >
                <Plus className="w-4 h-4" />
                New Campaign
            </button>

            {showCreateForm && (
                <form onSubmit={createCampaign} className="border border-slate-600 rounded-lg p-4 bg-slate-900/30">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-white text-sm font-medium">Campaign Name</label>
                            <input
                                autoFocus
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                placeholder="Enter campaign name..."
                                value={newCampaignName}
                                onChange={e => setNewCampaignName(e.target.value)}
                            />
                        </div>
                        {error && <span className="text-red-400 text-sm">{error}</span>}
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => { setShowCreateForm(false); setError(null) }}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium transition-colors text-sm"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {campaigns.length === 0 && !showCreateForm ? (
                <div className="border border-slate-600 rounded-lg p-8 bg-slate-900/30 text-center">
                    <Scroll className="w-12 h-12 text-slate-600 mx-auto mb-3" strokeWidth={1} />
                    <p className="text-slate-400">No campaigns yet.</p>
                    <p className="text-slate-500 text-sm mt-1">Create one to track multi-session games.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {campaigns.map(campaign => (
                        <Link
                            key={campaign.id}
                            to={`/campaigns/${campaign.id}?playerId=${playerId}`}
                            className="border border-slate-600 rounded-lg p-4 bg-slate-900/30 backdrop-blur-sm flex items-center justify-between hover:border-slate-400 transition-colors cursor-pointer"
                        >
                            <div>
                                <h3 className="text-white font-medium">{campaign.name}</h3>
                                <span className="text-slate-500 text-xs">
                                    {campaign.entries.length} {campaign.entries.length === 1 ? 'entry' : 'entries'}
                                    {' · '}
                                    Created {new Date(campaign.createdAt.date).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
