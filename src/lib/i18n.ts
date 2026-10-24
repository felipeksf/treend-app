import { useEffect, useState } from 'react'
import DICT from '../i18n/dict.json'

/* Runtime translation layer. The UI is authored in Portuguese; for EN/ES a MutationObserver swaps
   every text node and placeholder/title/aria-label against the dictionary. Exact matches first,
   then longest-first fragment replacement for interpolated strings. Market data stays as-is. */

export type Lang = 'pt' | 'en' | 'es'
export const LANGS: { key: Lang; flag: string; label: string }[] = [
  { key: 'pt', flag: '🇧🇷', label: 'Português' },
  { key: 'en', flag: '🇺🇸', label: 'English' },
  { key: 'es', flag: '🇪🇸', label: 'Español' },
]
const KEY = 'treend-v2-lang'
const EVT = 'treend-v2-lang'
const D = DICT as Record<string, { en: string; es: string }>

export const getLang = (): Lang => {
  try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'es') return v } catch { /* ignore */ }
  return 'pt'
}
export const setLang = (l: Lang) => {
  try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT))
  location.reload()
}
export function useLang() {
  const [l, setL] = useState(getLang)
  useEffect(() => { const f = () => setL(getLang()); window.addEventListener(EVT, f); return () => window.removeEventListener(EVT, f) }, [])
  return l
}

const lang = getLang()
export const LOCALE = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR'
// fragments (≥ 4 chars, with letters) for partial replacement, longest first
const FRAGS = Object.keys(D).filter((k) => k.length >= 4 && /\S\s+\S/.test(k) && /[a-zà-ú]/i.test(k)).sort((a, b) => b.length - a.length)
const cache = new Map<string, string>()
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Translate one Portuguese string into the current language (identity in PT). */
export function tr(s: string, l: Lang = lang): string {
  if (l === 'pt' || !s) return s
  const t = s.trim()
  if (!t || !/[a-zà-ú]/i.test(t)) return s
  const hit = D[t]?.[l]
  if (hit) return s.replace(t, hit)
  if (t.includes('\n\n')) return s.replace(t, t.split('\n\n').map((x) => tr(x, l)).join('\n\n'))
  let m = t.match(/^há (.+)$/)
  if (m) return s.replace(t, l === 'en' ? `${tr(m[1], l)} ago` : `hace ${tr(m[1], l)}`)
  if (t.includes('SEU_LINK_PESSOAL')) return s.replace('SEU_LINK_PESSOAL', l === 'en' ? 'YOUR_PERSONAL_LINK' : 'TU_ENLACE_PERSONAL')
  if (/\/mês$/.test(t)) return s.replace('/mês', l === 'en' ? '/mo' : '/mes')
  m = t.match(/^(.+) hoje\.$/)
  if (m) return s.replace(t, l === 'en' ? `${tr(m[1], l)} today.` : `${tr(m[1], l)} hoy.`)
  m = t.match(/^Buscar (.+)$/)
  if (m) return s.replace(t, `${l === 'en' ? 'Search' : 'Buscar'} ${tr(m[1], l)}`)
  m = t.match(/^Passo (\d+) de (\d+)$/)
  if (m) return s.replace(t, l === 'en' ? `Step ${m[1]} of ${m[2]}` : `Paso ${m[1]} de ${m[2]}`)
  const ck = l + t
  let out = cache.get(ck)
  if (out == null) {
    out = t
    if (t.length > 3) {
      for (const f of FRAGS) {
        if (out.includes(f)) out = out.replace(new RegExp(`(^|[^\\p{L}])${esc(f)}(?=$|[^\\p{L}])`, 'gu'), (_m, p) => p + D[f][l])
      }
    }
    cache.set(ck, out)
  }
  return s.replace(t, out)
}

const ATTRS = ['placeholder', 'title', 'aria-label']
const done = new WeakMap<Node, string>()
const outs = new Set<string>()

function apply(n: Node) {
  if (n.nodeType === 3) {
    const v = n.nodeValue ?? ''
    if (done.get(n) === v) return
    const p = n.parentElement
    if (p && (p.closest('[data-no-tr]') || p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'PRE' || p.tagName === 'CODE')) return
    const o = tr(v)
    if (o !== v) n.nodeValue = o
    done.set(n, o)
    return
  }
  if (n.nodeType !== 1) return
  const el = n as Element
  if (el.closest('[data-no-tr]')) return
  for (const a of ATTRS) {
    const v = el.getAttribute(a)
    if (v && !outs.has(v)) { const o = tr(v); outs.add(o); if (o !== v) el.setAttribute(a, o) }
  }
  if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && el.value) el.value = tr(el.value)
  n.childNodes.forEach(apply)
}

export function startI18n() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang
  if (lang === 'pt') return
  // toasts / alerts / confirm dialogs use plain strings
  const oc = window.confirm.bind(window); window.confirm = (m?: string) => oc(m ? tr(m) : m)
  const oa = window.alert.bind(window); window.alert = (m?: unknown) => oa(typeof m === 'string' ? tr(m) : m)
  const titleObs = () => { const t = tr(document.title); if (t !== document.title) document.title = t }
  const run = () => {
    apply(document.body)
    titleObs()
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData') apply(m.target)
        else if (m.type === 'attributes') apply(m.target)
        else m.addedNodes.forEach(apply)
      }
      titleObs()
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })
  }
  if (document.body) run(); else addEventListener('DOMContentLoaded', run)
}
