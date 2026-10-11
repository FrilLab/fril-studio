/// <reference types="vite/client" />

declare module 'virtual:fril-works' {
  import type { StudioWork } from './types/works'

  const works: StudioWork[]
  export default works
}
