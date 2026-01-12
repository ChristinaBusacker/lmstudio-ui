import { UUID } from '../../models/chat.models';

export class LoadMessages {
  static readonly type = '[Messages] Load by Conversation';
  constructor(public conversationId: UUID) {}
}

export class LoadVariants {
  static readonly type = '[Messages] Load Variants';
  constructor(public messageId: UUID) {}
}

export class SetActiveVariant {
  static readonly type = '[Messages] Set Active Variant';
  constructor(public messageId: UUID, public variantId: UUID) {}
}

export class DeleteMessage {
  static readonly type = '[Messages] Soft Delete';
  constructor(public messageId: UUID, public conversationId: UUID) {}
}
