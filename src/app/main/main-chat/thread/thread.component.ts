import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { EditOwnThreadComponent } from './edit-own-thread/edit-own-thread.component';
import { MainChatComponent } from '../main-chat.component';
import { ReactionEmojiInputComponent } from '../reaction-emoji-input/reaction-emoji-input.component';
import { ViewManagementService } from '../../../services/view-management.service';
import { Firestore, addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, updateDoc } from '@angular/fire/firestore';
import { MatIconModule } from '@angular/material/icon';
import { getDownloadURL, getMetadata, getStorage, ref } from '@angular/fire/storage';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, EditOwnThreadComponent, ReactionEmojiInputComponent, MatIconModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})

export class ThreadComponent implements OnInit, OnChanges {
  private firestore: Firestore = inject(Firestore);
  @Input() thread!: any;
  @Input() currentUser!: string;
  @Input() currentUserName!: string;
  @Input() activeDmUser!: string;
  @Input() acitveDmUserData!: any;
  @Input() activeChannelId!: string;
  @Input() path!: string;
  messageCount!: number;
  threadMessagesTimestamps = [];
  answers: string;
  lastAnswer: any;
  showMoreEmojis: boolean = false;
  showMoreEmojisToolbar: boolean = false;
  reactionCollectionPath: string;
  editMessagePopupOpen: boolean = false;
  ownMessageEdit: boolean = false;
  reactions = [];
  reactionNames =  [];
  reactionCount: number;
  messageCountPath: string;

  constructor(private chatService: ChatService, private main: MainChatComponent, public viewManagementService: ViewManagementService,) { }

  ngOnChanges(changes: SimpleChanges): void {
    //this.reactionCollectionPath = this.path + `/${this.thread.threadId}/reactions`;
    if(this.activeChannelId == null) {
      this.reactionCollectionPath = `users/${this.currentUser}/allDirectMessages/${this.activeDmUser}/directMessages/${this.thread.threadId}/reactions`;
    } else {
      this.reactionCollectionPath = `channels/${this.activeChannelId}/threads/${this.thread.threadId}/reactions`;
      this.messageCountPath = `channels/${this.activeChannelId}/threads/${this.thread.threadId}/messages`;
    }
    if(changes['thread']) {
      this.loadThreadData();
    }
  }

  ngOnInit(): void {
    this.loadThreadData();
  }

  /**
   * Runs all the necessary function to display the thread data.
   */
  loadThreadData() {
    this.getReactions();
    if(this.activeChannelId !== null) {
      this.getMessageCountAndAnswer();
    }
  }

  /**
   * 
   */
  async getReactions() {
    const q = query(collection(this.firestore, this.reactionCollectionPath));
    await onSnapshot(q, (element) => {
      this.reactions = [];
      this.reactionNames = [];
      element.forEach(reaction => {
        this.getReactionNames(reaction.data()['reactedBy']);
        this.reactions.push({
          'id': reaction.id,
          'count': reaction.data()['count'],
          'reaction': reaction.data()['reaction'],
          'reactedBy': reaction.data()['reactedBy'],
          'reactedByName': this.reactionNames
        });
        this.sortReactionIds();
        this.sortReactionNames();
      });
    });
  }
  
  /**
   * Fetches all the reactions form the reactions collection form firebase for the current thread.
   * Pushes the data into the reactionNAmes array.
   * @param reactedByArray 
   */
  getReactionNames(reactedByArray: any) {
    const q = query(collection(this.firestore, 'users'));
    onSnapshot(q, (list) => {
      list.forEach(user => {
        for (let i = 0; i < reactedByArray.length; i++) {
          const reactedBy = reactedByArray[i];
          if(user.id == reactedBy && !this.reactionNames.includes(user.data()['name'])) {
            this.reactionNames.push(user.data()['name']);
          }
        }
      });
    });
  }

  /**
   * Sorts the reactions reactedBy array within the reactions JSON so that the current logged in user is at the first 
   * position. The array is only sorted if it includes the current logged in user.
   */
  sortReactionIds() {
    for (let i = 0; i < this.reactions.length; i++) {
      const userId = this.reactions[i];
      if(userId.reactedBy.includes(this.currentUser)) {
        let index = -1;
        index = userId.reactedBy.findIndex(obj => obj == this.currentUser);
        userId.reactedBy.splice(index, 1);
        userId.reactedBy.unshift(this.currentUser);
      }
    }
  }

