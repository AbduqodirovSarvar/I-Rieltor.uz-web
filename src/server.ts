import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';
import { BASIC_HEADERS, contentSecurityPolicy, isHashedAsset } from './security-headers';
import { cacheControlFor, loadSitemapEntries, robotsTxt, sitemapXml } from './seo-files';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set(BASIC_HEADERS);
  next();
});

const apiInternalUrl = (process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:8080').replace(
  /\/$/,
  '',
);

/** For the container health check and uptime monitors: the process is up and can answer. */
app.get('/healthz', (_req, res) => {
  res.type('text/plain').set('Cache-Control', 'no-store').send('ok');
});

app.get('/robots.txt', (_req, res) => {
  res
    .type('text/plain')
    .set('Cache-Control', 'public, max-age=3600')
    .send(robotsTxt(environment.siteUrl));
});

/** The sitemap lists every object and auction, so it is built from the API and kept for ten minutes. */
let sitemap: { xml: string; builtAt: number } | null = null;
app.get('/sitemap.xml', async (_req, res) => {
  try {
    if (!sitemap || Date.now() - sitemap.builtAt > 10 * 60_000) {
      const entries = await loadSitemapEntries(apiInternalUrl, async (url) => {
        const answer = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!answer.ok) throw new Error(`API answered ${answer.status}`);
        return answer.json();
      });
      sitemap = { xml: sitemapXml(environment.siteUrl, entries), builtAt: Date.now() };
    }
    res.type('application/xml').set('Cache-Control', 'public, max-age=600').send(sitemap.xml);
  } catch (error) {
    console.error('sitemap failed:', error instanceof Error ? error.message : error);
    // An old copy is better than none; with nothing to show, ask the crawler to come back later.
    if (sitemap) res.type('application/xml').send(sitemap.xml);
    else res.status(503).set('Retry-After', '300').send('Sitemap is not ready');
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    // Hashed bundles never change; the favicon and share picture keep their names, so they are re-checked daily.
    setHeaders: (res, path) =>
      res.setHeader(
        'Cache-Control',
        isHashedAsset(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=86400',
      ),
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(async (response) =>
      response ? writeResponseToNodeResponse(await finishResponse(response, req.url), res) : next(),
    )
    .catch(next);
});

/**
 * A page that could not be rendered: one JSON line on the log (what, which address; no headers, no cookies, no query string:
 * they may carry a token) and a short answer that is never cached. `docker compose logs web` shows it.
 */
app.use(
  (error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    console.error(
      JSON.stringify({
        level: 'error',
        time: new Date().toISOString(),
        path: req.path,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split(/\r?\n/).slice(0, 6) : undefined,
      }),
    );
    res.status(500).set('Cache-Control', 'no-store').type('text/plain').send('Server error');
  },
);

/** Public pages may be shared briefly by a cache; personal pages and errors never. Pages also get their security policy. */
async function finishResponse(response: Response, path: string): Promise<Response> {
  const headers = new Headers(response.headers);
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', response.status === 200 ? cacheControlFor(path) : 'no-store');
  }
  let body: BodyInit | null = response.body;
  if ((headers.get('Content-Type') ?? '').includes('text/html')) {
    const html = await response.text();
    headers.set(
      'Content-Security-Policy',
      contentSecurityPolicy(html, process.env['CSP_IMAGE_HOSTS']),
    );
    headers.delete('Content-Length');
    body = html;
  }
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
