import { ChatRequestMessage, UUID } from '../../models/chat.models';

export class SendChatNonStream {
  static readonly type = '[Chat] Send Non-Stream';
  constructor(
    public payload: {
      conversationId?: UUID;
      model?: string;
      temperature?: number;
      messages: ChatRequestMessage[];
    }
  ) {}
}

export class SendChatStream {
  static readonly type = '[Chat] Send Stream';
  constructor(
    public payload: {
      conversationId?: UUID;
      model?: string;
      temperature?: number;
      messages: ChatRequestMessage[];
    }
  ) {}
}

export class AbortChatStream {
  static readonly type = '[Chat] Abort Stream';
}
