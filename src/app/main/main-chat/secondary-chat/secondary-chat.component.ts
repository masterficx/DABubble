import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { EmojiComponent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from '@angular/fire/firestore';
import { environment } from '../../../../environments/environment.development';
import { getStorage, ref, getDownloadURL, getMetadata } from "firebase/storage";
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { InputService } from '../../../services/input.service';
import { ThreadMessage } from '../../../../models/threadMessage.class';
import { Subscription } from 'rxjs';
import { Thread } from '../../../../models/thread.class';
import { Channel } from '../../../../models/channel.class';
import { ReactionEmojiInputComponent } from '../reaction-emoji-input/reaction-emoji-input.component';
import { UserManagementService } from '../../../services/user-management.service';
import { TextBoxComponent } from '../../new-message/text-box/text-box.component';
import { SecondaryChatMessagesComponent } from './secondary-chat-messages/secondary-chat-messages.component';
import { ViewManagementService } from '../../../services/view-management.service';
import { MatIconModule } from '@angular/material/icon';

const app = initializeApp(environment.firebase);
@Component({
  selector: 'app-secondary-chat',
  standalone: true,
  imports: [
    PickerComponent,
    EmojiComponent,
    CommonModule,
    FormsModule,
    ReactionEmojiInputComponent,
    SecondaryChatMessagesComponent,
    TextBoxComponent,
    MatIconModule
  ],
  templateUrl: './secondary-chat.component.html',
  styleUrl: './secondary-chat.component.scss',
})
export class SecondaryChatComponent implements OnInit, OnDestroy {
  @ViewChild('message') messageInput: ElementRef<HTMLInputElement>;
  @ViewChild('chatContent') private chatContent: ElementRef;
  @ViewChild('emojiPicker') emojiPicker: ElementRef;
  private subscription = new Subscription();
  private firestore: Firestore = inject(Firestore);
  auth = getAuth(app);
  /*---------- Main Variables -----------*/
  currentUser: string = '';
  channel: Channel; // Data of actual channel
  channelMembers = []; // userdata of actual channel members
  activeChannelId: string = '';
  private threadIdSubscription!: Subscription;
  public selectedThreadId!: string;
  threadMessages: ThreadMessage[] = [];
  firstThreadMessage?: ThreadMessage;
  threadOpen: boolean = false;
  creationDate: Date;
  isLoading: boolean = true;
  editingMessageId: string | null = null;
  editingMessageText: string = '';
  openEditOwnMessage: boolean = false;
  /*---------- Emoji and Reaction Variables -----------*/
  emojiWindowOpen = false;
  messageModel: string = '';
  currentCursorPosition: number = 0;
  showMoreEmojis: { [key: string]: boolean } = {};
  reactionCollectionPath: string;
  reactions = [];

  constructor(
    public chatService: ChatService,
    public userManagementService: UserManagementService,
    public viewManagementService: ViewManagementService,
    public inputService: InputService
  ) {
  }

  ngOnInit(): void {
    this.setCurrentUser();
    this.getActualChannelId();
    this.getActualThreadId();
    this.subcribeThreadId();
    this.getCurrentChannelData();
    this.loadThreadInitMessage();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngAfterViewInit() {
    setTimeout(() =>
      this.scrollToBottom()
      , 400);
    setTimeout(() =>
      this.setFokusToTextarea()
      , 400);
  }

  /**
   * Focuses the text input area if it exists.
   * Checks for the existence of the messageInput reference and its nativeElement before applying focus.
   */
  setFokusToTextarea() {
    if (this.messageInput && this.messageInput.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }

  /**
   * Asynchronously downloads a file from a given storage reference URL and initiates a download in the browser.
   * This function retrieves both the download URL and metadata for a file from Firebase storage,
   * then calls `downloadData` to handle the actual download.
   *
   * @param {string} imageURL - The reference URL to the file in Firebase storage.
   * @throws Will throw an error if it fails to retrieve the file's URL or metadata.
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
   * Initiates the download of a file given its URL and a filename.
   * This function creates a blob from the response of a fetch request to the file's URL,
   * then creates a temporary link element to trigger the download.
   *
   * @param {string} url - The URL of the file to download.
   * @param {string} filename - The name to give the downloaded file.
   * @throws Will throw an error if the network response is not ok or if the document cannot be downloaded.
   */
  async downloadData(url, filename) {
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



  openImage(url: string) {
    window.open(url, '_blank');
  }

  /**
   * Toggles the edit message field for a given message, allowing the user to start or stop editing a message.
   * If the user decides to edit a different message while already editing one, this method will switch the focus
   * to the new message.
   *
   * @param {string} messageId - The ID of the message that the user wants to edit.
   */
  openEditOwnMessageField(messageId: string) {
    this.editingMessageId = messageId;
    this.openEditOwnMessage = !this.openEditOwnMessage;
  }

  /**
   * Prepares a message for editing by setting its ID and text into component state variables.
   * This method is typically called when a user clicks an edit button associated with a message.
   *
   * @param {ThreadMessage} message - The message object that the user intends to edit, containing at least
   *                                  the `messageId` and the current `message` text.
   */
  startEditMessage(message: ThreadMessage) {
    this.editingMessageId = message.messageId;
    this.editingMessageText = message.message;
    this.openEditOwnMessage = false;
  }

  /**
   * Saves the changes made to a message's text to the Firestore database. This method is called
   * when a user finishes editing a message and confirms the changes. It updates the document
   * in Firestore corresponding to the message being edited with the new text.
   * If no message is being edited, the function returns early.
   */
  async saveMessageChanges() {
    if (!this.editingMessageId) return;
    const messageRef = doc(
      this.firestore,
      `channels/${this.activeChannelId}/threads/${this.selectedThreadId}/messages`,
      this.editingMessageId
    );
    await updateDoc(messageRef, { message: this.editingMessageText });
    this.editingMessageId = null;
    this.editingMessageText = '';
  }

  /**
   * Closes the message editing field without saving changes, resetting the component state related to message editing.
   * This method can be called to cancel the editing process.
   */
  closeEditMessageField() {
    this.openEditOwnMessage = false;
  }

  /**
   * Opens the emoji selection panel for a specific message, allowing the user to add an emoji reaction to it.
   * This method updates the component state to track which messages have the emoji panel open.
   *
   * @param {string} messageId - The ID of the message for which to open the emoji panel.
   */
  openMoreEmojis(messageId: string) {
    this.showMoreEmojis[messageId] = true;
  }

  /**
   * Closes the emoji selection panel for a specific message, updating the component state accordingly.
   * This method is called when a user decides to close the emoji panel without adding a reaction or after adding one.
   *
   * @param {string} messageId - The ID of the message for which to close the emoji panel.
   */
  closeMoreEmojis(messageId: string) {
    this.showMoreEmojis[messageId] = false;
  }


  /**
   * Retrieves and sets the current active channel ID from the chat service.
   * If no channel ID is currently active, it defaults to a general channel, identified by 'allgemein'.
   * This method is crucial for ensuring the component is interacting with the correct channel data within the application.
   */
  getActualChannelId() {
    this.activeChannelId = this.chatService.getActiveChannelId() || 'allgemein';
  }

  /**
   * Subscribes to the selectedThreadId observable from the chat service to track the current thread ID.
   * Updates the component's `selectedThreadId` property whenever the observable emits a new value.
   * This method ensures the component always reflects the current thread being viewed or interacted with by the user.
   */
  getActualThreadId() {
    this.threadIdSubscription = this.chatService.selectedThreadId$.subscribe(
      (threadId) => {
        this.selectedThreadId = threadId;
      }
    );
  }

  /**
   * Updates the path used for accessing the reaction collection in Firestore based on the current channel,
   * thread, and message IDs. This method dynamically constructs the Firestore path needed to query or update
   * reactions for a specific message, ensuring that emoji reactions are correctly associated with their respective messages.
   *
   * @param {string} messageId - The ID of the message for which to update the reaction collection path.
   */
  async updateReactionCollectionPath(messageId) {
    if (this.selectedThreadId && this.threadMessages && this.activeChannelId) {
      this.reactionCollectionPath = `channels/${this.activeChannelId}/threads/${this.selectedThreadId}/messages/${messageId}/reactions`;
    }
  }

  /**
   * Sets the current user ID for the component, retrieving it from the user management service.
   * This method ensures that the component can track and display information relevant to the current user,
   * such as filtering messages or showing user-specific options and functionalities.
   */
  setCurrentUser() {
    this.currentUser = this.userManagementService.activeUserId.value;
  }


  /**
  * Subscribes to changes in the selected thread ID from the chat service. Upon receiving a new thread ID,
  * it loads the messages for that thread and the initial thread message for display. If no thread ID is
  * available, it logs a message to the console indicating the absence of a thread ID.
  */
  subcribeThreadId() {
    this.subscription.add(
      this.chatService.selectedThreadId$.subscribe((threadId) => {
        if (threadId) {
          this.loadThreadMessages(threadId);
          this.loadThreadInitMessage();
        } 
      })
    );
  }

  /**
   * Closes the currently open thread. This involves calling the chat service to handle any required cleanup
   * or state updates and setting the application view back to the channel view, effectively exiting the thread view.
   */
  closeThread(): void {
    this.chatService.closeThread();
    this.viewManagementService.setView('channel');
  }

  /**
   * Scrolls the chat content to the bottom. This method is typically used to ensure that the most recent messages
   * are visible to the user, especially after loading new messages or when the user sends a message.
   */
  private scrollToBottom(): void {
    if (this.chatContent && this.chatContent.nativeElement) {
      try {
        this.chatContent.nativeElement.scrollTo({
          top: this.chatContent.nativeElement.scrollHeight,
          behavior: 'smooth',
        });
      } catch (err) {
        console.error('Fehler beim Scrollen:', err);
      }
    }
  }

  /**
   * Fetches all messages for a specified thread within a given channel. This asynchronous method queries the Firestore
   * database for messages in the thread, constructs ThreadMessage objects from the returned documents, and returns an array
   * of these messages.
   *
   * @param {string} channelId - The ID of the channel containing the thread.
   * @param {string} threadId - The ID of the thread from which to fetch messages.
   * @return {Promise<ThreadMessage[]>} A promise that resolves to an array of ThreadMessage objects representing the messages
   *                                    in the specified thread.
   */
  async getThreadMessages(channelId: string, threadId: string): Promise<ThreadMessage[]> {
    const threadMessagesRef = collection(this.firestore, `channels/${channelId}/threads/${threadId}/messages`);
    const snapshot = await getDocs(threadMessagesRef);
    const threadMessages = snapshot.docs
      .map((doc) => new ThreadMessage({ ...doc.data(), messageId: doc.id }))
      .reverse();
    return threadMessages;
  }


  /**
  * Subscribes to the collection of messages within a specified thread, listening for real-time updates.
  * This method constructs a query to fetch messages in ascending order by their creation date,
  * ensuring the chat displays messages in the order they were sent. Upon receiving updates from Firestore,
  * it maps the document snapshots to `ThreadMessage` instances and passes them to `handleThreadMessages`
  * for further processing.
  *
  * @param {string} threadId - The ID of the thread from which to load messages. This ID is used to construct
  *                            the path to the relevant Firestore collection.
  */
  loadThreadMessages(threadId: string) {
    const channelId = this.activeChannelId;
    const threadMessagesRef = query(
      collection(this.firestore, `channels/${channelId}/threads/${threadId}/messages`),
      orderBy('creationDate', 'asc')
    );

    onSnapshot(threadMessagesRef, (snapshot) => {
      const threadMessages = snapshot.docs.map(
        (doc) => new ThreadMessage({ ...doc.data(), messageId: doc.id })
      );
      this.handleThreadMessages(threadMessages);
    });
  }

  /**
   * Handles the array of thread messages retrieved from Firestore. This method updates the component's
   * state with the new list of messages, ensuring the UI reflects the latest chat history. It also
   * triggers UI actions such as scrolling to the bottom of the chat view to show the most recent message.
   *
   * @param {ThreadMessage[]} threadMessages - An array of `ThreadMessage` instances representing the current
   *                                           snapshot of messages within the thread.
   */
  handleThreadMessages(threadMessages: ThreadMessage[]) {
    this.threadMessages = threadMessages;
    this.setCurrentUser();
    this.scrollToBottom();
  }

  /**
   * Asynchronously retrieves the initial message of a specified thread. This method is useful for fetching
   * context or introductory information about the thread. It queries Firestore for the document representing
   * the thread and returns it as a `Thread` instance if found.
   *
   * @param {string} channelId - The ID of the channel containing the thread. Used to construct the path to the thread document.
   * @param {string} threadId - The ID of the thread for which to retrieve the initial message.
   * @returns {Promise<Thread>} A promise that resolves to a `Thread` instance representing the initial message of the thread.
   */
  async getInitialThreadMessage(channelId: string, threadId: string): Promise<Thread> {
    const threadRef = doc(this.firestore, `channels/${channelId}/threads/${threadId}`);
    const docSnap = await getDoc(threadRef);

    if (docSnap.exists()) {
      const threadData = docSnap.data();
      return new Thread(threadData);
    }
  }

  /**
   * Initiates the process of loading the initial message of the currently selected thread.
   * This method sets a loading state, calls `getInitialThreadMessage` to fetch the initial message,
   * and updates the component state with the retrieved message, thereby providing context for the thread.
   */
  async loadThreadInitMessage() {
    this.isLoading = true;
    this.firstThreadMessage = await this.getInitialThreadMessage(
      this.activeChannelId,
      this.selectedThreadId
    );
    this.isLoading = false;
  }


  /**
  * Subscribes to changes in the current channel's data in Firestore and updates the component state
  * accordingly. After successfully fetching the channel data, it triggers the `getMembers` method
  * to fetch the channel members' data with a slight delay to ensure smooth UI updates.
  */
  getCurrentChannelData() {
    onSnapshot(doc(collection(this.firestore, 'channels'), this.activeChannelId), (doc) => {
      this.channel = new Channel(doc.data());
      setTimeout(() => {
        this.getMembers();
      }, 200);
    });
  }

  /**
   * Fetches the list of all users from Firestore and processes the data to update the channel members'
   * state in the component. This method subscribes to the users collection and filters out the members
   * based on the current channel's member list.
   */
  getMembers() {
    const q = query(collection(this.firestore, 'users'));
    onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id }));
      this.handleMembersData(users);
    });
  }

  /**
   * Filters the fetched list of users to identify members of the current channel. It updates the component's
   * state with the list of channel members for further use in the UI, such as displaying user names or profile pictures.
   *
   * @param {Array<Object>} users - An array of user objects fetched from Firestore.
   */
  handleMembersData(users: any[]) {
    this.channelMembers = users.filter(user => this.channel['members'].includes(user.userId));
  }

  /**
   * Retrieves the display name of a user based on their user ID. If the user cannot be found in the
   * channel members list, it returns a default string indicating an unknown user.
   *
   * @param {string} userId - The user ID for which to retrieve the display name.
   * @return {string} The user's display name if found, otherwise a default string.
   */
  getUserName(userId: string): string {
    const user = this.channelMembers.find((member) => member.userId === userId);
    return user ? user.name : 'Unbekannter Benutzer';
  }

  /**
   * Retrieves the profile image URL of a user based on their user ID. If the user cannot be found
   * in the channel members list, it returns a default image URL placeholder.
   *
   * @param {string} userId - The user ID for which to retrieve the profile image URL.
   * @return {string} The user's profile image URL if found, otherwise a default image URL.
   */
  getUserProfileImageUrl(userId: string): string {
    const user = this.channelMembers.find(member => member.userId === userId);
    return user ? user.imgUrl : 'imgUrl';
  }


  /**
  * Toggles the visibility of the emoji picker window in the UI. This method flips the state of
  * `emojiWindowOpen`, which controls whether the emoji picker is displayed to the user.
  */
  toggleEmojis() {
    this.emojiWindowOpen = !this.emojiWindowOpen;
  }

  /**
   * Handles the selection of an emoji from the emoji picker. When an emoji is selected, this method
   * appends the emoji to the current content of the message model, effectively adding the emoji to the
   * message input field. It then ensures the text area remains focused and the cursor is placed at the
   * end of the inserted emoji.
   *
   * @param {any} event - The event object from the emoji picker, containing details about the selected emoji.
   */
  onEmojiSelect(event: any) {
    const emoji = event.emoji.native;
    this.messageModel += emoji;
    this.setFocusAndCursorPosition();
  }

  /**
   * Sets focus to the message input field and positions the cursor at the end of the current text.
   * This is primarily used after inserting an emoji to ensure the user can continue typing seamlessly.
   * A slight delay is introduced with `setTimeout` to ensure the focus and cursor positioning occur
   * after any potential DOM updates.
   */
  setFocusAndCursorPosition() {
    setTimeout(() => {
      const textArea: HTMLInputElement = this.messageInput.nativeElement;
      textArea.focus();
      const len = this.messageModel.length;
      textArea.setSelectionRange(len, len);
    }, 0);
  }

  /**
   * Updates the component's record of the current cursor position within the message input field.
   * This method is called on text input events to track where the cursor is, allowing for accurate
   * insertion of emojis or other text manipulations based on the cursor's position.
   *
   * @param {any} event - The input event object, from which the cursor's current position is extracted.
   */
  updateCursorPosition(event: any) {
    this.currentCursorPosition = event.target.selectionStart;
  }

}
