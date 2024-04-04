import { TestBed } from '@angular/core/testing';

import { ProfilCardService } from './profil-card.service';

describe('ProfilCardService', () => {
  let service: ProfilCardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfilCardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
