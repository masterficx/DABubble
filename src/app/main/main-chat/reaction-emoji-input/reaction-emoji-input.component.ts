import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { EmojiComponent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {Firestore, addDoc, collection, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-reaction-emoji-input',
  standalone: true,
  imports: [CommonModule, FormsModule, EmojiComponent, PickerComponent, MatIconModule],
  templateUrl: './reaction-emoji-input.component.html',
  styleUrl: './reaction-emoji-input.component.scss'
})

export class ReactionEmojiInputComponent {
  private firestore: Firestore = inject(Firestore);
  @Input() showMoreEmojis!: boolean;
  @Output() showMoreEmojisChild = new EventEmitter();
  @ViewChild('message') messageInput: ElementRef<HTMLInputElement>;
  inputFocused: boolean = false;
  messageModel: string = '';
  @Input() reactionCollectionPath!: string;
  @Input() secondaryReactionPath!: string;
  @Input() currentUser!: string;
  @Input() threadOrMessageId: string
  @Input() reactions!: any;

  constructor() { }

  /**
   * The input focus is automatically set to true.
   */
  onInputFocus(): void {
    this.inputFocused = true;
  }

  /**
   * The input focus is set to false.
   */
  onInputBlur(): void {
    this.inputFocused = false;
  }
  
  /**
   * Click event is triggered when user selects an emoji. The emoji variable is set to the selected emoji.
   * @param event 
   */
  handleClick(event: any) {
    const emoji = event.emoji.native;
    this.insertEmojiAtCursor(emoji);
  }

  /**
   * Detects where the cursor is and inserts the emoji at that location.
   * @param emoji - selected emoji form the picker
   */
  async insertEmojiAtCursor(emoji: string) {
    const inputEl = this.messageInput.nativeElement;
    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;
    const text = inputEl.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    this.messageModel = before + emoji + after;

    const newPos = start + emoji.length;
    setTimeout(() => {
      inputEl.selectionStart = inputEl.selectionEnd = newPos;
    });
    await this.saveReaction(this.messageModel, this.currentUser);
    this.showMoreEmojis = false;
    this.showMoreEmojisChild.emit(this.showMoreEmojis);
  }

  /**
   * Prevens an unwanted triggering of a function by clicking on an element.
   * @param $event 
   */
  doNotClose($event: any) {
    $event.stopPropagation();
  }

  /**
   * Closes the emoji picker (reaction emoji imput component).
   */
  closeEmojiInput() {
    this.showMoreEmojis = false;
    this.showMoreEmojisChild.emit(this.showMoreEmojis);
  }

  /**
   * Saves an emoji/reaction in in the reactions collection in firebase of the current thread. Checks if a document already
   * exists. If not the reaction is added. If an document already exists it checks if the emoji already exists.
   * If the emoji doesn't exist, then a a new one is added. But if the emoji exists, it checks if the current logged in user
   * already reacted (reactedBy array contains current user). If not, the count goes op by 1, otherwiese the count goes down
   * by one and the user id is removed form the reactedBy array.
   * If only the current user has already reacted with the emoji, the emoji is removed from the reactions collection. 
   * 
   * @param emoji - selected emoji from the picker > value form the input
   * @param currentUser - currently logged in user
   */
  async saveReaction(emoji: string, currentUser: string) {   
    if(this.reactions.length == 0) {
      await this.addReaction(emoji, currentUser);
    } else {
      if(this.reactions.some(reaction => reaction.reaction == emoji)) {
        for (let i = 0; i < this.reactions.length; i++) {
          const reaction = this.reactions[i];
          if(emoji == reaction.reaction && reaction.reactedBy.includes(currentUser)) {
            if(reaction.reactedBy.length > 1) {
              reaction.count = reaction.count - 1;
              let index = reaction.reactedBy.indexOf(currentUser);
              reaction.reactedBy.splice(index, 1);
              let currentRef = doc(this.firestore, this.reactionCollectionPath + '/' +  reaction.id);
              let data = {
                count: reaction.count,
                reaction: emoji,
                reactedBy: reaction.reactedBy,
              };
              await updateDoc(currentRef, data).then(() => {
              });  
            } else {
              await deleteDoc(doc(this.firestore, this.reactionCollectionPath, reaction.id));
            }
          } else if(emoji == reaction.reaction && !reaction.reactedBy.includes(currentUser)) {
            reaction.count = reaction.count + 1;
            reaction.reactedBy.push(currentUser);
            let currentRef = doc(this.firestore, this.reactionCollectionPath + '/' + reaction.id);
            let data = {
              count: reaction.count,
              reaction: emoji,
              reactedBy: reaction.reactedBy,
            };
            await updateDoc(currentRef, data).then(() => {
            });
          }         
        }
      } else {
        await this.addReaction(emoji, currentUser); 
      }
    }
  }

  /**
   * Adds the emoji/reaction to the reactions array in firebase. The reaction contians the count, the emoji iself and the
   * user id of the user who reacted.
   * @param emoji - selected emoji from the picker > value form the input
   * @param currentUser - currently logged in user
   */
  async addReaction(emoji: string, currentUser: string) {
    let newReaction = await addDoc(collection(this.firestore, this.reactionCollectionPath), {
        count: 1,
        reaction: emoji,
        reactedBy: [currentUser],
      });
  }
}
