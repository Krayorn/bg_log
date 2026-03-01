export type CustomFieldType = 'string' | 'number' | 'enum'

export type CustomFieldScope = 'entry' | 'playerResult'

export type CustomField = {
    id: string
    kind: CustomFieldType
    name: string
    scope: CustomFieldScope
    multiple: boolean
    enumValues: { id: string; value: string }[]
    player: string | null
    shareable: boolean
    originCustomField: string | null
}

export type CustomFieldValue = {
    id: string
    value: string | number
    customField: CustomField
}

export type PlayerResult = {
    id: string
    note: string
    won: boolean | null
    player: {
        name: string
        id: string
    }
    customFields: CustomFieldValue[]
}

export type Game = {
    id: string
    name: string
    customFields: CustomField[]
    campaignKeys: CampaignKey[]
}

export type GameOwner = {
    id: string
    game: Game
    price: number | null
    player: {
        id: string
        name: string
    }
}

export type GameStats = {
    entriesCount: number
    owned: boolean
    winrate: string
}

export type CampaignSummary = {
    id: string
    name: string
    createdAt: { date: string }
}

export type Entry = {
    id: string
    note: string
    players: PlayerResult[]
    playedAt: { date: string }
    createdAt: { date: string }
    customFields: CustomFieldValue[]
    campaign: CampaignSummary | null
    gameUsed: GameOwner | null
}

export type CampaignKey = {
    id: string
    name: string
    type: 'string' | 'number' | 'list' | 'counted_list'
    scope: CustomFieldScope
    scopedToCustomField: CustomField | null
    player: string | null
    shareable: boolean
    originCampaignKey: string | null
}

export type CampaignEvent = {
    id: string
    entry: string
    playerResult: string | null
    campaignKey: CampaignKey
    payload: Record<string, unknown>
    customFieldValue: CustomFieldValue | null
    createdAt: { date: string }
}

export type StateValue = string | number | string[] | Record<string, number>

export type StateSection = {
    label: string
    playerId: string | null
    entries: Record<string, StateValue>
    scoped: { label: string; entries: Record<string, StateValue> }[]
}

export type CampaignState = StateSection[]

export type CampaignEntry = Entry & {
    events: CampaignEvent[]
    stateAfter: CampaignState
}

export type Campaign = {
    id: string
    name: string
    game: Game
    createdBy: { id: string; name: string }
    createdAt: { date: string }
    entries: CampaignEntry[]
}

export type Player = {
    id: string
    name: string
    number: number
    registeredOn: { date: string } | null
    isGuest: boolean
    inPartyOf: { id: string; name: string } | null
    email?: string | null
    nickname?: string | null
}

export type CirclePlayer = {
    id: string
    name: string
    number: number
    registeredOn: string | null
    isGuest: boolean
    inPartyOf: { id: string } | null
    nickname: string | null
    gamesPlayed: number
    wins: number
    losses: number
}

export type PlayerGameStats = {
    game_id: string
    game_name: string
    game_owned_id: string | null
    price: number | null
    play_count: number
}

export type GeneralStatistics = {
    gamesOwned: number
    entriesPlayed: number
    gamePartners: number
    globalWinrate: number
    lastGameDate: Date
}

export type StatsResult =
    | { type: 'sum' | 'avg' | 'min' | 'max'; total: number }
    | { type: 'breakdown'; data: { value: string; count: number }[] }
    | { type: 'grouped'; data: { label: string; total: number }[] }
    | { type: 'stacked'; data: { group: string; values: Record<string, number> }[]; keys: string[] }
    | { type: 'crosstab'; data: { group: string; values: Record<string, number> }[]; keys: string[] }
    | { type: 'winrate'; data: { label: string; wins: number; total: number; rate: number }[] }
    | { type: 'winrate'; wins: number; total: number; rate: number }
    | { type: 'winrate_by_player'; data: { label: string; player: string; wins: number; total: number; rate: number }[] }

export type ChartType = 'bar' | 'pie'
export type AggregationType = 'sum' | 'avg' | 'min' | 'max'

export type SavedQuery = {
    id: string
    name: string
    customFieldId: string
    groupByFieldId: string | null
    groupByPlayer: boolean
    aggregation: string | null
    metric: string | null
}

export type AdminStats = {
    totalPlayers: number
    registeredPlayers: number
    guestPlayers: number
    newUsersThisMonth: number
    totalEntries: number
    entriesThisMonth: number
    totalGames: number
    totalCampaigns: number
    avgEntriesPerUser: number
    avgPlayersPerEntry: number
    mostPlayedGame: { name: string; play_count: number } | null
    totalGamesOwned: number
    recentEntries: { played_at: string; game_name: string }[]
    topPlayers: { name: string; entries_count: number }[]
}

export type AdminUser = {
    id: string
    name: string
    number: number
    registeredOn: { date: string } | null
    isGuest: boolean
    inPartyOf: { id: string; name: string } | null
    email: string | null
    roles: string[]
    isAdmin: boolean
}
