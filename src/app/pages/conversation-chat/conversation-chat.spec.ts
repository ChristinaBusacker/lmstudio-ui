import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConversationChat } from './conversation-chat';

describe('ConversationChat', () => {
  let component: ConversationChat;
  let fixture: ComponentFixture<ConversationChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConversationChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConversationChat);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