  /**
   * Sorts the reactions reactedByName array within the reactions JSON so that the current logged in user is at the first 
   * position. The array is only sorted if it includes the current logged in user
   */
  sortReactionNames() {
    for (let i = 0; i < this.reactions.length; i++) {
      const userName = this.reactions[i];
      if(userName.reactedByName.includes(this.currentUserName)) {
        let index = -1;
        index = userName.reactedByName.findIndex(obj => obj == this.currentUserName);
        userName.reactedBy.splice(index, 1);
        userName.reactedByName.unshift(this.currentUserName);
      }
    }
  }

  /**
   * Sets the messageCount variable to how many messages the thread has. It also sets the lastAnswer variable
   * and return the timestamp.
   */
  getMessageCountAndAnswer() {
    this.messageCount = 0;
     const messagesRef = collection(this.firestore, `channels/${this.activeChannelId}/threads/${this.thread.threadId}/messages`);
     const q = query(messagesRef, orderBy('creationDate', 'desc'));
  
     onSnapshot(q, (snapshot) => {
     this.messageCount = snapshot.docs.length;
     this.formatMessageCount();
  
       if (this.messageCount > 0) {
         const lastMessageTimestamp = snapshot.docs[0].data()['creationDate'];
         this.lastAnswer = this.main.getFormattedTime(lastMessageTimestamp);
       }
     });
  }

  /**
   * Formats the word "Antwort" depending on the message count. If the count is higher then 1 it returns "Antworten" else
   * it returns "Antwort".
   */
  formatMessageCount() {
    if(this.messageCount > 1 || this.messageCount == 0) {
      this.answers = 'Antworten';
    } else {
      this.answers = 'Antwort';
    }
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

  /**
   * Sets the path to the image in the firebase storage.
   * @param imageURL - Firebase storage URL of the image
   */
  async downloadImage(imageURL) {
    const storage = getStorage();
    const storageRef = ref(storage, imageURL);
  
    try {
      const url = await getDownloadURL(storageRef);
      const metadata = await getMetadata(storageRef);
      this.downloadData(url, metadata.name);
    } catch (error) {
      console.error('Fehler beim Abrufen der Datei oder Metadaten:', error);
    }
  }

  /**
   * Downloads the image form firebase storage in the in the browser.
   * @param url - Firebase storage URL of the image
   */
  async downloadData(url: string, filename: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Netzwerkantwort war nicht ok.');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Fehler beim Herunterladen des Dokuments:', error);
    }
  }

  /**
   * Opens the selected image in a new browser tab.
   * @param url - Firebase storage URL of the image
   */
  openImage(url: string) {
    window.open(url, '_blank');
  }
  
  /**
   * Opens the emoji picker if the user clicks on the emoji icon next to the reaction.
   */
  openMoreEmojis() {
    this.showMoreEmojis = true;
  }

  /**
   * Opens the emoji picker in the toolabr if the user clicks on the emoji icon.
   */
  openMoreEmojisToolbar() {
    this.showMoreEmojisToolbar = true;
  }

  /**
   * Closes the emoji picker.
   * @param showMoreEmojis 
   */
  closeMoreEmojis(showMoreEmojis: boolean) {
    this.showMoreEmojis = false;
    this.showMoreEmojisToolbar = false;
  }

  /**
   * If the user click the three dots in the toolbar, the "Nachricht bearbeiten" popup opens.
   */
  moreOptions() {
    this.editMessagePopupOpen = true;
  }

  /**
   * If the user clicks on "Nachricht bearbieten", the edit-own component opens und the user can start editing the 
   * own message.
   */
  editMessage() {
    this.editMessagePopupOpen = false;
    this.ownMessageEdit = true;
  }

  /**
   * Closes the "Nachricht bearbieten" popup.
   */
  closeEditMessagePopUp() {
    this.editMessagePopupOpen = false;
  }

  /**
   * If the user click on the chat symbol in the toolbar, it opens the messages of that thread. The secondary chat opens.
   * @param threadId - id of the selected thread
   */
  openThread(threadId: string): void {
    this.chatService.openThread(threadId);
    this.viewManagementService.setView('secondaryChat');
  }

  /**
   * Closes the edit-own component and returns to the thread.
   */
  closeEditedMessage(dialogBoolen: boolean) {
    this.ownMessageEdit = false;
  }

  /**
  * Prevens an unwanted triggering of a function by clicking on an element.
  * @param $event 
  */
  doNotClose($event: any) {
    $event.stopPropagation();
  }
}
