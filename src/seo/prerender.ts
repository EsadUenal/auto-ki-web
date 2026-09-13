import { createContext } from 'react'

/** true nur beim Build-Prerender (src/entry-prerender.tsx), nie im Browser. */
export const PrerenderContext = createContext(false)
