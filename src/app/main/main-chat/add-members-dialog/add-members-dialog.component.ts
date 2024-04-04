import { Component, EventEmitter, Output, OnInit, Input, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import {Firestore, collection, onSnapshot,  query, doc, updateDoc} from '@angular/fire/firestore';


@Component({
  selector: 'app-add-members-dialog',
  standalone: true,
  imports: [ MatIconModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatChipsModule, MatAutocompleteModule, CommonModule ],
  templateUrl: './add-members-dialog.component.html',
  styleUrl: './add-members-dialog.component.scss'
})

export class AddMembersDialogComponent implements OnInit {
  private firestore: Firestore = inject(Firestore);
  @Input() channelData!: any;
  @Input() currentChannelId: string;
  @Output() addMemberDialogOpenChild = new EventEmitter();
  addMemberDialogOpen: boolean;
  inputFocus: boolean = false;
  searchText: string = '';
  newUsersToAdd = [];
  userList = [];
  originalUserList: any;
  filteredUserList: any;
  @Input() addMembersMobileView!: boolean;

  constructor() { }

  ngOnInit(): void {
    this.getUsersToAdd();
  }

  /**
   * Checks if a user is a member of the current channel. If that is not the case, the user is beeing pushed in the userList 
   * array, containing user name, user id, online status and the url of the profile img. 
   * 
   * @returns 
   */
  getUsersToAdd() {
    const q = query(collection(this.firestore, 'users'));
    return onSnapshot(q, (list) => {
      list.forEach(element => {
        if(!this.channelData.members.includes(element.id)) {
            this.userList.push({
              'userName': element.data()['name'],
              'userId': element.id,
              'isOnline': element.data()['isOnline'],
              'imgUrl': element.data()['imgUrl']
            });
        }
      });
      this.filteredUserList = this.userList;
      this.originalUserList = this.userList;
    });  
  }

  /**
   * Sets the searchText variable to the input value und triggers the search() function every time the user enters a character
   * or number.
   * @param data - Value/text of the input filed
   */
  searchKey(data:string) {
    this.searchText = data;
    this.search();
  }

  /**
   * Depending on the search input, the function returns the users that are not yet members of the channel in a list.
   * 
   */
  search() {
    this.filteredUserList = this.userList;

    if(this.searchText !== "") {
        this.filteredUserList =  this.userList.filter( user =>  {
          return user.userName.toLowerCase().includes(this.searchText.toLowerCase());
        });
      } else {
      this.filteredUserList = this.originalUserList;      
    }
  }

  /**
   * With clicking on a returned user, it can be added to a pool (seperate array). A new user object is added in the 
   * input field.
   * @param filteredUser - Array with all the filtered according to the search input
   */
  addUser(filteredUser: any) {
    let existingUser = this.userList.find(user => user.userId == filteredUser.userId);
    let indexOfAddedUser = this.userList.indexOf(existingUser);
    this.newUsersToAdd.push(filteredUser);        // Push user in newUsersToAdd array.
    this.userList.splice(indexOfAddedUser, 1);    // Splice userList array and remove user
    this.filteredUserList = this.userList;
    this.inputFocus = false; 
  }

  /**
   * With a click an the x symbol, the user that has been added to the pool is beeing removed from it and the array updated.
   * @param userToAdd - user id of the user in the pool array
   * @param i - index of the user in the pool array
   */
  removeAddedUser(userToAdd: any, i: number) {
      this.filteredUserList = this.userList;
      this.userList.push(userToAdd);            // Push to user List array
      this.newUsersToAdd.splice(i, 1);          // Splice newUsersToAdd array and remove user
      this.filteredUserList = this.userList;
      this.originalUserList = this.userList;
      this.inputFocus = false;
  }

  /**
   * Adds all the user ids, that have been added to the pool to the members array of the current channel in firebase.
   * It also checks if the user allready exists in the members array. 
   * After the users have been added, the pool array is beeing emptyed and the dialog closed.
   */
  async addUsers() {
    for (let i = 0; i < this.newUsersToAdd.length; i++) {
      const user = this.newUsersToAdd[i]['userId'];
      if(!this.channelData.members.includes(user)) {
        this.channelData.members.push(user);
      }
    }
    let currentChannelRef = doc(this.firestore, 'channels', this.currentChannelId);
    let data = {members: this.channelData.members };
    await updateDoc(currentChannelRef, data).then(() => {
    });
    this.newUsersToAdd = [];
    this.closeDialog();
  }

  /**
   * Hides/closes the add member component and sets the input focus to false.  
   */
  closeDialog() {
    this.addMemberDialogOpen = false;
    this.addMemberDialogOpenChild.emit(this.addMemberDialogOpen);
    this.inputFocus = false;
  }

  /**
   * Shows the list of users that are no channel members if the input is focused.
   */
  showUserList() {
    this.inputFocus = true;
  }

  /**
   * Closes the list of users that are no channel members if the input is not focused.
   */
  closeUserList() {
    this.inputFocus = false;
  }

  /**
   * Prevens an unwanted triggering of a function by clicking on an element.
   * @param $event 
   */
  doNotClose($event: any) {
    $event.stopPropagation(); 
  }
}

