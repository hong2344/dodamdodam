interface Props {
  children: React.ReactNode
  dark?: boolean
}

export default function Chip({ children, dark = false }: Props) {
  return (
    <span className={`inline-block font-mono text-[10px] font-medium tracking-[0.12em] uppercase px-[9px] py-[4px] rounded-full ${dark ? 'bg-[#1A1816] text-[#F5F0E6]' : 'border border-[#1A1816] text-[#1A1816]'}`}>
      {children}
    </span>
  )
}
