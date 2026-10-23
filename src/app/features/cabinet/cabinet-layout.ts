import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { EmailBanner } from './email-banner';

interface Section {
  path: string;
  text: TextKey;
}

/** The frame of the cabinet: who is signed in, the sections, a note about the unconfirmed e-mail, and the section itself. */
@Component({
  selector: 'app-cabinet-layout',
  imports: [EmailBanner, RouterLink, RouterLinkActive, RouterOutlet, TPipe, LinkPipe],
  templateUrl: './cabinet-layout.html',
  styleUrl: './cabinet-layout.scss',
})
export class CabinetLayout {
  protected readonly auth = inject(AuthService);

  protected readonly sections: Section[] = [
    { path: '/kabinet/profil', text: 'cabinet.profile' },
    { path: '/kabinet/hujjatlar', text: 'cabinet.documents' },
    { path: '/kabinet/xavfsizlik', text: 'cabinet.security' },
  ];
}
