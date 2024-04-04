import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { EmojiComponent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { Firestore, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import { deleteObject, getStorage, ref } from '@angular/fire/storage';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-edit-own-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PickerComponent, EmojiComponent, MatIconModule ],
  templateUrl: './edit-own-thread.component.html',
  styleUrl: './edit-own-thread.component.scss'
})
export class EditOwnThreadComponent implements OnInit {
  private firestore: Firestore = inject(Firestore);
  @ViewChild('message') messageInput: ElementRef<HTMLInputElement>;
  @Input() currentUser!: string;
  @Input() activeDmUser!: string;
  @Input() textAreaEditMessage!: string;
  @Input() activeChannelId!: string;
  @Input() thread: any;

  @Input() messageData: any;
  @Input() messageId: any;
  @Input() messageThreadId: string;
  @Input() messageProfileImg: string;
  ownMessageEdit: boolean;
  @Output() ownMessageEditChild = new EventEmitter(); 
  inputFocused: boolean = false;
  showEmojiPicker: boolean = false;
  showMentionUser: boolean = false;
  channelDmPath: string;
  messagePath: string;
  collectionPath: string;

  constructor() { }

  ngOnInit(): void {
    if(this.activeChannelId !== null) {
      if(this.messageId) {
        this.messagePath = `channels/${this.activeChannelId}/threads/${this.messageThreadId}/messages/${this.messageId}`;
        this.collectionPath = `channels/${this.activeChannelId}/threads/${this.messageThreadId}/messages`;
        this.textAreaEditMessage = this.messageData.message; 
      } else {
        this.messagePath = `channels/${this.activeChannelId}/threads/${this.thread.threadId}`;
        this.collectionPath = `channels/${this.activeChannelId}/threads/`;
        this.textAreaEditMessage = this.thread.message;

      }
    } else {
      this.messagePath = `users/${this.currentUser}/allDirectMessages/${this.activeDmUser}/directMessages/${this.thread.threadId}`;
      this.collectionPath = `users/${this.currentUser}/allDirectMessages/${this.activeDmUser}/directMessages/`;
      this.textAreaEditMessage = this.thread.message;
    }
  }

  /**
   * With clicking on the "Abbrechen" button, the edit-own-thread component closes.
   */
  closeEditedMessage() {
    this.ownMessageEdit = false;
    this.ownMessageEditChild.emit(this.ownMessageEdit);
  }

  /**
   * When editing your own message with image attached, it deletes the image form firestore and sets the "imageUrl" of 
   * the thread to empty.
   * @param url - Firebase storage URL of the document
   */
  async deleteDocument(url) {
    const storage = getStorage();
    const desertRef = ref(storage, url);

    deleteObject(desertRef).then(() => {
      // File deleted successfully
    }).catch((error) => {
      // Uh-oh, an error occurred!
    });
    let currentChannelRef = doc(this.firestore, this.messagePath);
    let data = {imageUrl: "" };
    await updateDoc(currentChannelRef, data).then(() => {
    });

  }

  /**
   * With clicking on the "Speichern" button, it checks if the input is empty. If this is the case,
   * the message (doc) is deleted form the threads or directMessages collection. If the input filed has a value,
   * the doc in the threads or directMessages collection is updated.   
   */
  async saveEditedMessage() {
    if(this.messageId) {
      if(this.textAreaEditMessage || this.messageData.imageUrl) {
        let currentThreadRef = doc(this.firestore, this.messagePath);
        let data = {message: this.textAreaEditMessage };
        await updateDoc(currentThreadRef, data).then(() => {
        });
        this.ownMessageEdit = false;
        this.ownMessageEditChild.emit(this.ownMessageEdit);
      } else {
        await deleteDoc(doc(this.firestore, this.collectionPath, this.messageId));
        //await deleteDoc(doc(this.firestore, `channels/${this.activeChannelId}/threads/${this.messageThreadId}/messages`, this.messageId));
        this.ownMessageEdit = false;
        this.ownMessageEditChild.emit(this.ownMessageEdit);
      }
    } else {
      if(this.textAreaEditMessage || this.thread.imageUrl) {
        let currentThreadRef = doc(this.firestore, this.messagePath);
        let data = {message: this.textAreaEditMessage };
        await updateDoc(currentThreadRef, data).then(() => {
        });
        this.ownMessageEdit = false;
        this.ownMessageEditChild.emit(this.ownMessageEdit);
      } else {
        await deleteDoc(doc(this.firestore, this.collectionPath, this.thread.threadId));
        this.ownMessageEdit = false;
        this.ownMessageEditChild.emit(this.ownMessageEdit);
      }
    }
  }

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
  insertEmojiAtCursor(emoji: string) {
    const inputEl = this.messageInput.nativeElement;
    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;
    const text = inputEl.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    this.textAreaEditMessage = before + emoji + after;

    const newPos = start + emoji.length;
    setTimeout(() => {
      inputEl.selectionStart = inputEl.selectionEnd = newPos;
    });
  }

  /**
   * Show or hide the emoji picker by clicking on the emoji symbol.
   */
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }
  
  /**
   * Prevens an unwanted triggering of a function by clicking on an element.
   * @param $event 
   */
  doNotClose($event: any) {
    $event.stopPropagation();
  }
}
