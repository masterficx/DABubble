import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { TextBoxComponent } from './text-box/text-box.component';
import { Subscription } from 'rxjs';
import { UserManagementService } from '../../services/user-management.service';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { ViewManagementService } from '../../services/view-management.service';

@Component({
  selector: 'app-new-message',
  standalone: true,
  imports: [TextBoxComponent, CommonModule],
  templateUrl: './new-message.component.html',
  styleUrls: [
    './new-message.component.scss',
    './new-message.component-mediaquery.scss',
  ],
})
export class NewMessageComponent {
  filteredUsers: any = [];
  allUsers: any = [];
  selectedUser = null;
  filteredChannel: any = [];
  allChannel: any = [];
  selectedChannel = null;
  displayUser: boolean = false;
  displayChannels: boolean = false;
  messageType;
  targetId;
  placeholderText: string;

  @ViewChild('userInput') userInput: ElementRef<HTMLInputElement>;
  private firestore: Firestore = inject(Firestore);
  private userSubscription!: Subscription;
  private channelSubscription!: Subscription;
  private screenSizeSubscription: Subscription;

  constructor(
    public userManagementService: UserManagementService,
    private viewManagementService: ViewManagementService
  ) {}

  ngOnInit(): void {
    this.subscribeToUsers();
    this.subscribeToChannels();
    this.userManagementService.loadUsers();
    this.subscribeToScreenSizeChanges();
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

  subscribeToScreenSizeChanges(): void {
    this.screenSizeSubscription =
      this.viewManagementService.screenSize$.subscribe((size) => {
        this.adjustPlaceholderText(size);
      });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
    this.channelSubscription.unsubscribe();
    this.screenSizeSubscription.unsubscribe();
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

  onInputChange(inputValue: string): void {
    this.displayUser = inputValue.startsWith('@');
    this.displayChannels = inputValue.startsWith('#');
    this.selectedChannel = null;
    this.selectedUser = null;
    this.messageType = null;
    this.targetId = null;

    const searchTerm = inputValue.slice(1).toLowerCase();

    if (this.displayUser) {
      this.handleUserSearch(searchTerm);
    } else if (this.displayChannels) {
      this.handleChannelSearch(searchTerm);
    } else if (inputValue.includes('@') && inputValue.includes('.')) {
      this.handleEmailSearch(inputValue);
    } else {
      this.resetFilters();
    }
  }

  handleUserSearch(searchTerm: string): void {
    this.filteredUsers = this.allUsers.filter((user) =>
      user.name.toLowerCase().startsWith(searchTerm)
    );
  }

  handleChannelSearch(searchTerm: string): void {
    this.filteredChannel = this.allChannel.filter((channel) =>
      channel.name.toLowerCase().startsWith(searchTerm)
    );
  }

  handleEmailSearch(email: string): void {
    const foundUser = this.allUsers.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    if (foundUser) {
      this.sendUserMessage(foundUser.id, foundUser.name);
    } else {
      this.filteredUsers = [];
    }
  }

  resetFilters(): void {
    this.filteredUsers = [];
    this.filteredChannel = [];
  }

  sendChannelMessage(channelId, channelName) {
    this.selectedChannel = channelId;
    this.userInput.nativeElement.value = '#' + channelName;
    this.displayChannels = false;
    this.messageType = 'channel';
    this.targetId = channelId;
  }

  sendUserMessage(userId, userName) {
    this.selectedUser = userId;
    this.userInput.nativeElement.value = '@' + userName;
    this.displayUser = false;
    this.messageType = 'direct';
    this.targetId = userId;
  }

  adjustPlaceholderText(screenSize: string) {
    if (screenSize === 'extraSmall') {
      this.placeholderText = 'An: #channel, oder @jemand';
    } else if (screenSize === 'small') {
      this.placeholderText = 'An: #channel, @jemanden oder E-Mail';
    } else {
      this.placeholderText = 'An: #channel, oder @jemanden oder E-Mail Adresse'; // Standardplatzhalter, falls benötigt
    }
  }
}
