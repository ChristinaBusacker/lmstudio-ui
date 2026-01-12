import { TestBed } from '@angular/core/testing';

import { ConversationsApiService } from './conversations-api-service';

describe('ConversationsApiService', () => {
  let service: ConversationsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConversationsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
