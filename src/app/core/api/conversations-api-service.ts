import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Conversation, ChatMessage, UUID } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ConversationsApi {
  constructor(private http: HttpClient) {}

  list(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>('/api/conversations');
  }

  create(title?: string): Observable<{ id: UUID }> {
    return this.http.post<{ id: UUID }>('/api/conversations', { title });
  }

  rename(id: UUID, title: string | null): Observable<void> {
    return this.http.patch<void>(`/api/conversations/${id}`, { title });
  }

  listMessages(conversationId: UUID): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`/api/conversations/${conversationId}/messages`);
  }
}
