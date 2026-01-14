import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { Subscription, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { LmstudioApi } from '../../api/lmstudio-api-service';
import { LmstudioStreamService } from '../../api/lmstudio-stream-service';
import { ChatRequestMessage, UUID } from '../../models/chat.models';
import { LoadMessages } from '../messages/messages.actions';
import { SelectConversation } from '../conversations/conversations.actions';
import { AbortChatStream, SendChatNonStream, SendChatStream } from './chat.actions';

export interface ChatStateModel {
  isStreaming: boolean;
  draftAssistantText: string;
  draftReasoningText: string;
  conversationId: UUID | null;
  lastAssistantMessageId: UUID | null;
  error?: string;
}

@State<ChatStateModel>({
  name: 'chat',
  defaults: {
    isStreaming: false,
    draftAssistantText: '',
    draftReasoningText: '',
    conversationId: null,
    lastAssistantMessageId: null,
  },
})
@Injectable()
export class ChatState {
  private streamSub?: Subscription;

  constructor(
    private api: LmstudioApi,
    private stream: LmstudioStreamService,
    private store: Store
  ) {}

  @Selector()
  static isStreaming(s: ChatStateModel) {
    return s.isStreaming;
  }

  @Selector()
  static draftAssistantText(s: ChatStateModel) {
    return s.draftAssistantText;
  }

  @Selector()
  static draftReasoning(s: ChatStateModel) {
    return s.draftReasoningText;
  }

  @Selector()
  static conversationId(s: ChatStateModel) {
    return s.conversationId;
  }

  @Selector()
  static error(s: ChatStateModel) {
    return s.error;
  }

  @Action(SendChatNonStream)
  sendNonStream(ctx: StateContext<ChatStateModel>, a: SendChatNonStream) {
    ctx.patchState({ error: undefined, draftAssistantText: '' });

    return this.api.chat(a.payload).pipe(
      tap((res) => {
        ctx.patchState({
          conversationId: res.conversationId,
          lastAssistantMessageId: res.createdAssistantMessageId,
          draftAssistantText: res.assistantText ?? '',
        });

        // Conversation ggf. auswählen und Messages reload
        this.store.dispatch(new SelectConversation(res.conversationId));
        this.store.dispatch(new LoadMessages(res.conversationId));
      }),
      catchError((err) => {
        ctx.patchState({ error: String(err) });
        return of(null);
      })
    );
  }

  @Action(SendChatStream)
  sendStream(ctx: StateContext<ChatStateModel>, a: SendChatStream) {
    // Abort old stream if running
    this.streamSub?.unsubscribe();

    ctx.patchState({
      isStreaming: true,
      error: undefined,
      draftAssistantText: '',
      lastAssistantMessageId: null,
    });

    this.streamSub = this.stream.streamChat(a.payload).subscribe({
      next: (ev) => {
        const s = ctx.getState();

        if (ev.type === 'meta') {
          ctx.patchState({ conversationId: ev.conversationId });
          this.store.dispatch(new SelectConversation(ev.conversationId));
        }

        if (ev.type === 'delta') {
          ctx.patchState({ draftAssistantText: s.draftAssistantText + ev.text });
        }

        if (ev.type === 'reasoning_delta') {
          ctx.patchState({ draftReasoningText: s.draftReasoningText + ev.text });
        }

        if (ev.type === 'final') {
          ctx.patchState({ lastAssistantMessageId: ev.createdAssistantMessageId });
        }

        if (ev.type === 'error') {
          ctx.patchState({ error: ev.message });
        }

        if (ev.type === 'done') {
          ctx.patchState({ isStreaming: false });
          const convoId = ctx.getState().conversationId;
          if (convoId) this.store.dispatch(new LoadMessages(convoId));
        }
      },
      error: (err) => {
        ctx.patchState({ isStreaming: false, error: String(err) });
      },
      complete: () => {
        ctx.patchState({ isStreaming: false });
      },
    });
  }

  @Action(AbortChatStream)
  abort(ctx: StateContext<ChatStateModel>) {
    this.streamSub?.unsubscribe();
    this.streamSub = undefined;
    ctx.patchState({ isStreaming: false });
  }
}
