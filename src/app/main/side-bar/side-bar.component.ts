import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogAddChannelComponent } from './dialog-add-channel/dialog-add-channel.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddUserNewChannelComponent } from './dialog-add-user-new-channel/dialog-add-user-new-channel.component';
import { ViewManagementService } from '../../services/view-management.service';
import { UserManagementService } from '../../services/user-management.service';
import { ChatService } from '../../services/chat.service';
import {
  Firestore,
  collection,
  getDocs,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  getDoc,
  QuerySnapshot,
  DocumentData,
} from '@angular/fire/firestore';
import { Channel } from '../../../models/channel.class';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [
    MatIconModule,
    CommonModule,
    DialogAddChannelComponent,
    DialogAddUserNewChannelComponent,
  ],
  templateUrl: './side-bar.component.html',
  styleUrls: [
    './side-bar.component.scss',
    './side-bar.component-mediaquery.scss',
  ],
})
export class SideBarComponent {
  workspaceVisible: boolean = true;
  channelsVisible: boolean = true;
  usersVisible: boolean = true;
  dialogAddChannelVisible: boolean = false;
  dialogAddUserVisible: boolean = false;

  selectedChannel: string | null = null;
  selectedUserId: number | null = null;
  channels$: Observable<{ id: string; data: Channel }[]>;
  channels: { id: string; data: Channel }[] = [];
  users$ = this.userManagementService.users$;
  filteredUsers$ = this.userManagementService.filteredUsers$;
  screenSize: string;
  newChannelId: string;
  private screenSizeSubscription: Subscription;
  private subscription = new Subscription();
  private firestore: Firestore = inject(Firestore);

  constructor(
    public dialog: MatDialog,
    public viewManagementService: ViewManagementService,
    public userManagementService: UserManagementService,
    private chatService: ChatService
  ) {}

