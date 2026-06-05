export default function Flower({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx="50" cy="30" rx="12" ry="18" fill="#F5C2C8" transform={`rotate(${deg} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="9" fill="#00643E" />
      <circle cx="50" cy="50" r="4" fill="#FFE8A0" />
    </svg>
  )
}
