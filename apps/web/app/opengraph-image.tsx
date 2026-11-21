import { ImageResponse } from 'next/og';

export const alt = 'MixMatch Onchain';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Social preview card generated at build time (no binary asset to maintain). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#4F46E5',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700 }}>MixMatch</div>
        <div style={{ fontSize: 40, marginTop: 16 }}>Match, chat and pay on Stellar</div>
      </div>
    ),
    size,
  );
}
