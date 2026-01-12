import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Conversation } from '@app/core/models/chat.models';
import {
  LoadConversations,
  CreateConversation,
} from '@app/core/state/conversations/conversations.actions';
import { ConversationsState } from '@app/core/state/conversations/conversations.state';
import { Store } from '@ngxs/store';
import { UUID } from 'crypto';

import { Observable } from 'rxjs';

@Component({
  selector: 'app-conversation-overview',
  imports: [CommonModule, RouterModule],
  templateUrl: './conversation-overview.html',
  styleUrl: './conversation-overview.scss',
})
export class ConversationOverview {
  private store = inject(Store);
  private router = inject(Router);

  conversations$: Observable<Conversation[]> = this.store.select(ConversationsState.conversations);
  loading$: Observable<boolean> = this.store.select(ConversationsState.loading);

  ngOnInit() {
    this.store.dispatch(new LoadConversations());
  }

  reload() {
    this.store.dispatch(new LoadConversations());
  }

  async create() {
    await this.store.dispatch(new CreateConversation()).toPromise();

    const id = this.store.selectSnapshot(ConversationsState.selectedConversationId) as UUID | null;
    if (id) this.router.navigate(['/conversations', id]);
  }
}
