import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { headSeoFuer, jsonLdText, SITE_NAME } from './seo'

/**
 * Hält <head> bei clientseitiger Navigation mit der Routentabelle (seo.ts)
 * synchron. Setzt exakt dieselben Werte wie das Prerender-HTML — der Canonical
 * einer Seite ändert sich also nie zwischen ausgeliefertem HTML und Render.
 */

const MARKER = 'data-enfal-seo'

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function applyHeadSeo(pathname: string) {
  const seo = headSeoFuer(pathname)
  document.title = seo.title
  setMeta('name', 'description', seo.description)
  setMeta('name', 'robots', seo.robots)

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (seo.canonical) {
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = seo.canonical
  } else {
    canonical?.remove()
  }

  const og = seo.canonical !== null
  setMeta('property', 'og:type', og ? 'website' : null)
  setMeta('property', 'og:site_name', og ? SITE_NAME : null)
  setMeta('property', 'og:locale', og ? 'de_DE' : null)
  setMeta('property', 'og:title', og ? seo.title : null)
  setMeta('property', 'og:description', og ? seo.description : null)
  setMeta('property', 'og:url', seo.canonical)
  setMeta('name', 'twitter:card', og ? 'summary' : null)

  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove())
  for (const obj of seo.jsonLd) {
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.setAttribute(MARKER, '')
    s.text = jsonLdText(obj)
    document.head.appendChild(s)
  }
}

export default function RouteSeo() {
  const { pathname } = useLocation()
  useEffect(() => {
    applyHeadSeo(pathname)
  }, [pathname])
  return null
}
