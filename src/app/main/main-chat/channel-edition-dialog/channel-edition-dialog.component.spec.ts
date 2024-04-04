import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelEditionDialogComponent } from './channel-edition-dialog.component';

describe('ChannelEditionDialogComponent', () => {
  let component: ChannelEditionDialogComponent;
  let fixture: ComponentFixture<ChannelEditionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelEditionDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChannelEditionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
