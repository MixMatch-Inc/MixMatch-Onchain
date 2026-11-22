import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms' };

export default function Terms() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>Terms of service</h1>
      <p>
        MixMatch provides a self-custodial payment and discovery experience. You are responsible for safeguarding your wallet credentials and for complying with applicable law.
      </p>
      <p><Link href="/">Back to home</Link></p>
    </main>
  );
}
