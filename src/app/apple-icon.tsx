import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: 'linear-gradient(135deg, #181818, #0a0a0a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 138,
            fontWeight: 900,
            color: '#C4A86C',
            lineHeight: 1,
            letterSpacing: -4,
            marginTop: -4,
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size }
  )
}
