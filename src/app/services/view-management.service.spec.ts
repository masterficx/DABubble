import { TestBed } from '@angular/core/testing';

import { ViewManagementService } from './view-management.service';

describe('ViewManagementService', () => {
  let service: ViewManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
