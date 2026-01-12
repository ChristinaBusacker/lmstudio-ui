import { UUID } from '../../models/chat.models';

export class LoadConversations {
  static readonly type = '[Conversations] Load';
}

export class CreateConversation {
  static readonly type = '[Conversations] Create';
  constructor(public title?: string) {}
}

export class RenameConversation {
  static readonly type = '[Conversations] Rename';
  constructor(public id: UUID, public title: string | null) {}
}

export class SelectConversation {
  static readonly type = '[Conversations] Select';
  constructor(public id: UUID | null) {}
}
