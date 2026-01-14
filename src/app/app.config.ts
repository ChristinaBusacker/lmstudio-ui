import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin';
import { withNgxsLoggerPlugin } from '@ngxs/logger-plugin';
import { withNgxsRouterPlugin } from '@ngxs/router-plugin';
import { provideStore } from '@ngxs/store';
import { ɵStateClass } from '@ngxs/store/internals';
import { AuthService } from './core/api/auth-service';
import { ConversationsApi } from './core/api/conversations-api-service';
import { LmstudioApi } from './core/api/lmstudio-api-service';
import { LmstudioStreamService } from './core/api/lmstudio-stream-service';
import { MessagesApi } from './core/api/messages-api-service';
import { ConversationsState } from './core/state/conversations/conversations.state';
import { MessagesState } from './core/state/messages/messages.state';
import { ChatState } from './core/state/chat/chat.state';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { IconRegistryService } from './core/services/icons/icon-registry-service';
import { MarkdownModule } from 'ngx-markdown';

export const states: ɵStateClass[] = [ConversationsState, MessagesState, ChatState];

export const services = [
  AuthService,
  ConversationsApi,
  LmstudioApi,
  LmstudioStreamService,
  MessagesApi,
  IconRegistryService,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideStore(
      states,
      withNgxsReduxDevtoolsPlugin(),
      withNgxsLoggerPlugin(),
      withNgxsRouterPlugin()
    ),
    importProvidersFrom(MarkdownModule.forRoot()),
  ],
};
