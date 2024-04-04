import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionEmojiInputComponent } from './reaction-emoji-input.component';

describe('ReactionEmojiInputComponent', () => {
  let component: ReactionEmojiInputComponent;
  let fixture: ComponentFixture<ReactionEmojiInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionEmojiInputComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReactionEmojiInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
