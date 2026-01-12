import { TestBed } from '@angular/core/testing';

import { LmstudioApiService } from './lmstudio-api-service';

describe('LmstudioApiService', () => {
  let service: LmstudioApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LmstudioApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
