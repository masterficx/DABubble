import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-dialog-add-user-new-channel',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './dialog-add-user-new-channel.component.html',
  styleUrls: [
    './dialog-add-user-new-channel.component.scss',
    './dialog-add-user-new-channel.component-mediaquery.scss',
  ],
})
export class DialogAddUserNewChannelComponent {
  @Input() isVisibleUser: boolean = false;
  @Input() newChannelId: string;
  @Output() toggleVisibility = new EventEmitter<void>();
  @Output() toggleVisibilityChannel = new EventEmitter<void>();
  @Output() usersToAdd = new EventEmitter<{
    all: boolean;
    userIds?: string[];
  }>();
  @ViewChild('form') form!: NgForm;

  userSelection: string = 'allMembers';
  addedUser: string = 'test';
  allUsers = [];
  filteredUsers = [];
  selectedUsers = [];
  activeChannelMembers: string[] = [];
  inputFocused: boolean = false;
  userInputModel: string = '';

  private firestore: Firestore = inject(Firestore);

  constructor() {
    this.filterUsers();
  }

  ngOnInit() {
    this.initializeData();
  }

  toggle(): void {
    this.toggleVisibility.emit();
  }

  toggleChannel(): void {
    this.toggleVisibilityChannel.emit();
  }

  closeBoth() {
    this.toggle();
    this.toggleChannel();
  }

  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  addUser(): void {
    if (this.userSelection === 'allMembers') {
      this.usersToAdd.emit({ all: true });
    } else if (this.userSelection === 'specificPeople') {
      this.usersToAdd.emit({
        all: false,
        userIds: this.selectedUsers.map((user) => user.id),
      });
    }
    this.closeBoth();
  }

  filterUsers(): void {
    if (!this.userInputModel) {
      this.filteredUsers = [];
    } else {
      this.filteredUsers = this.allUsers
        .filter((user) =>
          user.name.toLowerCase().includes(this.userInputModel.toLowerCase())
        )
        .filter(
          (user) =>
            !this.selectedUsers.some(
              (selectedUser) => selectedUser.id === user.id
            )
        );
    }
  }

  addSelectedUser(user): void {
    if (
      !this.selectedUsers.some((selectedUser) => selectedUser.id === user.id)
    ) {
      this.selectedUsers.push(user);
      this.filteredUsers = [];
      this.userInputModel = '';
    }
  }

  removeUser(userToRemove): void {
    this.selectedUsers = this.selectedUsers.filter(
      (user) => user.id !== userToRemove.id
    );
  }

  shouldDisableSubmit(): boolean {
    return (
      this.userSelection === 'specificPeople' && this.selectedUsers.length === 0
    );
  }

  async initializeData() {
    this.activeChannelMembers = await this.fetchActiveChannelMembers();
    await this.fetchUsers();
  }

  async fetchActiveChannelMembers(): Promise<string[]> {
    const activeChannelId = this.newChannelId;
    if (activeChannelId) {
      const channelRef = doc(this.firestore, 'channels', activeChannelId);
      const channelSnap = await getDoc(channelRef);
      if (channelSnap.exists()) {
        const members = channelSnap.data()['members'];
        if (members) {
          return members;
        }
      }
    }
    return [];
  }

  async fetchUsers() {
    const usersCol = collection(this.firestore, 'users');
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) => !this.activeChannelMembers.includes(user.id));
    this.allUsers = userList;
  }

  onInputFocus(): void {
    this.inputFocused = true;
  }

  onInputBlur(): void {
    this.inputFocused = false;
  }
}
