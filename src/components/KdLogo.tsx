interface Props { size?: number; dark?: boolean }

export default function KdLogo({ size = 36, dark = false }: Props) {
  const fill = dark ? '#ffffff' : '#0B0A1A'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer rounded square background */}
      <rect width="40" height="40" rx="10" fill={dark ? '#0B0A1A' : '#F3F4F6'} />
      {/* K shape */}
      <rect x="8" y="8" width="4" height="24" rx="1.5" fill={fill} />
      <path d="M12 20 L22 8" stroke={fill} strokeWidth="4" strokeLinecap="round" />
      <path d="M12 20 L22 32" stroke={fill} strokeWidth="4" strokeLinecap="round" />
      {/* D shape */}
      <rect x="24" y="8" width="3.5" height="24" rx="1.5" fill={fill} />
      <path d="M27.5 8 Q36 8 36 20 Q36 32 27.5 32" stroke={fill} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}
