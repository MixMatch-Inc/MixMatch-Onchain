'use client';

import { useState } from 'react';

export interface Transaction {
  hash: string;
  amount: string;
  asset: string;
  from: string;
  to: string;
  timestamp: Date;
  memo?: string;
}

export interface TransactionHistoryProps {
  transactions: Transaction[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function TransactionHistory({ transactions, totalPages, currentPage, onPageChange }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div>
        <h2>Transaction History</h2>
        <p>No transactions found.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Transaction History</h2>
      <table>
        <thead>
          <tr>
            <th>Hash</th>
            <th>Amount</th>
            <th>Asset</th>
            <th>From</th>
            <th>To</th>
            <th>Date</th>
            <th>Memo</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.hash}>
              <td>{tx.hash.slice(0, 8)}...</td>
              <td>{tx.amount}</td>
              <td>{tx.asset}</td>
              <td>{tx.from.slice(0, 8)}...</td>
              <td>{tx.to.slice(0, 8)}...</td>
              <td>{new Date(tx.timestamp).toLocaleDateString()}</td>
              <td>{tx.memo ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
