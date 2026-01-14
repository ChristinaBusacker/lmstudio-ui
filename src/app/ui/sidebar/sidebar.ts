import { Component, HostBinding, inject, OnInit } from '@angular/core';
import { Icon } from '../icon/icon';
import { Conversation, UUID } from '@app/core/models/chat.models';
import { ConversationsState } from '@app/core/state/conversations/conversations.state';
import { Store } from '@ngxs/store';

import { lastValueFrom, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  CreateConversation,
  LoadConversations,
} from '@app/core/state/conversations/conversations.actions';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, Icon, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  private store = inject(Store);
  private router = inject(Router);

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
}
