import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowMembersDialogComponent } from './show-members-dialog.component';

describe('ShowMembersDialogComponent', () => {
  let component: ShowMembersDialogComponent;
  let fixture: ComponentFixture<ShowMembersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowMembersDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShowMembersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
