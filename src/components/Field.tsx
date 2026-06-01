'use client'

interface Props {
  placeholder: string
  type?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function Field({ placeholder, type = 'text', value, onChange }: Props) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full px-[18px] py-[16px] border border-[#E0D9C7] rounded-[14px] bg-white/60 text-[14px] text-[#5C544A] placeholder:text-[#5C544A]/60 outline-none focus:border-[#00643E] transition-colors"
    />
  )
}
