import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondaryChatMessagesComponent } from './secondary-chat-messages.component';

describe('SecondaryChatMessagesComponent', () => {
  let component: SecondaryChatMessagesComponent;
  let fixture: ComponentFixture<SecondaryChatMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecondaryChatMessagesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SecondaryChatMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
