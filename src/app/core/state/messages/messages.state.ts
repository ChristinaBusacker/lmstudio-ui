import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { ConversationsApi } from '../../api/conversations-api-service';
import { MessagesApi } from '../../api/messages-api-service';
import { ChatMessage, MessageVariant, UUID } from '../../models/chat.models';
import { DeleteMessage, LoadMessages, LoadVariants, SetActiveVariant } from './messages.actions';

export interface MessagesStateModel {
  messagesByConversation: Record<UUID, ChatMessage[]>;
  variantsByMessage: Record<UUID, MessageVariant[]>;
  loadingConversations: Record<UUID, boolean>;
  error?: string;
}

@State<MessagesStateModel>({
  name: 'messages',
  defaults: {
    messagesByConversation: {},
    variantsByMessage: {},
    loadingConversations: {},
  },
})
@Injectable()
export class MessagesState {
  constructor(private conversationsApi: ConversationsApi, private messagesApi: MessagesApi) {}

  // Selector factory: Messages für eine Conversation holen
  static messagesForConversation(conversationId: UUID) {
    return (s: { messages: MessagesStateModel }) =>
      s.messages.messagesByConversation[conversationId] ?? [];
  }

  @Selector()
  static error(s: MessagesStateModel) {
    return s.error;
  }

  @Action(LoadMessages)
  loadMessages(ctx: StateContext<MessagesStateModel>, a: LoadMessages) {
    const state = ctx.getState();
    ctx.patchState({
      loadingConversations: { ...state.loadingConversations, [a.conversationId]: true },
      error: undefined,
    });

    return this.conversationsApi.listMessages(a.conversationId).pipe(
      tap((messages) => {
        const s = ctx.getState();
        ctx.patchState({
          messagesByConversation: { ...s.messagesByConversation, [a.conversationId]: messages },
          loadingConversations: { ...s.loadingConversations, [a.conversationId]: false },
        });
      }),
      catchError((err) => {
        const s = ctx.getState();
        ctx.patchState({
          loadingConversations: { ...s.loadingConversations, [a.conversationId]: false },
          error: String(err),
        });
        return of(null);
      })
    );
  }

  @Action(LoadVariants)
  loadVariants(ctx: StateContext<MessagesStateModel>, a: LoadVariants) {
    return this.messagesApi.listVariants(a.messageId).pipe(
      tap((variants) => {
        const s = ctx.getState();
        ctx.patchState({
          variantsByMessage: { ...s.variantsByMessage, [a.messageId]: variants },
        });
      }),
      catchError((err) => {
        ctx.patchState({ error: String(err) });
        return of(null);
      })
    );
  }

  @Action(SetActiveVariant)
  setActive(ctx: StateContext<MessagesStateModel>, a: SetActiveVariant) {
    return this.messagesApi.setActiveVariant(a.messageId, a.variantId).pipe(
      // Danach Varianten neu laden (und ggf. Conversation messages refreshen, falls active content dort auftaucht)
      tap(() => ctx.dispatch(new LoadVariants(a.messageId))),
      catchError((err) => {
        ctx.patchState({ error: String(err) });
        return of(null);
      })
    );
  }

  @Action(DeleteMessage)
  delete(ctx: StateContext<MessagesStateModel>, a: DeleteMessage) {
    return this.messagesApi.softDelete(a.messageId).pipe(
      tap(() => ctx.dispatch(new LoadMessages(a.conversationId))),
      catchError((err) => {
        ctx.patchState({ error: String(err) });
        return of(null);
      })
    );
  }
}
