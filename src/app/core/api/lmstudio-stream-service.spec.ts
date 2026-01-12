import { TestBed } from '@angular/core/testing';

import { LmstudioStreamService } from './lmstudio-stream-service';

describe('LmstudioStreamService', () => {
  let service: LmstudioStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LmstudioStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
