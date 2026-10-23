import { Component } from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';

interface Step {
  title: TextKey;
  text: TextKey;
}

/** The four steps from a visit to a bid, and the usual questions. Static text; the search engine reads it too. */
@Component({
  selector: 'app-how-to-join',
  imports: [TPipe],
  templateUrl: './how-to-join.html',
  styleUrl: './how-to-join.scss',
})
export class HowToJoin {
  protected readonly steps: Step[] = [
    { title: 'how.1.title', text: 'how.1.text' },
    { title: 'how.2.title', text: 'how.2.text' },
    { title: 'how.3.title', text: 'how.3.text' },
    { title: 'how.4.title', text: 'how.4.text' },
  ];

  protected readonly questions: { q: TextKey; a: TextKey }[] = [
    { q: 'faq.1.q', a: 'faq.1.a' },
    { q: 'faq.2.q', a: 'faq.2.a' },
    { q: 'faq.3.q', a: 'faq.3.a' },
    { q: 'faq.4.q', a: 'faq.4.a' },
    { q: 'faq.5.q', a: 'faq.5.a' },
  ];
}
