import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { getStorage, ref, getDownloadURL, FirebaseStorage } from "firebase/storage";
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { ReactionEmojiInputComponent } from '../../reaction-emoji-input/reaction-emoji-input.component';
import { MatIconModule } from '@angular/material/icon';
import { EditOwnThreadComponent } from '../../thread/edit-own-thread/edit-own-thread.component';
@Component({
  selector: 'app-secondary-chat-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ReactionEmojiInputComponent, MatIconModule, EditOwnThreadComponent],
  templateUrl: './secondary-chat-messages.component.html',
  styleUrl: './secondary-chat-messages.component.scss'
})

export class SecondaryChatMessagesComponent implements OnInit, OnDestroy {
  @Input() currentUser!: string;
  @Input() message!: any;
  @Input() messageId: string;
  @Input() threadId!: string;
  @Input() activeChannelId!: string;
  @Input() channelMembers!: any;
  reactions = [];
  currentUserName: string;
  reactionNames = [];
  reactionCollectionPath: string;
  editingMessageText: string;
  openEditOwnMessage: boolean = false;
  openEditOwnInput: boolean = false;
  showMoreEmojis: boolean = false;
  showMoreEmojisToolbar: boolean = false;
  messageDeleted: boolean = false;
  ownMessageEdit: boolean = false;

  private firestore: Firestore = inject(Firestore);
  private storage: FirebaseStorage;

  constructor() {
    this.storage = getStorage();
  }

  ngOnInit(): void {
    this.setupReactionPath();
    this.getReactions();
    this.setupOutsideClickHandler();
  }

  ngOnDestroy(): void {
    this.teardownOutsideClickHandler();
  }

  async downloadImage(imageURL) {
    const storage = getStorage();
    getDownloadURL(ref(storage, imageURL))
      .then((url) => {
        this.downloadData(url)
      })
      .catch((error) => {
      });
  }

