import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChatService } from '../../../../services/chat.service';
import { Firestore, collection, onSnapshot, query, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-profilecards-other-users',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  templateUrl: './profilecards-other-users.component.html',
  styleUrl: './profilecards-other-users.component.scss'
})
export class ProfilecardsOtherUsersComponent {
  private firestore: Firestore = inject(Firestore);
  @Input() currentUser!: string;
  @Input() memberData!: any;
  @Input() showProfileCard!: boolean;
  @Output() showProfileCardChild = new EventEmitter();
  @Input() showMembersDialogOpen!: boolean;
  @Output() showMembersDialogOpenChild = new EventEmitter();

  constructor(private chatService: ChatService) { }

  /**
   * Checks if the currently logged in user already has a DM chat with the selected user.
   * If not, the addDirectMessage function is run. Otherwise it switched to the existing DM chat.
   * Is run when the user clicks on "Nachricht" button in the profile card.
   * @returns 
   */
  writeDirectMessage() {
    const q = query(collection(this.firestore, `users/${this.currentUser}/allDirectMessages`));
    return onSnapshot(q, (list) => {
      list.forEach(element => {
        if(element.id === this.memberData.id) {
          this.chatService.setSelectedUserId(this.memberData.id);
          this.closeProfileCard();
          this.closeShowMembers();
        } else {
          // Create new DM Chat
          this.addDirectMessage();
          this.closeProfileCard();
          this.closeShowMembers();
        }  
      });
    });
  }

  /**
   * Adds a new document to the allDirectMessages collection in firebase. The collection is added to the
   * current logged in user as well as to the recipient und switches to the new DM chat.
   */
  async addDirectMessage (): Promise<void> {
    const dmSenderRef = doc(collection(this.firestore, `users/${this.currentUser}/allDirectMessages`), this.memberData.id);
    const dmReceiverRef = doc(collection(this.firestore, `users/${this.memberData.id}/allDirectMessages`), this.currentUser);
    let data = { }
    await setDoc(dmSenderRef, data);
    await setDoc(dmReceiverRef, data);
    this.chatService.setSelectedUserId(this.memberData.id);
  }

  /**
   * Returns the active channel id that was selected.
   * @returns 
   */
  getActiveChannelId() {
    return this.chatService.getActiveChannelId();
  }

  /**
   * Closes the profilecard-other-users component.
   */
  closeProfileCard() {
    this.showProfileCard = false;
    this.showProfileCardChild.emit(this.showProfileCard);
  }

  /**
   * Closes the show-members-dialog component.
   */
  closeShowMembers() {
    this.showMembersDialogOpen = false;
    this.showMembersDialogOpenChild.emit(this.showProfileCard);
  }

  /**
   * Prevens an unwanted triggering of a function by clicking on an element.
   * @param $event 
   */
  doNotClose($event: any) {
    $event.stopPropagation(); 
  }
}
