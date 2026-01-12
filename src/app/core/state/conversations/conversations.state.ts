import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { ConversationsApi } from '../../api/conversations-api-service';
import { Conversation, UUID } from '../../models/chat.models';
import {
  CreateConversation,
  LoadConversations,
  RenameConversation,
  SelectConversation,
} from './conversations.actions';

export interface ConversationsStateModel {
  conversations: Conversation[];
  selectedConversationId: UUID | null;
  loading: boolean;
  error?: string;
}

@State<ConversationsStateModel>({
  name: 'conversations',
  defaults: {
    conversations: [],
    selectedConversationId: null,
    loading: false,
  },
})
@Injectable()
export class ConversationsState {
  constructor(private api: ConversationsApi) {}

  @Selector()
  static conversations(s: ConversationsStateModel) {
    return s.conversations;
  }

  @Selector()
  static selectedConversationId(s: ConversationsStateModel) {
    return s.selectedConversationId;
  }

  @Selector()
  static selectedConversation(s: ConversationsStateModel) {
    return s.conversations.find((c) => c.id === s.selectedConversationId) ?? null;
  }

  @Selector()
  static loading(s: ConversationsStateModel) {
    return s.loading;
  }

  @Action(LoadConversations)
  load(ctx: StateContext<ConversationsStateModel>) {
    ctx.patchState({ loading: true, error: undefined });
    return this.api.list().pipe(
      tap((conversations) => ctx.patchState({ conversations, loading: false })),
      catchError((err) => {
        ctx.patchState({ loading: false, error: String(err) });
        return of(null);
      })
    );
  }

  @Action(CreateConversation)
  create(ctx: StateContext<ConversationsStateModel>, a: CreateConversation) {
    ctx.patchState({ loading: true, error: undefined });
    return this.api.create(a.title).pipe(
      tap((res) => {
        // Optimistisch: direkt neu laden, oder local push. Ich lade neu, weil wir nicht sicher wissen,
        // was serverseitig alles gesetzt wird (title defaults, timestamps etc).
        ctx.patchState({ selectedConversationId: res.id });
      }),
      tap(() => ctx.dispatch(new LoadConversations())),
      catchError((err) => {
        ctx.patchState({ loading: false, error: String(err) });
        return of(null);
      })
    );
  }

  @Action(RenameConversation)
  rename(ctx: StateContext<ConversationsStateModel>, a: RenameConversation) {
    return this.api.rename(a.id, a.title).pipe(
      tap(() => ctx.dispatch(new LoadConversations())),
      catchError((err) => {
        ctx.patchState({ error: String(err) });
        return of(null);
      })
    );
  }

  @Action(SelectConversation)
  select(ctx: StateContext<ConversationsStateModel>, a: SelectConversation) {
    ctx.patchState({ selectedConversationId: a.id });
  }
}
