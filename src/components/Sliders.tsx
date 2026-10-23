import { useState } from 'react'
import { ORDER, useQuotes } from '../lib/rates'
import { num } from '../lib/format'

/* The two dashboard sliders from the classic app: live quotes and brands. */

type Brand = { name: string; slug: string; url: string; color: string; darkColor?: string; lightColor?: string; logoUrl?: string }
const BRANDS: Brand[] = [
  { name: 'Amazon', slug: 'amazon', url: 'https://www.amazon.com', color: 'FF9900' },
  { name: 'Shein', slug: 'shein', url: 'https://www.shein.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'Shopee', slug: 'shopee', url: 'https://shopee.com.br', color: 'EE4D2D' },
  { name: 'AliExpress', slug: 'aliexpress', url: 'https://aliexpress.com', color: 'FF4747' },
  { name: 'Temu', slug: 'temu', url: 'https://www.temu.com', color: 'FB7701' },
  { name: 'eBay', slug: 'ebay', url: 'https://www.ebay.com', color: 'E53238' },
  { name: 'Walmart', slug: 'walmart', url: 'https://www.walmart.com', color: '0071CE' },
  { name: 'Alibaba', slug: 'alibaba', url: 'https://www.alibaba.com', color: 'FF6A00' },
  { name: 'Etsy', slug: 'etsy', url: 'https://www.etsy.com', color: 'F16521' },
  { name: 'Wish', slug: 'wish', url: 'https://www.wish.com', color: '32E66D' },
  { name: 'ASOS', slug: 'asos', url: 'https://www.asos.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'Zara', slug: 'zara', url: 'https://www.zara.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'H&M', slug: 'handm', url: 'https://www2.hm.com', color: 'E50010' },
  { name: 'Nike', slug: 'nike', url: 'https://www.nike.com', color: '111111', darkColor: 'FFFFFF' },
  { name: 'Adidas', slug: 'adidas', url: 'https://www.adidas.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'Apple', slug: 'apple', url: 'https://www.apple.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'Samsung', slug: 'samsung', url: 'https://www.samsung.com', color: '1428A0' },
  { name: 'Microsoft', slug: 'microsoft', url: 'https://www.microsoft.com', color: '5E5E5E', darkColor: 'FFFFFF' },
  { name: 'Best Buy', slug: 'bestbuy', url: 'https://www.bestbuy.com', color: '0046BE' },
  { name: 'Target', slug: 'target', url: 'https://www.target.com', color: 'CC0000' },
  { name: 'Farfetch', slug: 'farfetch', url: 'https://www.farfetch.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'Steam', slug: 'steam', url: 'https://store.steampowered.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'PlayStation', slug: 'playstation', url: 'https://www.playstation.com', color: '003791', darkColor: 'FFFFFF' },
  { name: 'Nintendo', slug: 'nintendo', url: 'https://www.nintendo.com', color: 'E60012' },
  { name: 'Booking', slug: 'bookingdotcom', url: 'https://www.booking.com', color: '003580' },
  { name: 'Airbnb', slug: 'airbnb', url: 'https://www.airbnb.com', color: 'FF5A5F' },
  { name: 'Uber', slug: 'uber', url: 'https://www.uber.com', color: '000000', darkColor: 'FFFFFF' },
  { name: 'Netflix', slug: 'netflix', url: 'https://www.netflix.com', color: 'E50914' },
  { name: 'Inter', slug: 'bancointer', url: 'https://www.bancointer.com.br', color: 'FF7A00', logoUrl: 'https://www.google.com/s2/favicons?domain=bancointer.com.br&sz=64' },
  { name: 'C6', slug: 'c6', url: 'https://www.c6bank.com.br', color: '242424', darkColor: 'FFFFFF' },
  { name: 'Nubank', slug: 'nubank', url: 'https://nubank.com.br', color: '820AD1' },
  { name: 'Wise', slug: 'wise', url: 'https://wise.com', color: '9FE870', lightColor: '3F7A16' },
  { name: 'Nomad', slug: 'nomad', url: 'https://www.nomadglobal.com', color: 'E5B500' },
  { name: 'Binance', slug: 'binance', url: 'https://www.binance.com', color: 'F0B90B' },
  { name: 'Bybit', slug: 'bybit', url: 'https://www.bybit.com', color: 'F7A600', darkColor: 'FFC233' },
  { name: 'Remessa Online', slug: 'remessaonline', url: 'https://www.remessaonline.com.br', color: '00A859' },
  { name: 'Western Union', slug: 'westernunion', url: 'https://www.westernunion.com', color: 'FFDD00', lightColor: 'B58A00' },
  { name: 'Avenue', slug: 'avenue', url: 'https://www.avenue.us', color: '006D5B' },
  { name: 'Payoneer', slug: 'payoneer', url: 'https://www.payoneer.com', color: 'FF4800' },
  { name: 'Husky', slug: 'husky', url: 'https://husky.io', color: '000000', darkColor: 'FFFFFF', logoUrl: 'https://www.google.com/s2/favicons?domain=husky.io&sz=64' },
  { name: 'Spotify', slug: 'spotify', url: 'https://www.spotify.com', color: '1DB954' },
]

function BrandLogo({ b, dark }: { b: Brand; dark: boolean }) {
  const color = dark ? b.darkColor ?? b.color : b.lightColor ?? b.color
  const favicon = `https://www.google.com/s2/favicons?domain=${b.url.replace(/^https?:\/\//, '').split('/')[0]}&sz=64`
  const [src, setSrc] = useState(b.logoUrl ?? `https://cdn.simpleicons.org/${b.slug}/${color}`)
  const [hidden, setHidden] = useState(false)
  if (hidden) return <span className="brand-dot" style={{ background: `#${color}` }}>{b.name[0]}</span>
  return <img src={src} alt="" width={18} height={18} onError={() => (src === favicon ? setHidden(true) : setSrc(favicon))} />
}

export function QuotesSlider() {
  const { data } = useQuotes()
  const items = ORDER.filter((c) => data?.[c]).map((c) => data![c])
  if (!items.length) return <div className="slider" />
  const row = items.map((q) => (
    <span className="slide" key={q.code}>
      <span className="slide-flag">{q.flag}</span>
      <span className="slide-name">{q.short}</span>
      <b className="mono">{q.prefix} {num(q.bid, q.code === 'BTC' || q.code === 'ETH' ? 2 : 4)}</b>
      <span className={`mono slide-d ${q.pctChange > 0 ? 'up' : q.pctChange < 0 ? 'down' : 'faint'}`}>{q.pctChange >= 0 ? '+' : ''}{num(q.pctChange, 2)}%</span>
    </span>
  ))
  return (
    <div className="slider" aria-label="Cotações ao vivo">
      <div className="slider-track">{row}{row.map((r, i) => <span key={i} style={{ display: 'contents' }}>{r}</span>)}</div>
    </div>
  )
}

export function BrandsSlider() {
  const dark = document.documentElement.dataset.theme === 'dark'
  const row = BRANDS.map((b) => (
    <a className="slide brand" key={b.slug} href={b.url} target="_blank" rel="noreferrer" title={b.name}>
      <BrandLogo b={b} dark={dark} />
      <span className="slide-name">{b.name}</span>
    </a>
  ))
  return (
    <div className="slider slow" aria-label="Marcas">
      <div className="slider-track">{row}{row.map((r, i) => <span key={i} style={{ display: 'contents' }}>{r}</span>)}</div>
    </div>
  )
}
