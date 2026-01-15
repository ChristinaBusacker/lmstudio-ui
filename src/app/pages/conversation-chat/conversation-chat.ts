import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, distinctUntilChanged, filter, map, shareReplay, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ChatState } from '@app/core/state/chat/chat.state';
import {
  RenameConversation,
  SelectConversation,
} from '@app/core/state/conversations/conversations.actions';
import { LoadMessages } from '@app/core/state/messages/messages.actions';
import { MessagesState } from '@app/core/state/messages/messages.state';

import { ChatMessage } from '@shared/api/chat';
import { Composer } from '@app/ui/composer/composer';
import { MessageItem } from '@app/ui/message-item/message-item';
import { ContextMenuItem, ContextMenuPosition } from '@app/ui/context-menu/context-menu.types';
import { ContextMenu } from '@app/ui/context-menu/context-menu';

type MenuState = {
  open: boolean;
  pos: ContextMenuPosition; // PAGE coords!
  chatId: string | null;
};
@Component({
  selector: 'app-conversation-chat',
  imports: [CommonModule, RouterModule, FormsModule, Composer, MessageItem, ContextMenu],
  templateUrl: './conversation-chat.html',
  styleUrl: './conversation-chat.scss',
})
export class ConversationChat {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  text = '';
  reasoningOpen = false;

  readonly menuOpen = signal(false);
  readonly menuPos = signal<ContextMenuPosition>({ x: 0, y: 0 });
  readonly menuChatId = signal<string | null>(null);

  readonly menu = signal<MenuState>({
    open: false,
    pos: { x: 0, y: 0 },
    chatId: null,
  });

  readonly userMenuItems: Array<ContextMenuItem<string | null>> = [
    {
      id: 'open',
      label: 'Chat öffnen',
      icon: 'chat-open',
      disabled: (id) => !id,
      action: async (id) => {
        if (!id) return;
        await this.router.navigate(['/conversations', id]);
      },
    },
    {
      id: 'rename',
      label: 'Rename Chat',
      icon: 'chat-open',
      disabled: (id) => !id,
      action: async (id) => {
        if (!id) return;
        const newTitle = prompt('Select new Title');
        this.store.dispatch(new RenameConversation(id, newTitle));
      },
    },
  ];

  readonly assistentMenuItems: Array<ContextMenuItem<string | null>> = [
    {
      id: 'open',
      label: 'Chat öffnen',
      icon: 'chat-open',
      disabled: (id) => !id,
      action: async (id) => {
        if (!id) return;
        await this.router.navigate(['/conversations', id]);
      },
    },
    {
      id: 'rename',
      label: 'Rename Chat',
      icon: 'chat-open',
      disabled: (id) => !id,
      action: async (id) => {
        if (!id) return;
        const newTitle = prompt('Select new Title');
        this.store.dispatch(new RenameConversation(id, newTitle));
      },
    },
  ];

  // id kommt aus der URL -> string | null, wir filtern null raus
  conversationId$: Observable<string> = this.route.paramMap.pipe(
    map((p) => p.get('id')),
    filter((id): id is string => !!id), // <-- Type Guard: ab hier ist id string
    distinctUntilChanged(),
    tap((id) => {
      console.log('id changed to', id);
      this.store.dispatch([new SelectConversation(id), new LoadMessages(id)]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  messages$: Observable<ChatMessage[]> = this.conversationId$.pipe(
    switchMap((id) => this.store.select(MessagesState.messagesForConversation(id)))
  );

  messages: ChatMessage[] = [];
  reasoning: ChatMessage[] = [];

  draft$: Observable<string> = this.store.select(ChatState.draftAssistantText);
  draftReasoning$: Observable<string[]> = this.store.select(ChatState.draftReasoning).pipe(
    map((reasoning) => {
      return reasoning.split('\n');
    })
  );

  isStreaming$: Observable<boolean> = this.store.select(ChatState.isStreaming);
  error$: Observable<string | undefined> = this.store.select(ChatState.error);

  ngOnInit() {
    this.conversationId$.pipe(takeUntilDestroyed()).subscribe();
    this.messages$.subscribe((messages) => (this.messages = messages));
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        console.log('ROUTE CHANGE', event);
      }
    });
  }

  reload() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.store.dispatch(new LoadMessages(id));
  }

  toggleReasoning() {
    this.reasoningOpen = !this.reasoningOpen;
  }

  openChatMenu(ev: MouseEvent, chatId: string): void {
    ev.preventDefault();
    ev.stopPropagation();

    // Wichtig: PAGE coords (nicht client)
    this.menu.set({
      open: true,
      pos: { x: ev.pageX, y: ev.pageY },
      chatId,
    });
  }

  closeMenu(): void {
    this.menu.set({
      open: false,
      pos: { x: 0, y: 0 },
      chatId: null,
    });
  }
}
