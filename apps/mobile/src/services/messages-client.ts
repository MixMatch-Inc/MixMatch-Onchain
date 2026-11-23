import { authHeaders, request } from './api-client';

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  delivery_state: string;
  created_at?: string | null;
}

export function listMessages(otherUserId: string, accessToken: string): Promise<ChatMessage[]> {
  return request<{ messages: ChatMessage[] }>(`/messages/${encodeURIComponent(otherUserId)}`, {
    headers: authHeaders(accessToken),
  }).then((r) => r.messages || []);
}

export function sendMessage(input: { recipient_id: string; body: string }, accessToken: string): Promise<ChatMessage> {
  return request<{ message: ChatMessage }>('/messages', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  }).then((r) => r.message);
}
