import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConversationOverview } from './conversation-overview';

describe('ConversationOverview', () => {
  let component: ConversationOverview;
  let fixture: ComponentFixture<ConversationOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConversationOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConversationOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
