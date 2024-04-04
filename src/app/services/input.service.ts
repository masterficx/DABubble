import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  constructor() { }

  // Fügt ein Emoji in die aktuelle Cursorposition ein
  insertEmojiAtCursor(inputModel: string, emoji: string, cursorPosition: number): string {
    const before = inputModel.substring(0, cursorPosition);
    const after = inputModel.substring(cursorPosition, inputModel.length);
    return before + emoji + after;
  }

  // Funktion zum Hinzufügen von Dokumenten
  addDocument() {
    // Implementierung zum Hinzufügen von Dokumenten
  }

  // Funktion zum Taggen von Benutzern
  tagUser() {
    // Implementierung zum Taggen von Benutzern
  }
}
