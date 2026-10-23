import { ApiError } from '../http/api-error';
import { I18n } from '../i18n/i18n.service';

export interface ErrorText {
  message: string;
  /** Lines the backend listed for a 400 (shown under the message). */
  details: string[];
  requestId: string | null;
}

/**
 * What to tell the person about a failed call, in their language. The backend's own message is used for a refusal that
 * explains itself (400, 403, 404, 409: "auction has not started"), the language's text for the technical cases.
 */
export function describeError(error: unknown, i18n: I18n): ErrorText {
  if (!(error instanceof ApiError)) {
    return { message: i18n.t('api.unknown'), details: [], requestId: null };
  }
  const own = error.message && error.message !== error.name ? error.message : null;
  const common = { details: error.errors, requestId: error.requestId };
  switch (true) {
    case error.status === 0:
      return { ...common, message: i18n.t('api.network') };
    case error.status === 401:
      return { ...common, message: i18n.t('api.unauthorized') };
    case error.status === 429:
      return {
        ...common,
        message:
          error.retryAfter !== null
            ? i18n.t('api.tooMany', { seconds: error.retryAfter })
            : i18n.t('api.tooManyNoTime'),
      };
    case error.status >= 500:
      return { ...common, message: i18n.t('api.server') };
    case error.status === 403:
      return { ...common, message: own ?? i18n.t('api.forbidden') };
    case error.status === 404:
      return { ...common, message: own ?? i18n.t('api.notFound') };
    case error.status === 409:
      return { ...common, message: own ?? i18n.t('api.conflict') };
    case error.status === 400:
      return { ...common, message: own ?? i18n.t('api.validation') };
    default:
      return { ...common, message: own ?? i18n.t('api.unknown') };
  }
}
