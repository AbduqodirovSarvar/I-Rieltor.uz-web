import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '../http/api-error';
import { I18n } from '../i18n/i18n.service';
import { describeError } from './api-error-text';
import { Confirm } from './confirm.service';
import { GlobalErrorHandler } from './global-error-handler';
import { Notify } from './notify.service';

describe('describeError', () => {
  let i18n: I18n;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    i18n = TestBed.inject(I18n);
  });

  it('uses the language text for technical failures and keeps the request id', () => {
    expect(describeError(new ApiError(0, 'x'), i18n).message).toBe(i18n.t('api.network'));
    expect(describeError(new ApiError(500, 'boom', [], null, 'r1'), i18n)).toMatchObject({
      message: i18n.t('api.server'),
      requestId: 'r1',
    });
    expect(describeError(new ApiError(401, 'x'), i18n).message).toBe(i18n.t('api.unauthorized'));
  });

  it('says how long to wait after a 429', () => {
    expect(describeError(new ApiError(429, 'x', [], 12), i18n).message).toContain('12');
    expect(describeError(new ApiError(429, 'x'), i18n).message).toBe(i18n.t('api.tooManyNoTime'));
  });

  it('shows the backend message when a refusal explains itself, with the field lines', () => {
    const error = new ApiError(409, 'Auction has not started', ['Amount: too low']);
    const text = describeError(error, i18n);
    expect(text.message).toBe('Auction has not started');
    expect(text.details).toEqual(['Amount: too low']);
  });

  it('does not leak the text of an unknown error', () => {
    expect(describeError(new Error('secret stack'), i18n).message).toBe(i18n.t('api.unknown'));
  });
});

describe('Notify', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('shows a message once, keeps the last few, and can close them', () => {
    const notify = TestBed.inject(Notify);
    notify.success('Saved');
    notify.success('Saved');
    expect(notify.toasts().length).toBe(1);
    for (const n of [1, 2, 3, 4, 5]) notify.info(`m${n}`);
    expect(notify.toasts().length).toBe(4);
    notify.dismiss(notify.toasts()[0].id);
    expect(notify.toasts().length).toBe(3);
  });

  it('fades a message by itself', () => {
    vi.useFakeTimers();
    try {
      const notify = TestBed.inject(Notify);
      notify.info('Hello');
      vi.advanceTimersByTime(7000);
      expect(notify.toasts().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ErrorHandler, useClass: GlobalErrorHandler }],
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows a failed call with its request id', () => {
    TestBed.inject(ErrorHandler).handleError(new ApiError(500, 'boom', [], null, 'req-42'));
    expect(TestBed.inject(Notify).toasts()[0].requestId).toBe('req-42');
  });

  it('stays quiet about a 401 (the session handles it)', () => {
    TestBed.inject(ErrorHandler).handleError(new ApiError(401, 'Unauthorized'));
    expect(TestBed.inject(Notify).toasts().length).toBe(0);
  });

  it('logs other errors for the developer and shows a plain message', () => {
    TestBed.inject(ErrorHandler).handleError(new Error('bug'));
    expect(console.error).toHaveBeenCalled();
    expect(TestBed.inject(Notify).toasts()[0].message).toBe(TestBed.inject(I18n).t('api.unknown'));
  });
});

describe('Confirm', () => {
  const question = { title: 'Sure?', confirmLabel: 'Yes', cancelLabel: 'No' };

  it('resolves with the answer', async () => {
    const confirm = TestBed.inject(Confirm);
    const yes = confirm.ask(question);
    expect(confirm.pending()?.request.title).toBe('Sure?');
    confirm.answer(true);
    expect(await yes).toBe(true);
    expect(confirm.pending()).toBeNull();
  });

  it('a new question answers the open one with "no"', async () => {
    const confirm = TestBed.inject(Confirm);
    const first = confirm.ask(question);
    const second = confirm.ask({ ...question, danger: true });
    expect(await first).toBe(false);
    confirm.answer(true);
    expect(await second).toBe(true);
  });
});
