import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ChatRequestMessage } from '@app/core/models/chat.models';
import { SendChatStream, AbortChatStream } from '@app/core/state/chat/chat.actions';
import { ChatState } from '@app/core/state/chat/chat.state';
import { SelectConversation } from '@app/core/state/conversations/conversations.actions';
import { LoadMessages } from '@app/core/state/messages/messages.actions';
import { FormsModule } from '@angular/forms';
import { MessagesState } from '@app/core/state/messages/messages.state';
import { Store } from '@ngxs/store';
import { ChatMessage } from '@shared/api/chat';
import { UUID } from 'crypto';
import { Observable, map, distinctUntilChanged, switchMap } from 'rxjs';
import { Composer } from '@app/ui/composer/composer';
import { MessageItem } from '@app/ui/message-item/message-item';

@Component({
  selector: 'app-conversation-chat',
  imports: [CommonModule, RouterModule, FormsModule, Composer, MessageItem],
  templateUrl: './conversation-chat.html',
  styleUrl: './conversation-chat.scss',
})
export class ConversationChat {
  private store = inject(Store);
  private route = inject(ActivatedRoute);

  text = '';

  conversationId$: Observable<UUID> = this.route.paramMap.pipe(
    map((p) => p.get('id') as UUID),
    distinctUntilChanged()
  );

  messages$: Observable<ChatMessage[]> = this.conversationId$.pipe(
    switchMap((id) => this.store.select(MessagesState.messagesForConversation(id)))
  );

  draft$: Observable<string> = this.store.select(ChatState.draftAssistantText);
  draftReasoning$: Observable<string> = this.store.select(ChatState.draftReasoning);

  isStreaming$: Observable<boolean> = this.store.select(ChatState.isStreaming);
  error$: Observable<string | undefined> = this.store.select(ChatState.error);

  ngOnInit() {
    this.conversationId$.subscribe((id) => {
      this.store.dispatch([new SelectConversation(id), new LoadMessages(id)]);
    });
  }

  send() {
    const trimmed = this.text.trim();
    if (!trimmed) return;

    const conversationId =
      this.store.selectSnapshot(ChatState.conversationId) ??
      this.store.selectSnapshot((s) => s.conversations?.selectedConversationId);

    // Wichtig: wir nehmen die ID aus der Route als “source of truth”
    const id = this.route.snapshot.paramMap.get('id') as UUID;

    const messages: ChatRequestMessage[] = [{ role: 'user', content: trimmed }];

    this.store.dispatch(
      new SendChatStream({
        conversationId: id,
        messages,
        temperature: 0.7,
      })
    );

    this.text = '';
  }

  abort() {
    this.store.dispatch(new AbortChatStream());
  }

  reload() {
    const id = this.route.snapshot.paramMap.get('id') as UUID;
    this.store.dispatch(new LoadMessages(id));
  }
}
