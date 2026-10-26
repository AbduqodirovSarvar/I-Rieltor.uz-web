import type { uzEimzo } from './uz-eimzo';

/** Texts of signing with E-IMZO, English. */
export const enEimzo: Record<keyof typeof uzEimzo, string> = {
  'cabinet.eimzo': 'E-IMZO',
  'eimzo.title': 'E-IMZO key',
  'eimzo.key': 'Select a key',
  'eimzo.loading': 'Looking for E-IMZO keys…',
  'eimzo.retry': 'Search again',
  'eimzo.until': 'valid until {date}',
  'eimzo.fake':
    'Test mode: a fake signature is used instead of E-IMZO. This will not happen on the live site.',
  'eimzo.err.library-missing':
    'E-IMZO is not connected to this site yet. Please try again later or contact us.',
  'eimzo.err.not-installed':
    'The E-IMZO application was not found on your computer. Install and launch it, then click “Search again”.',
  'eimzo.err.no-keys':
    'No E-IMZO key was found on your computer. Connect a key file or an ID card and search again.',
  'eimzo.err.cancelled': 'Signing was cancelled.',
  'eimzo.err.bad-password': 'The key password is incorrect.',
  'eimzo.err.failed': 'Could not sign with E-IMZO. Please try again.',
  'eimzo.err.pickKey': 'Select a key first.',

  'eimzo.signIn.title': 'Sign in with E-IMZO',
  'eimzo.signIn.intro': 'No password needed: you sign in by signing with your key.',
  'eimzo.signIn.submit': 'Sign in with E-IMZO',
  'eimzo.signIn.signUp': 'Sign up with E-IMZO',
  'eimzo.signIn.notRegistered':
    'No account was found for this key. To create a new account, click “Sign up with E-IMZO”.',
  'eimzo.signIn.taken': 'An account with this key already exists. Click “Sign in with E-IMZO”.',
  'eimzo.signUp.done': 'Account created. You are signed in with an account verified via E-IMZO.',

  'eimzo.link.title': 'Link E-IMZO',
  'eimzo.link.intro':
    'To take part in auctions, your account must be verified with an E-IMZO key. Your name and identifier (PINFL or INN) are taken from the key.',
  'eimzo.link.submit': 'Link key',
  'eimzo.link.done': 'E-IMZO linked. Your account is verified.',
  'eimzo.link.taken': 'This key is already linked to another account.',
  'eimzo.link.status': 'Status',
  'eimzo.link.verifiedAs': 'Verified: {name}',
  'eimzo.link.identifier': 'Identifier',
  'eimzo.link.back': 'Back to the auction',

  'eimzo.reset.title': 'Recover via E-IMZO',
  'eimzo.reset.intro':
    'For an account with E-IMZO linked, you can reset the password by signing with your key (no email needed).',
  'eimzo.reset.submit': 'Sign and reset password',
  'eimzo.reset.notRegistered': 'No account was found for this key.',
  'eimzo.reset.done': 'Password changed. Sign in with your new password.',

  'apply.title': 'Auction application',
  'apply.intro':
    'Read the application text. You confirm your consent by signing with your E-IMZO key; the signature is legally binding.',
  'apply.text': 'Application text',
  'apply.deadline': 'Application deadline: {date}',
  'apply.agree': 'I have read the text and agree',
  'apply.mustAgree': 'Check the box to agree to the text before continuing.',
  'apply.submit': 'Sign and apply',
  'apply.done': 'Application submitted. A staff member will review it.',
  'apply.verify': 'Link E-IMZO first to apply.',
  'apply.toVerify': 'Link E-IMZO',
  'apply.back': 'Back to the auction page',
  'apply.err.conflict': 'You have already applied to this auction, or the deadline has passed.',
  'apply.err.forbidden':
    'The signature belongs to another person: the application must be signed with the key linked to your account.',
  'apply.err.textChanged': 'The application text has changed. Refresh the page and try again.',
};
