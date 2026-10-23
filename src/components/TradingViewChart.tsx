import { useEffect, useRef } from 'react'

/** TradingView "Advanced Chart" embed — same widget and options as the classic admin Gráfico. */
export default function TradingViewChart({ symbol, interval, dark, candles = true, grid = true, logo = true }: { symbol: string; interval: string; dark: boolean; candles?: boolean; grid?: boolean; logo?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current
    if (!host) return
    host.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>'
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    s.type = 'text/javascript'
    s.async = true
    s.innerHTML = JSON.stringify({
      allow_symbol_change: true, calendar: false, details: false, hide_side_toolbar: true, hide_top_toolbar: false,
      hide_legend: false, hide_volume: false, hotlist: false, interval, locale: 'br', save_image: true,
      style: candles ? '1' : '3', symbol, theme: dark ? 'dark' : 'light', timezone: 'America/Sao_Paulo',
      backgroundColor: dark ? '#131823' : '#ffffff', gridColor: !grid ? 'rgba(0, 0, 0, 0)' : dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(17, 24, 39, 0.05)', show_symbol_logo: logo,
      watchlist: [], withdateranges: false, autosize: true,
    })
    host.appendChild(s)
    return () => { host.innerHTML = '' }
  }, [symbol, interval, dark, candles, grid, logo])
  return <div ref={ref} className="tradingview-widget-container" style={{ height: '100%', width: '100%' }} />
}
