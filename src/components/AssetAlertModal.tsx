import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { Hint, Modal, Seg, toast } from './ui'
import { ALERT_FRAMES, addAlert } from '../lib/assetAlerts'
import { zoneOf } from '../lib/market'

export type AlertTarget = { symbol: string; ticker: string; name: string; logo?: string | null; cls: string }

/** Radar popup for any asset of any class: pick the timeframe and the target Treend index. */
export default function AssetAlertModal({ asset, frame = 'd1', current, onClose }: { asset: AlertTarget; frame?: string; current?: number | null; onClose: () => void }) {
  const [f, setF] = useState(frame)
  const [target, setTarget] = useState(() => Math.min(95, Math.max(70, Math.ceil(((current ?? 60) + 10) / 5) * 5)))
  const [notify, setNotify] = useState(true)
  const z = zoneOf(current ?? null)
  const create = async () => {
    if (notify && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission() } catch { /* ignore */ } }
    addAlert({ symbol: asset.symbol, ticker: asset.ticker, name: asset.name, logo: asset.logo, cls: asset.cls, frame: f, target, notify })
    toast('Radar criado — avisaremos quando a meta for atingida')
    onClose()
  }
  return (
    <Modal open onClose={onClose}>
      <div className="row gap-12" style={{ marginBottom: 6 }}>
        <span className="asset-logo" style={{ width: 42, height: 42 }}>{asset.logo ? <img src={asset.logo} alt="" /> : <b style={{ fontSize: 14 }}>{asset.ticker.slice(0, 2)}</b>}</span>
        <div>
          <h3 style={{ margin: 0 }}>Radar · {asset.ticker}</h3>
          <div className="small muted">{asset.name}{current != null && <> · índice atual <b style={{ color: z.c }}>{Math.round(current)}</b></>}</div>
        </div>
      </div>
      <div className="stack gap-16" style={{ marginTop: 18 }}>
        <div className="field"><label>Tempo gráfico<Hint text="O radar acompanha o índice Treend no tempo gráfico escolhido." /></label><Seg value={f} onChange={setF} options={ALERT_FRAMES.map((x) => ({ value: x.key, label: x.label }))} /></div>
        <div className="field">
          <div className="row between"><label>Avise quando o índice chegar a</label><b className="mono" style={{ fontSize: 18 }}>{target}</b></div>
          <input type="range" min={50} max={100} step={5} value={target} onChange={(e) => setTarget(+e.target.value)} />
          <div className="row between tiny faint"><span>50 · interessante</span><span>100 · máxima</span></div>
        </div>
        <label className="row gap-8 small" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ accentColor: 'var(--brand)', width: 16, height: 16 }} />
          Notificação no navegador
        </label>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Agora não</button>
          <button className="btn primary" onClick={create}><BellRing /> Criar radar</button>
        </div>
      </div>
    </Modal>
  )
}