  async ngOnInit() {
    this.userManagementService.loadUsers();
    this.viewManagementService.setView('sidebar');
    this.screenSizeSubscription =
      this.viewManagementService.screenSize$.subscribe((size) => {
        this.screenSize = size;
      });
    this.userManagementService.activeUserId$.subscribe((activeUserId) => {
      if (activeUserId) {
        this.channels$ = this.loadChannels(activeUserId);
        this.preSelect(activeUserId);
      }
    });
    this.subscription.add(
      this.viewManagementService.showSidebarToggle$.subscribe((value) => {
        this.workspaceVisible = value;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.screenSizeSubscription.unsubscribe();
  }

  toggleSection(section: string): void {
    if (section === 'channels') {
      this.channelsVisible = !this.channelsVisible;
    } else if (section === 'users') {
      this.usersVisible = !this.usersVisible;
    } else if (section === 'workspace') {
      this.workspaceVisible = !this.workspaceVisible;
      if (this.workspaceVisible) {
        this.viewManagementService.setView('sidebar');
      }
    }
  }

  toggleAddChannelDialog() {
    this.dialogAddChannelVisible = !this.dialogAddChannelVisible;
  }

  toggleAddUserDialog() {
    this.dialogAddUserVisible = !this.dialogAddUserVisible;
  }

  hideAddChannelDialog() {
    this.dialogAddChannelVisible = false;
    this.setActiveChannel(this.newChannelId);
  }

  async openNewMessage() {
    this.chatService.setActiveChannelId(null);
    this.chatService.setSelectedUserId(null);
    this.viewManagementService.setView('newMessage');
  }

  /**
   * Loads channel data for active user and returns an Observable of channels.
   * queries the 'channels' collection from Firestore, transforms the document snapshots
   * into channel objects, and then filters and sorts them based on the active user. The resulting
   * array of channels is emitted to subscribers of the returned Observable.
   *
   * @param {string} activeUserId - The ID of the currently active user, used to filter channels.
   * @returns {Observable<{id: string; data: Channel}[]>} An Observable stream of filtered and sorted channels.
   */
  loadChannels(
    activeUserId: string
  ): Observable<{ id: string; data: Channel }[]> {
    const channelsCol = collection(this.firestore, 'channels');
    return new Observable<{ id: string; data: Channel }[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        channelsCol,
        (snapshot) => {
          const transformedChannels = this.transformChannelDocs(snapshot);
          const filteredAndSortedChannels = this.filterAndSortChannels(
            transformedChannels,
            activeUserId
          );
          subscriber.next(filteredAndSortedChannels);
        },
        (error) => {
          subscriber.error(error);
        }
      );
      return () => unsubscribe();
    });
  }

  /**
   * Transforms Firestore document snapshots into channel objects.
   * @param {QuerySnapshot<DocumentData>} snapshot - A Firestore query snapshot containing channel documents.
   * @returns {{id: string; data: Channel}[]} An array of channel objects with ID and data properties.
   */
  private transformChannelDocs(
    snapshot: QuerySnapshot<DocumentData>
  ): { id: string; data: Channel }[] {
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      data: new Channel(doc.data() as Channel),
    }));
  }

  /**
   * Channels are first filtered to include only those where the active user is a member.
   * Then, the filtered channels are sorted by their creation date in ascending order.   *
   * @param {{id: string; data: Channel}[]} channels - An array of channel objects to be filtered and sorted.
   * @param {string} activeUserId - The ID of the currently active user, used to filter channels.
   * @returns {{id: string; data: Channel}[]} The filtered and sorted array of channel objects.
   */
  private filterAndSortChannels(
    channels: { id: string; data: Channel }[],
    activeUserId: string
  ): { id: string; data: Channel }[] {
    return channels
      .filter((channel) => channel.data.members.includes(activeUserId))
      .sort((a, b) => a.data.creationDate - b.data.creationDate);
  }

  async addChannelToFirestore(
    channel: Channel,
    activeUserId: string
  ): Promise<void> {
    try {
      const channelData = channel.toJSON();
      const docRef = await addDoc(
        collection(this.firestore, 'channels'),
        channelData
      );
      await this.loadChannels(activeUserId);
      this.newChannelId = docRef.id;
      if (this.screenSize === 'medium' || this.screenSize === 'large') {
        this.setActiveChannel(docRef.id);
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Kanals: ', error);
    }
  }

  async handleChannelCreationAndToggleDialog(channelData: {
    name: string;
    description: string;
  }): Promise<void> {
    await this.handleChannelCreation(channelData);
    this.toggleAddUserDialog();
  }

  async handleChannelCreation(channelData: {
    name: string;
    description: string;
  }): Promise<void> {
    let activeUserId = this.userManagementService.activeUserId.getValue();
    let newChannel = new Channel({
      name: channelData.name,
      description: channelData.description,
      createdBy: activeUserId,
      creationDate: Date.now(),
      type: 'channel',
      members: [activeUserId],
    });
    this.addChannelToFirestore(newChannel, activeUserId);
  }

  async onUsersToAdd({
    all,
    userIds,
  }: {
    all: boolean;
    userIds?: string[];
  }): Promise<void> {
    const selectedChannelId = this.newChannelId;
    if (!selectedChannelId) {
      console.error('Kein aktiver Kanal ausgewählt.');
      return;
    }
    let membersToUpdate: string[] = [];
    if (all) {
      membersToUpdate = await this.fetchAllUserIds();
    } else if (userIds) {
      membersToUpdate = userIds;
    }
    if (membersToUpdate.length > 0) {
      await this.updateChannelMembers(selectedChannelId, membersToUpdate);
    }
  }

  private async fetchAllUserIds(): Promise<string[]> {
    const snapshot = await getDocs(collection(this.firestore, 'users'));
    return snapshot.docs.map((doc) => doc.id);
  }

  private async updateChannelMembers(
    channelId: string,
    newMembers: string[]
  ): Promise<void> {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const channelSnap = await getDoc(channelRef);

    if (channelSnap.exists()) {
      const existingMembers = channelSnap.data()['members'] || [];
      const updatedMembers = Array.from(
        new Set([...existingMembers, ...newMembers])
      );
      await updateDoc(channelRef, { members: updatedMembers });
    } else {
      console.error('Der Kanal existiert nicht.');
    }
  }

  setActiveChannel(channelId: string) {
    this.chatService.closeThread();
    this.chatService.setActiveChannelId(channelId);
    this.viewManagementService.setView('channel');
  }

  getActiveChannelId() {
    return this.chatService.getActiveChannelId();
  }

  setSelectedUser(userId: string) {
    this.chatService.setSelectedUserId(userId);
    this.viewManagementService.setView('directMessage');
  }

  getSelectedUserId() {
    return this.chatService.getSelectedUserId();
  }

  async preSelect(activeUserId: string) {
    if (
      this.viewManagementService.showNewMessage.value === true ||
      this.viewManagementService.showDirectMessage.value === true
    ) {
    } else {
      if (
        (this.screenSize === 'medium' || this.screenSize === 'large') &&
        this.getActiveChannelId() === null
      ) {
        const isMember = await this.isUserMemberOfAllg(activeUserId);
        if (isMember) {
          this.setActiveChannel('allgemein');
        } else {
          this.openNewMessage();
        }
      }
    }
  }

  async isUserMemberOfAllg(userId: string) {
    const generalChannelRef = doc(this.firestore, 'channels', 'allgemein');
    const generalChannelSnap = await getDoc(generalChannelRef);
    if (generalChannelSnap.exists() && generalChannelSnap.data()['members']) {
      return generalChannelSnap.data()['members'].includes(userId);
    }
    return false;
  }
}
