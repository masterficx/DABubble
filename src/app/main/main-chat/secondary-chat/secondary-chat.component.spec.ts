import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondaryChatComponent } from './secondary-chat.component';

describe('SecondaryChatComponent', () => {
  let component: SecondaryChatComponent;
  let fixture: ComponentFixture<SecondaryChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecondaryChatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SecondaryChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
