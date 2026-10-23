import { Component, inject } from '@angular/core';
import { TPipe } from '../i18n/t.pipe';
import { Notify } from './notify.service';

/** The place messages appear. A polite live region: a screen reader reads each new message without taking focus. */
@Component({
  selector: 'app-toasts',
  imports: [TPipe],
  templateUrl: './toasts.html',
  styleUrl: './toasts.scss',
})
export class Toasts {
  protected readonly notify = inject(Notify);
}
