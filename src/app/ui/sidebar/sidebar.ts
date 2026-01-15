import { Component, HostBinding, inject, OnInit, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Conversation, UUID } from '@app/core/models/chat.models';
import { ConversationsState } from '@app/core/state/conversations/conversations.state';
import { Store } from '@ngxs/store';

import { lastValueFrom, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  CreateConversation,
  LoadConversations,
  RenameConversation,
} from '@app/core/state/conversations/conversations.actions';
import { Router, RouterLink } from '@angular/router';
import { ContextMenuItem, ContextMenuPosition } from '../context-menu/context-menu.types';
import { ContextMenu } from '../context-menu/context-menu';

type MenuState = {
  open: boolean;
  pos: ContextMenuPosition; // PAGE coords!
  chatId: string | null;
};

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, Icon, RouterLink, ContextMenu],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  private store = inject(Store);
  private router = inject(Router);

  readonly menu = signal<MenuState>({
    open: false,
    pos: { x: 0, y: 0 },
    chatId: null,
  });

  readonly menuOpen = signal(false);
  readonly menuPos = signal<ContextMenuPosition>({ x: 0, y: 0 });
  readonly menuChatId = signal<string | null>(null);

  readonly chatMenuItems: Array<ContextMenuItem<string | null>> = [
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

  @HostBinding('class.close') close = false;

  conversations$: Observable<Conversation[]> = this.store
    .select(ConversationsState.conversations)
    .pipe(
      map((conv) => {
        console.log(conv);
        return conv;
      })
    );

  async create() {
    const convPromise = lastValueFrom(this.store.dispatch(new CreateConversation()));

    await convPromise;

    const id = this.store.selectSnapshot(ConversationsState.selectedConversationId) as UUID | null;
    if (id) this.router.navigate(['/conversations', id]);
  }

  toggleSidebar() {
    this.close = !this.close;
  }

  ngOnInit() {
    this.store.dispatch(new LoadConversations());
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
