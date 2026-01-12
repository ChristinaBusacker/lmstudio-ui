import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatRequestMessage, ChatResponse, UUID } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class LmstudioApi {
  constructor(private http: HttpClient) {}

  models(): Observable<any> {
    return this.http.get('/api/lmstudio/models');
  }

  chat(req: {
    conversationId?: UUID;
    model?: string;
    temperature?: number;
    messages: ChatRequestMessage[];
  }): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/lmstudio/chat', req);
  }
}
