import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MessageVariant, UUID } from '../models/chat.models';
import { AuthService } from './auth-service';

@Injectable({ providedIn: 'root' })
export class MessagesApi {
  constructor(private http: HttpClient, private authService: AuthService) {}

  listVariants(messageId: UUID): Observable<MessageVariant[]> {
    return this.http.get<MessageVariant[]>(`/api/messages/${messageId}/variants`);
  }

  setActiveVariant(messageId: UUID, variantId: UUID): Observable<void> {
    return this.http.patch<void>(`/api/messages/${messageId}/active-variant`, { variantId });
  }

  softDelete(messageId: UUID): Observable<void> {
    return this.http.delete<void>(`/api/messages/${messageId}`);
  }

  regenerate(messageId: UUID, model?: string, temperature?: number): Observable<void> {
    return this.http.post<void>(`/api/messages/${messageId}/variants/regenerate`, {
      model,
      temperature,
    });
  }

  continue(messageId: UUID, model?: string, temperature?: number): Observable<void> {
    return this.http.post<void>(`/api/messages/${messageId}/variants/continue`, {
      model,
      temperature,
    });
  }
}
