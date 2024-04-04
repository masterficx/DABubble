import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  Renderer2,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { EmojiComponent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {
  Storage,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from '@angular/fire/storage';
import { User } from '../../../../models/user.class';
import {
  DocumentReference,
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { UserManagementService } from '../../../services/user-management.service';
import { ViewManagementService } from '../../../services/view-management.service';
import { ChatService } from '../../../services/chat.service';
import { DirectMessage } from '../../../../models/directMessage.class';

@Component({
  selector: 'app-text-box',
  standalone: true,
  imports: [
    MatIconModule,
    FormsModule,
    PickerComponent,
    EmojiComponent,
    CommonModule,
  ],
  templateUrl: './text-box.component.html',
  styleUrls: [
    './text-box.component.scss',
    './text-box.component-mediaquery.scss',
  ],
})
export class TextBoxComponent {
  @ViewChild('message') messageInput: ElementRef<HTMLInputElement>;
  @ViewChild('fileUpload') fileUpload: ElementRef;
  @ViewChild('userSelection') userSelection: ElementRef;
  @Input() messageType: 'direct' | 'channel' | 'thread' | 'threadMessage';
  @Input() targetId: string; // ID des Nutzers/Kanals/Threads
  @Input() placeholderText: string;

  inputFocused: boolean = false;
  messageModel: string = '';
  showEmojiPicker: boolean = false;
  showMentionUser: boolean = false;
  displayUser: boolean = false;
  displayChannels: boolean = false;
  user = new User();
  allUsers: any = [];
  filteredUsers: any = [];
  filteredChannel: any = [];
  allChannel: any = [];
  storage = inject(Storage);
  private firestore: Firestore = inject(Firestore);

  private userSubscription!: Subscription;
  private channelSubscription!: Subscription;
  private channelIdSubscription: Subscription;
  private userIdSubscription: Subscription;
  public imageURL: string | undefined;
  public filePath: string | undefined;

  constructor(
    public userManagementService: UserManagementService,
    private viewManagementService: ViewManagementService,
    private cdRef: ChangeDetectorRef,
    private chatService: ChatService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.subscribeToUsers();
    this.subscribeToChannels();
    this.reFocusOnChannelChange();
    this.listenToCloseUserSelection();
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
    this.channelSubscription.unsubscribe();
    this.channelIdSubscription.unsubscribe();
    this.userIdSubscription.unsubscribe();
  }

  ngAfterViewInit() {
    this.messageInput.nativeElement.focus();
    this.cdRef.detectChanges();
  }

  listenToCloseUserSelection(): void {
    this.renderer.listen('document', 'click', (event) => {
      if (this.userSelection && !this.userSelection.nativeElement.contains(event.target) &&
          this.messageInput && !this.messageInput.nativeElement.contains(event.target)) {
        this.displayUser = false;
        this.cdRef.detectChanges();
      }
    });
  }
  
  

  subscribeToUsers(): void {
    const usersCollection = collection(this.firestore, 'users');
    this.userSubscription = collectionData(usersCollection, {
      idField: 'id',
    }).subscribe(
      (changes) => {
        this.allUsers = changes;
        this.sortUsers(this.allUsers);
        this.filteredUsers = this.allUsers;
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );
  }

  subscribeToChannels(): void {
    const channelCollection = collection(this.firestore, 'channels');
    this.channelSubscription = collectionData(channelCollection, {
      idField: 'id',
    }).subscribe(
      (changes) => {
        this.allChannel = changes;
        this.sortChannel(this.allChannel);
        this.filteredChannel = this.allChannel;
      },
      (error) => {
        console.error('Error fetching channels:', error);
      }
    );
  }

  reFocusOnChannelChange() {
    this.channelIdSubscription =
      this.chatService.activeChannelIdUpdates.subscribe({
        next: () => {
          if (this.messageInput && this.messageInput.nativeElement) {
            this.messageInput.nativeElement.focus();
          }
        },
        error: (err) =>
          console.error(
            'Fehler beim Abonnieren von activeChannelIdUpdates',
            err
          ),
      });

    this.userIdSubscription = this.chatService.activeUserIdUpdates.subscribe({
      next: () => {
        if (this.messageInput && this.messageInput.nativeElement) {
          this.messageInput.nativeElement.focus();
        }
      },
      error: (err) =>
        console.error('Fehler beim Abonnieren von activeUserIdUpdates', err),
    });
  }

  focusInput() {
    if (!this.showEmojiPicker) {
      this.messageInput.nativeElement.focus();
    }
  }

  onInputFocus(): void {
    this.inputFocused = true;
  }

  onInputBlur(): void {
    this.inputFocused = false;
  }

  handleClick(event: any) {
    const emoji = event.emoji.native;
    this.insertTextAtCursor(emoji);
  }

  insertTextAtCursor(text: string, postInsertionAction?: () => void): void {
    const inputEl = this.messageInput.nativeElement;
    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;
    const before = inputEl.value.substring(0, start);
    const after = inputEl.value.substring(end, inputEl.value.length);
    this.messageModel = before + text + after;
    const newPos = start + text.length;
    setTimeout(() => {
      inputEl.selectionStart = newPos;
      inputEl.selectionEnd = newPos;
      postInsertionAction?.();
    });
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  closeEmojiPickerOrMentionUser() {
    this.showEmojiPicker = false;
    this.showMentionUser = false;
  }

  toggleMentionUser() {
    this.showMentionUser = !this.showMentionUser;
  }

  adjustTextareaHeight(event: any) {
    const textarea: HTMLTextAreaElement = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  async onFileSelected(event) {
    const file: File = event.target.files[0];
    if (!file) return;
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/svg+xml',
    ];
    if (!validTypes.includes(file.type)) {
      alert('Nur PNG, JPG, GIF und SVG Dateien sind zulässig.');
      return;
    }
    const maxSizeInBytes = 1.5 * 1024 * 1024; // 1,5 MB in Bytes
    if (file.size > maxSizeInBytes) {
      alert('Die Datei ist zu groß. Maximale Dateigröße ist 1,5 MB.');
      return;
    }
    await this.uploadImage(file);
  }

  generateUniqueId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  async uploadImage(file: File) {
    try {
      const uniqueId = this.generateUniqueId();
      const uniqueFileName = `${uniqueId}-${file.name}`;
      const filePath = `userUploads/${uniqueFileName}`;
      this.filePath = filePath;
      const storageRef = ref(this.storage, filePath);
      const uploadTask = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      this.imageURL = downloadUrl;
    } catch (error) {
      console.error('Error uploading file: ', error);
    }
  }

  async removeFileUpload() {
    if (!this.filePath) return;
    try {
      const storageRef = ref(this.storage, this.filePath);
      await deleteObject(storageRef);
      this.imageURL = undefined;
      this.filePath = undefined;
      this.resetFileInput();
    } catch (error) {
      console.error('Error deleting file: ', error);
    }
  }

  private resetFileInput() {
    if (this.fileUpload && this.fileUpload.nativeElement) {
      this.fileUpload.nativeElement.value = '';
    }
  }

  sortUsers(users): void {
    users.sort((a, b) => {
      if (a.id === this.userManagementService.activeUserId.value) return -1;
      if (b.id === this.userManagementService.activeUserId.value) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  sortChannel(channels): void {
    const filteredChannels = channels.filter((channel) =>
      channel.members.includes(this.userManagementService.activeUserId.value)
    );
    filteredChannels.sort((a, b) => a.creationDate - b.creationDate);
    this.allChannel = filteredChannels;
  }

  async sendMessage(): Promise<void> {
    if (!this.messageType || !this.targetId || !this.isMessageNotEmpty()) {
      console.error('Nachrichtendetails sind unvollständig');
      return;
    }

    try {
      switch (this.messageType) {
        case 'channel':
          await this.handleChannelMessage();
          break;
        case 'direct':
          await this.handleDirectMessage();
          break;
        case 'threadMessage':
          await this.handleThreadMessage();
          break;
        default:
          console.error('Unbekannter Nachrichtentyp');
      }
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht: ', error);
    }

    this.cleanupAfterSend();
  }

  private async handleChannelMessage() {
    const newThread = this.createThread();
    const docRef = await addDoc(
      collection(this.firestore, `channels/${this.targetId}/threads`),
      newThread
    );
    this.chatService.setActiveChannelId(this.targetId);
    this.viewManagementService.setView('channel');
    await this.updateDocument(`channels/${this.targetId}/threads`, docRef.id, {
      messageId: docRef.id,
    });
  }

  private async handleDirectMessage() {
    const messageData = new DirectMessage({
      yourMessage: true,
      createdBy: this.userManagementService.activeUserId.value,
      creationDate: Date.now(),
      message: this.messageModel.trim(),
      imageUrl: this.imageURL ? this.imageURL : null,
    });

    if (this.userManagementService.activeUserId.value !== this.targetId) {
      await this.sendDirectMessageToOther(this.targetId, messageData);
    } else {
      await this.sendDirectMessageToSelf(this.targetId, messageData);
    }
  }

  private async sendDirectMessageToOther(
    targetId: string,
    messageData: DirectMessage
  ) {
    const dmSenderRef = doc(
      this.firestore,
      `users/${this.userManagementService.activeUserId.value}/allDirectMessages`,
      targetId
    );
    const dmReceiverRef = doc(
      this.firestore,
      `users/${targetId}/allDirectMessages`,
      this.userManagementService.activeUserId.value
    );

    try {
      await setDoc(dmSenderRef, {}, { merge: true });
      await setDoc(dmReceiverRef, {}, { merge: true });
      await this.saveDirectMessage(dmSenderRef, messageData, true);
      await this.saveDirectMessage(dmReceiverRef, messageData, false);
      this.afterMessageSent(targetId);
    } catch (error) {
      console.error(
        'Fehler beim Senden der Direktnachricht an anderen:',
        error
      );
    }
  }

  private async sendDirectMessageToSelf(
    targetId: string,
    messageData: DirectMessage
  ) {
    const dmSenderRef = doc(
      this.firestore,
      `users/${this.userManagementService.activeUserId.value}/allDirectMessages`,
      targetId
    );
    try {
      await setDoc(dmSenderRef, {}, { merge: true });
      await this.saveDirectMessage(dmSenderRef, messageData, true);
      this.afterMessageSent(targetId);
    } catch (error) {
      console.error('Fehler beim Senden der Selbstnachricht:', error);
    }
  }

  private async saveDirectMessage(
    ref: DocumentReference,
    messageData: DirectMessage,
    isSender: boolean
  ) {
    const collectionRef = collection(ref, 'directMessages');
    const docRef = await addDoc(
      collectionRef,
      isSender
        ? messageData.toJSON()
        : { ...messageData.toJSON(), yourMessage: false }
    );
    await updateDoc(doc(collectionRef, docRef.id), { messageId: docRef.id });
  }

  private afterMessageSent(targetId: string) {
    this.userManagementService.loadUsers();
    this.chatService.setSelectedUserId(targetId);
    this.viewManagementService.setView('directMessage');
    this.displayChannels = false;
    this.displayUser = false;
  }

  private async updateDocument(path: string, docId: string, data: object) {
    await updateDoc(doc(this.firestore, path, docId), data);
  }

  private cleanupAfterSend() {
    this.messageModel = '';
    this.imageURL = undefined;
    this.filePath = undefined;
    this.displayUser = false;
    this.displayChannels = false;
  }

  private async handleThreadMessage() {
    const newMessage = this.createThreadMessage();
    const docRef = await addDoc(
      collection(
        this.firestore,
        `channels/${this.chatService.getActiveChannelId()}/threads/${
          this.targetId
        }/messages`
      ),
      newMessage
    );
    await this.updateDocument(
      `channels/${this.chatService.getActiveChannelId()}/threads/${
        this.targetId
      }/messages`,
      docRef.id,
      { messageId: docRef.id }
    );
  }

  private createThread(): any {
    return {
      createdBy: this.userManagementService.activeUserId.value,
      creationDate: Date.now(),
      message: this.messageModel.trim(),
      imageUrl: this.imageURL ? this.imageURL : null,
    };
  }

  private createThreadMessage(): any {
    return {
      createdBy: this.userManagementService.activeUserId.value,
      creationDate: Date.now(),
      message: this.messageModel.trim(),
      imageUrl: this.imageURL ? this.imageURL : null,
    };
  }

  onKeydown(event) {
    event.preventDefault();
  }

  isMessageNotEmpty(): boolean {
    return (
      this.messageModel.trim().length > 0 ||
      (this.imageURL && this.imageURL.trim().length > 0)
    );
  }

  onInputChange(inputValue: string): void {
    const cursorPosition = this.messageInput.nativeElement.selectionStart;
    const textUpToCursor = inputValue.substring(0, cursorPosition);
    const lastAtPos = textUpToCursor.lastIndexOf('@');
    const lastHashPos = textUpToCursor.lastIndexOf('#');

    if (lastAtPos === -1 && lastHashPos === -1) {
      this.displayUser = false;
      this.displayChannels = false;
      return;
    }

    // Bestimmen, ob wir gerade eine Benutzer- oder Kanalerwähnung haben
    if (lastAtPos > -1 && (lastHashPos < 0 || lastAtPos > lastHashPos)) {
      this.displayUser = true;
      this.displayChannels = false;
      const searchTerm = textUpToCursor.substring(lastAtPos + 1).toLowerCase();
      this.handleUserSearch(searchTerm);
    } else if (lastHashPos > -1 && (lastAtPos < 0 || lastHashPos > lastAtPos)) {
      this.displayChannels = true;
      this.displayUser = false;
      const searchTerm = textUpToCursor
        .substring(lastHashPos + 1)
        .toLowerCase();
      this.handleChannelSearch(searchTerm);
    } else {
      this.resetFilters();
    }
  }

  handleUserSearch(searchTerm: string): void {
    this.filteredUsers = this.allUsers.filter((user) =>
      user.name.toLowerCase().startsWith(searchTerm)
    );
    this.displayUser = this.filteredUsers.length > 0;
    this.displayChannels = false;
  }

  handleChannelSearch(searchTerm: string): void {
    this.filteredChannel = this.allChannel.filter((channel) =>
      channel.name.toLowerCase().startsWith(searchTerm)
    );
    this.displayChannels = this.filteredChannel.length > 0;
    this.displayUser = false;
  }

  selectUser(userName: string) {
    this.replaceMentionText('@', userName);
    this.displayUser = false;
  }

  selectChannel(channelName: string) {
    this.replaceMentionText('#', channelName);
    this.displayChannels = false;
  }

  replaceMentionText(prefix: string, fullName: string) {
    const inputEl = this.messageInput.nativeElement;
    const cursorPosition = inputEl.selectionStart;
    const inputValue = this.messageModel;
    const textUpToCursor = inputValue.substring(0, cursorPosition);
    const lastPrefixPos = textUpToCursor.lastIndexOf(prefix);

    if (lastPrefixPos !== -1) {
      const beforeMention = inputValue.substring(0, lastPrefixPos);
      const afterMention = inputValue.substring(
        cursorPosition,
        inputValue.length
      );
      this.messageModel = `${beforeMention}${prefix}${fullName} ${afterMention}`;
      const newPos = beforeMention.length + fullName.length + 2;

      // Fokusieren Sie das Eingabeelement und passen Sie die Cursorposition an
      setTimeout(() => {
        inputEl.focus();
        inputEl.selectionStart = newPos;
        inputEl.selectionEnd = newPos;
      });
    }
    this.displayChannels = false;
    this.displayUser = false;
  }

  resetFilters(): void {
    this.filteredUsers = [];
    this.filteredChannel = [];
  }
}
