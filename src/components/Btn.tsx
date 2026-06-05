'use client'

interface Props {
  children: React.ReactNode
  variant?: 'primary' | 'ghost' | 'kakao' | 'paper'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}

const styles = {
  primary: 'bg-[#00643E] text-white',
  ghost:   'bg-transparent text-[#1A1816] border border-[#1A1816]',
  kakao:   'bg-[#FEE500] text-[#191919]',
  paper:   'bg-white text-[#1A1816] border border-[#E0D9C7]',
}

export default function Btn({ children, variant = 'primary', onClick, disabled, type = 'button' }: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-[18px] px-[22px] rounded-2xl text-[15px] font-semibold tracking-tight cursor-pointer transition-opacity disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
