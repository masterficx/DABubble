import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddUserNewChannelComponent } from './dialog-add-user-new-channel.component';

describe('DialogAddUserNewChannelComponent', () => {
  let component: DialogAddUserNewChannelComponent;
  let fixture: ComponentFixture<DialogAddUserNewChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogAddUserNewChannelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogAddUserNewChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
