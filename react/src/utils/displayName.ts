export function getDisplayName(name: string, nickname?: string | null): string {
    return nickname ? `${name} "${nickname}"` : name
}
