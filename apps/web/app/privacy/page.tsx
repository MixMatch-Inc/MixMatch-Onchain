import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy' };

export default function Privacy() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>Privacy</h1>
      <p>
        How MixMatch handles personal data is described in the{' '}
        <a href="https://github.com/MixMatch-Inc/MixMatch-Onchain/blob/develop/docs/privacy-policy.md">privacy policy</a>.
      </p>
      <p><Link href="/">Back to home</Link></p>
    </main>
  );
}
