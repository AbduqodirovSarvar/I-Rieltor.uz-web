import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Confirm } from './confirm.service';

/** The question of {@link Confirm}, in a native modal `<dialog>`: focus is trapped and Escape means "no" without our code. */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  protected readonly confirm = inject(Confirm);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (!element) return;
      if (this.confirm.pending()) {
        if (!element.open) element.showModal?.();
      } else if (element.open) {
        element.close?.();
      }
    });
  }

  /** Escape closes a native dialog by itself: that is an answer of "no". */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.confirm.answer(false);
  }
}
