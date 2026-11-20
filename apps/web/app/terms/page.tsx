import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms' };

export default function Terms() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>Terms of service</h1>
      <p>The terms of service have not been published yet.</p>
      <p><Link href="/">Back to home</Link></p>
    </main>
  );
}
