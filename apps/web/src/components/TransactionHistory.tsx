import type { TransactionRecord } from '@mixmatch/shared';
import Link from 'next/link';

export interface TransactionHistoryProps {
  transactions: TransactionRecord[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function TransactionHistory({ transactions, total, page, limit, onPageChange }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return <p>No transactions yet.</p>;
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <section aria-label="Transaction history">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Recipient</th>
            <th>Amount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{new Date(transaction.createdAt).toLocaleString()}</td>
              <td>{transaction.destinationPublicKey}</td>
              <td>{transaction.amount} XLM</td>
              <td>{transaction.status}</td>
              <td>
                <Link href={`/payments/${transaction.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <nav aria-label="Pagination">
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
