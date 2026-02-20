import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: 'linear-gradient(135deg, #181818, #0a0a0a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 25,
            fontWeight: 900,
            color: '#C4A86C',
            lineHeight: 1,
            letterSpacing: -1,
            marginTop: -1,
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size }
  )
}
