interface Props {
  size?: number
}

// Avatar.tsx와 같은 톤: 둥근 형태 + 두 톤 + 따뜻한 색 + 작은 디테일
export default function HouseIcon({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 0.5px rgba(40,28,16,0.6)) drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}>
      {/* 지붕 (둥근 삼각형 느낌) */}
      <path d="M12 3 L3 11 Q3 12 4 12 L20 12 Q21 12 21 11 Z" fill="#D87858" />
      {/* 몸체 */}
      <rect x="5" y="11" width="14" height="10" rx="1.5" fill="#F4C2A1" />
      {/* 문 */}
      <rect x="10" y="14" width="4" height="7" rx="1" fill="#8C4838" />
      {/* 문 손잡이 */}
      <circle cx="13" cy="18" r="0.5" fill="#F5E0B8" />
      {/* 창문 */}
      <circle cx="7.5" cy="15" r="1" fill="#FFF6E0" />
      {/* 굴뚝 */}
      <rect x="15.5" y="5" width="2" height="4" rx="0.4" fill="#8C4838" />
    </svg>
  )
}
