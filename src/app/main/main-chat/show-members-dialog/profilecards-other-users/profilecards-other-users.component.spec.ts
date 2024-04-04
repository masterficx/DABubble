import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilecardsOtherUsersComponent } from './profilecards-other-users.component';

describe('ProfilecardsOtherUsersComponent', () => {
  let component: ProfilecardsOtherUsersComponent;
  let fixture: ComponentFixture<ProfilecardsOtherUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilecardsOtherUsersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProfilecardsOtherUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
