import { FormControl } from '@angular/forms';

export interface PassForm {
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}