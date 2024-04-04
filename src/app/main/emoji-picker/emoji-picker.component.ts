import { Component, EventEmitter, Output } from '@angular/core';
import { PickerModule } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [PickerModule],
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.scss',
})
export class EmojiPickerComponent {
  @Output() emojiSelect = new EventEmitter<any>();

  onEmojiSelect(event: { emoji: any }) {
    this.emojiSelect.emit(event.emoji);
  }
}
