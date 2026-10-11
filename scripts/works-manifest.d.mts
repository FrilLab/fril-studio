import type { StudioWork } from '../src/types/works'

export function createWorksManifest(worksDirectory: string): Promise<StudioWork[]>
