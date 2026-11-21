import Link from 'next/link';
import { AuthRedirect } from '../components/AuthRedirect';

export default function Landing() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 16px' }}>
      <AuthRedirect />
      <h1 style={{ fontSize: 40, lineHeight: 1.1 }}>Meet people. Pay them on-chain.</h1>
      <p style={{ fontSize: 18, margin: '16px 0 24px' }}>
        MixMatch connects people through shared taste and lets you send money to a match in seconds over Stellar,
        with clear status on every payment and escrow for bigger deals.
      </p>
      <p>
        <Link href="/login" style={{ fontWeight: 700 }}>Sign in or create an account</Link>
      </p>
      <ul style={{ margin: '32px 0', paddingLeft: 20 }}>
        <li>Send and receive Stellar payments with live status updates</li>
        <li>Deposit and withdraw through anchored assets</li>
        <li>Block and report anyone who makes you uncomfortable</li>
      </ul>
      <footer style={{ borderTop: '1px solid #ddd', paddingTop: 16 }}>
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
      </footer>
    </main>
  );
}