  async downloadData(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) console.log('Error Loading Images');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'Download_from_DABubble';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Fehler beim Herunterladen des Dokuments:', error);
    }
  }

  openImage(url: string) {
    window.open(url, '_blank');
  }

  /**
 * Sets up the Firestore path for accessing reactions associated with a specific message.
 * This method constructs the path based on the currently selected channel, thread, and message IDs,
 * storing the result in `this.reactionCollectionPath` for future queries.
 */
  private setupReactionPath(): void {
    this.reactionCollectionPath = `channels/${this.activeChannelId}/threads/${this.threadId}/messages/${this.messageId}/reactions`;
  }

  /**
   * Fetches reactions for the current message from Firestore in real-time.
   * Upon receiving an update, it clears the existing reactions and reaction names, 
   * queries Firestore for the latest reactions, and updates the component's state with the new data.
   * It also triggers fetching of the names associated with each reaction's `reactedBy` array.
   */
  async getReactions(): Promise<void> {
    this.getCurrentUserName();
    const q = query(collection(this.firestore, this.reactionCollectionPath));
    await onSnapshot(q, (snapshot) => {
      this.reactions = [];
      this.reactionNames = [];
      snapshot.forEach((reaction) => {
        this.getReactionNames(reaction.data()['reactedBy']);
        this.reactions.push({
          id: reaction.id,
          count: reaction.data()['count'],
          reaction: reaction.data()['reaction'],
          reactedBy: reaction.data()['reactedBy'],
          // Note: reactedByName will be asynchronously updated, initial push here may not have the updated names yet
          reactedByName: this.reactionNames
        });
        this.sortReactionIds();
        this.sortReactionNames();
      });
    });
  }

  /**
   * Fetches the names of users who reacted to a message based on their IDs.
   * This method queries the `users` collection in Firestore to find matching user documents and
   * extracts their names to update `this.reactionNames`. It ensures that names are not duplicated in the list.
   * 
   * @param {Array} reactedByArray - An array of user IDs who have reacted to the message.
   */
  getReactionNames(reactedByArray: any[]): void {
    const q = query(collection(this.firestore, 'users'));
    onSnapshot(q, (snapshot) => {
      snapshot.forEach((user) => {
        reactedByArray.forEach((reactedById) => {
          if (user.id === reactedById && !this.reactionNames.includes(user.data()['name'])) {
            this.reactionNames.push(user.data()['name']);
          }
        });
      });
    });
  }


  /**
  * Saves a reaction to a message by either adding a new reaction or updating an existing one.
  * If the specified emoji reaction already exists for the message, it updates the reaction (either adding or removing the user).
  * If the emoji reaction does not exist, it creates a new reaction entry in Firestore.
  * Logs all reactions if there are currently none.
  * 
  * @param {string} emoji - The emoji character representing the reaction to be saved.
  * @param {string} currentUser - The ID of the current user reacting to the message.
  */
  async saveReaction(emoji: string, currentUser: string) {
    if (this.reactions.length === 0) {
      //console.log('Alle Reaktionen', this.reactions);
      await this.addReaction(emoji, currentUser);
    } else {
      const reactionExists = this.reactions.some(reaction => reaction.reaction === emoji);
      if (reactionExists) {
        await this.handleExistingReaction(emoji, currentUser);
      } else {
        await this.addReaction(emoji, currentUser);
      }
    }
  }

  /**
   * Fetches the current user's name from Firestore based on their ID.
   * Updates the `currentUserName` property with the user's name on successful retrieval.
   */
  async getCurrentUserName() {
    const docRef = doc(this.firestore, 'users', this.currentUser);
    const docSnap = await getDoc(docRef);
    this.currentUserName = docSnap.data()['name'];
  }

  /**
   * Updates or removes a user's reaction to a message.
   * If adding a reaction, increments the count and adds the user to the reactedBy array.
   * If removing a reaction, decrements the count and removes the user from the reactedBy array.
   * Deletes the reaction document from Firestore if no users have reacted after removal.
   * 
   * @param {Object} reaction - The reaction object containing details like count, reactedBy, and the reaction emoji.
   * @param {string} currentUser - The ID of the current user adding or removing their reaction.
   * @param {boolean} add - A boolean indicating whether to add or remove the user's reaction.
   */
  async updateOrRemoveReaction(reaction, currentUser, add) {
    if (add) {
      reaction.count += 1;
      reaction.reactedBy.push(currentUser);
    } else {
      reaction.count -= 1;
      reaction.reactedBy = reaction.reactedBy.filter(user => user !== currentUser);
      if (reaction.reactedBy.length === 0) {
        await deleteDoc(doc(this.firestore, this.reactionCollectionPath, reaction.id));
        return;
      }
    }
    const currentRef = doc(this.firestore, `${this.reactionCollectionPath}/${reaction.id}`);
    const data = {
      count: reaction.count,
      reaction: reaction.reaction,
      reactedBy: reaction.reactedBy,
    };
    await updateDoc(currentRef, data);
  }

  /**
 * Sorts the `reactedBy` array of each reaction to ensure the current user's ID is at the beginning.
 * This method prioritizes the current user's reaction in the UI by modifying the order of user IDs
 * in the `reactedBy` array for each reaction object within the `reactions` array.
 */
  sortReactionIds() {
    this.reactions.forEach(reaction => {
      if (reaction.reactedBy.includes(this.currentUser)) {
        const index = reaction.reactedBy.findIndex(obj => obj === this.currentUser);
        if (index > -1) {
          reaction.reactedBy.splice(index, 1);
          reaction.reactedBy.unshift(this.currentUser);
        }
      }
    });
  }

  /**
   * Sorts the `reactedByName` array of each reaction to ensure the current user's name is at the beginning.
   * Similar to `sortReactionIds`, this method modifies the order of names in the `reactedByName` array
   * for each reaction object within the `reactions` array to prioritize the current user's name in the UI.
   */
  sortReactionNames() {
    this.reactions.forEach(reaction => {
      if (reaction.reactedByName.includes(this.currentUserName)) {
        const index = reaction.reactedByName.findIndex(obj => obj === this.currentUserName);
        if (index > -1) {
          reaction.reactedByName.splice(index, 1);
          reaction.reactedByName.unshift(this.currentUserName);
        }
      }
    });
  }

  /**
   * Handles an existing reaction for a given emoji and user.
   * If the current user has already reacted with the specified emoji, the reaction is either updated or removed.
   * Otherwise, the user's reaction is added. This method determines the appropriate action based on
   * the existence and state of the reaction in the `reactions` array.
   *
   * @param {string} emoji - The emoji character representing the reaction to handle.
   * @param {string} currentUser - The ID of the current user reacting to the message.
   */
  async handleExistingReaction(emoji: string, currentUser: string) {
    for (let reaction of this.reactions) {
      if (emoji === reaction.reaction) {
        const addReaction = !reaction.reactedBy.includes(currentUser);
        await this.updateOrRemoveReaction(reaction, currentUser, addReaction);
      }
    }
  }

  /**
   * Adds a new reaction to a message with the specified emoji and by the current user.
   * This method creates a new document in the Firestore collection specified by `this.reactionCollectionPath`.
   * It logs the newly added reaction for debugging purposes.
   *
   * @param {string} emoji - The emoji character for the new reaction.
   * @param {string} currentUser - The ID of the current user adding the reaction.
   */
  async addReaction(emoji: string, currentUser: string) {
    const newReaction = await addDoc(collection(this.firestore, this.reactionCollectionPath), {
      count: 1,
      reaction: emoji,
      reactedBy: [currentUser],
    });
    console.log('New reaction added', newReaction);
  }


  /**
 * Sets the flag to show the emoji picker in the UI.
 * This method is triggered to display the emoji selection interface to the user.
 */
  openMoreEmojis() {
    this.showMoreEmojis = true;
  }

  /**
   * Sets the flag to show the emoji toolbar in the UI.
   * Similar to `openMoreEmojis`, this method is used to display an additional or alternative
   * emoji selection interface, potentially offering more options or a different UI experience.
   */
  openMoreEmojisToolbar() {
    this.showMoreEmojisToolbar = true;
  }

  /**
   * Opens the field to edit the own message by setting the openEditOwnMessage flag to true.
   */
  openEditOwnMessageField() {
    this.openEditOwnMessage = true;
  }

  /**
   * Prepares the component to start editing a message by showing the input field and setting the current editing
   * text to the message's original text.
   */
  startEditMessage() {
    //this.openEditOwnInput = true;
    this.openEditOwnMessage = false;
    //this.editingMessageText = this.message.message;
    this.ownMessageEdit = true;
  }

  /**
   * Retrieves the user's name by their userId from the list of channel members.
   * 
   * @param {string} userId - The user's ID whose name is to be retrieved.
   * @returns {string} The name of the user if found, or a default string indicating an unknown user.
   */
  getUserName(userId: string): string {
    const user = this.channelMembers.find(member => member.userId === userId);
    return user ? user.name : 'Unbekannter Benutzer';
  }


  /**
  * Retrieves the profile image URL of a user based on their user ID.
  * 
  * @param {string} userId - The unique identifier of the user whose profile image URL is to be retrieved.
  * @returns {string} The URL of the user's profile image if the user is found within the channel members; otherwise, a default image URL.
  */
  getUserProfileImageUrl(userId: string): string {
    const user = this.channelMembers.find(member => member.userId === userId);
    return user ? user.imgUrl : 'defaultImageUrl'; // Ensure you have a default image URL or keep 'imgUrl' as is if it's a placeholder.
  }

  /**
   * Closes the emoji picker and emoji toolbar by resetting their visibility flags.
   */
  closeMoreEmojis(showMoreEmojis: boolean) {
    this.showMoreEmojis = false;
    this.showMoreEmojisToolbar = false;
  }

  /**
   * Handles click events outside of specific UI components (e.g., the edit message input and edit message button).
   * If a click event occurs outside these components, certain UI elements or actions are triggered, such as closing
   * the edit input or saving message changes.
   * 
   * @param {MouseEvent} event - The mouse event that triggers the outside click handler.
   */
  handleClickOutside = (event: MouseEvent) => {
    const editMessageInput = document.querySelector('.edit-message-input');
    if (editMessageInput && !editMessageInput.contains(event.target as Node)) {
      this.openEditOwnInput = false;
      //this.saveMessageChanges();
    }

    const openEditOwnMessageElement = document.querySelector('.edit-message');
    if (openEditOwnMessageElement && !openEditOwnMessageElement.contains(event.target as Node)) {
      this.openEditOwnMessage = false;
    }
  }

  /**
   * Sets up an event listener for clicks outside of specific UI elements, using `handleClickOutside` as the callback.
   * This method enhances UI interactivity by closing or saving UI elements when the user clicks outside of them.
   */
  setupOutsideClickHandler(): void {
    document.addEventListener('mousedown', this.handleClickOutside, true);
  }

  /**
   * Removes the event listener set up by `setupOutsideClickHandler`, cleaning up resources and preventing memory leaks.
   */
  teardownOutsideClickHandler(): void {
    document.removeEventListener('mousedown', this.handleClickOutside, true);
  }

  /**
   * Closes the edit-own component and returns to the thread.
   */
  closeEditedMessage(dialogBoolen: boolean) {
    this.ownMessageEdit = false;
  }

}
