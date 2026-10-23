export const brl = (v: number, digits = 4) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)

export const money = (v: number, currency = 'BRL', digits = 2) => {
  const c = currency === 'USDT' ? 'USD' : currency
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
  } catch {
    return `${currency} ${num(v, digits)}`
  }
}

export const num = (v: number, digits = 2) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)

export const compact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

export const pct = (v: number, digits = 2) => `${v >= 0 ? '+' : ''}${num(v, digits)}%`

export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'agora'
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  return `${Math.floor(s / 86400)} d`
}

export const dateBR = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString('pt-BR', withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
