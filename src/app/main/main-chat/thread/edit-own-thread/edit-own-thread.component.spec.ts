import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOwnThreadComponent } from './edit-own-thread.component';

describe('EditOwnThreadComponent', () => {
  let component: EditOwnThreadComponent;
  let fixture: ComponentFixture<EditOwnThreadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditOwnThreadComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditOwnThreadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
