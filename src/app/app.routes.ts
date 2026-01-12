import { Routes } from '@angular/router';
import { ConversationChat } from './pages/conversation-chat/conversation-chat';
import { ConversationOverview } from './pages/conversation-overview/conversation-overview';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'conversations' },

  // Übersicht
  { path: 'conversations', component: ConversationOverview },

  // Einzel-Chat
  { path: 'conversations/:id', component: ConversationChat },

  { path: '**', redirectTo: 'conversations' },
];
