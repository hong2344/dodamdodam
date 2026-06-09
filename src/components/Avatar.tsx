import { Avatar as AvatarType } from '@/types'

const palette: Record<AvatarType, { fur: string; ear: string; accent: string }> = {
  cat:      { fur: '#C8C2BA', ear: '#B5AFA6', accent: '#FFC4D2' },
  rabbit:   { fur: '#F5E0E5', ear: '#E8C7CE', accent: '#FFC4D2' },
  bear:     { fur: '#B89070', ear: '#9C7656', accent: '#E89870' },
  frog:     { fur: '#9BB87A', ear: '#7EA058', accent: '#C8E0A0' },
  hedgehog: { fur: '#A88F70', ear: '#8A7355', accent: '#E0C8A0' },
  dog:      { fur: '#E8D5B0', ear: '#C9B088', accent: '#F8E0B8' },
  ai:       { fur: '#CDE8DD', ear: '#00643E', accent: '#00643E' },
}

interface Props {
  kind: AvatarType
  size?: number
  label?: string
}

export default function Avatar({ kind, size = 80, label }: Props) {
  const p = palette[kind]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 0.8px rgba(40,28,16,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.22))' }}>
        <circle cx="50" cy="56" r="34" fill={p.fur} />
        {kind === 'cat' && (<><polygon points="22,38 30,18 40,32" fill={p.ear} /><polygon points="78,38 70,18 60,32" fill={p.ear} /></>)}
        {kind === 'rabbit' && (<><ellipse cx="36" cy="20" rx="6" ry="18" fill={p.ear} /><ellipse cx="64" cy="20" rx="6" ry="18" fill={p.ear} /><ellipse cx="36" cy="22" rx="3" ry="13" fill="#FFD4DC" /><ellipse cx="64" cy="22" rx="3" ry="13" fill="#FFD4DC" /></>)}
        {kind === 'bear' && (<><circle cx="26" cy="32" r="10" fill={p.ear} /><circle cx="74" cy="32" r="10" fill={p.ear} /><circle cx="26" cy="32" r="5" fill={p.accent} /><circle cx="74" cy="32" r="5" fill={p.accent} /></>)}
        {kind === 'frog' && (<><circle cx="30" cy="32" r="13" fill={p.fur} /><circle cx="70" cy="32" r="13" fill={p.fur} /></>)}
        {kind === 'hedgehog' && Array.from({ length: 9 }).map((_, i) => {
          const a = (-90 + (i - 4) * 14) * Math.PI / 180
          const round = (n: number) => Math.round(n * 1000) / 1000
          return <line key={i} x1={round(50 + Math.cos(a) * 30)} y1={round(56 + Math.sin(a) * 30)} x2={round(50 + Math.cos(a) * 44)} y2={round(56 + Math.sin(a) * 44)} stroke="#5C4530" strokeWidth="2.2" strokeLinecap="round" />
        })}
        {kind === 'dog' && (<><ellipse cx="24" cy="44" rx="10" ry="16" fill={p.ear} /><ellipse cx="76" cy="44" rx="10" ry="16" fill={p.ear} /></>)}
        {kind === 'ai' && (<><line x1="50" y1="23" x2="50" y2="11" stroke={p.ear} strokeWidth="2.6" strokeLinecap="round" /><circle cx="50" cy="8" r="4" fill={p.ear} /></>)}
        {kind === 'frog'
          ? (<><circle cx="30" cy="30" r="4" fill="#1A1816" /><circle cx="70" cy="30" r="4" fill="#1A1816" /></>)
          : (<><circle cx="40" cy="54" r="2.6" fill="#1A1816" /><circle cx="60" cy="54" r="2.6" fill="#1A1816" /></>)}
        {kind === 'cat' && (<><circle cx="50" cy="63" r="2.2" fill="#1A1816" /><path d="M50 65 Q46 70 42 68 M50 65 Q54 70 58 68" stroke="#1A1816" strokeWidth="1.5" fill="none" strokeLinecap="round" /></>)}
        {kind === 'rabbit' && <path d="M50 62 Q47 67 43 65 M50 62 Q53 67 57 65" stroke="#1A1816" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
        {kind === 'bear' && (<><ellipse cx="50" cy="65" rx="10" ry="7" fill={p.accent} /><circle cx="50" cy="62" r="2.2" fill="#1A1816" /></>)}
        {kind === 'frog' && <path d="M40 68 Q50 76 60 68" stroke="#1A1816" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
        {kind === 'hedgehog' && (<><circle cx="50" cy="64" r="2.2" fill="#1A1816" /><path d="M50 66 Q47 70 44 69 M50 66 Q53 70 56 69" stroke="#1A1816" strokeWidth="1.4" fill="none" strokeLinecap="round" /></>)}
        {kind === 'dog' && (<><ellipse cx="50" cy="65" rx="7" ry="5" fill={p.accent} /><ellipse cx="50" cy="62" rx="2.4" ry="2" fill="#1A1816" /></>)}
        {kind === 'ai' && <path d="M42 64 Q50 71 58 64" stroke="#1A1816" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
        <circle cx="32" cy="62" r="3" fill="#F5B0B8" opacity="0.5" />
        <circle cx="68" cy="62" r="3" fill="#F5B0B8" opacity="0.5" />
      </svg>
      {label && <span className="text-xs font-medium">{label}</span>}
    </div>
  )
}
