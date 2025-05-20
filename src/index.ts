import { Hono, Context } from 'hono';
import { cors } from '@hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import openapi from './openapi.json';
import { CloudflareBindings } from './types';
import { authMiddleware, clientIdMatchMiddleware } from './middleware/auth';
import { errorMiddleware } from './middleware/error';
import {
  getCSEForm,
  updateCSEStep,
  submitToInternalReview,
  approveInternalReview,
  requestInternalCorrections,
  approveAuthorityReview,
  requestAuthorityCorrections
} from './handlers/cse';
import {
  listPendingAuthorityReviews,
  getFormDetails
} from './handlers/authority';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use('*', errorMiddleware);
app.get('/', (c: Context<{ Bindings: CloudflareBindings }>) => {
  return c.json({
    name: 'CSE API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    status: 'ok',
  });
});
app.use('/cse/*', authMiddleware);
app.use('/api/authority/*', authMiddleware);
app.get('/cse/:clientId', clientIdMatchMiddleware, getCSEForm);
app.post('/cse/:clientId/steps/:stepId', clientIdMatchMiddleware, updateCSEStep);
app.post('/cse/:clientId/submit', clientIdMatchMiddleware, submitToInternalReview);
app.post('/cse/:clientId/internal-review/approve', clientIdMatchMiddleware, approveInternalReview);
app.post('/cse/:clientId/internal-review/request-corrections', clientIdMatchMiddleware, requestInternalCorrections);
app.post('/cse/:clientId/authority-review/approve', clientIdMatchMiddleware, approveAuthorityReview);
app.post('/cse/:clientId/authority-review/request-corrections', clientIdMatchMiddleware, requestAuthorityCorrections);
app.get('/api/authority/pending-forms', listPendingAuthorityReviews);
app.get('/api/authority/forms/:clientId', getFormDetails);
app.get('/docs/openapi.json', (c: Context<{ Bindings: CloudflareBindings }>) => c.json(openapi));
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));

// ──────────────── RUTAS DE NEGOCIO ────────────────
// Las rutas CSE ya están definidas más arriba, no es necesario duplicarlas
app.post('/cse/:clientId/authority-review/approve', clientIdMatchMiddleware, approveAuthorityReview);
app.post('/cse/:clientId/authority-review/request-corrections', clientIdMatchMiddleware, requestAuthorityCorrections);
// Autoridad
app.get('/api/authority/pending-forms', listPendingAuthorityReviews);
app.get('/api/authority/forms/:clientId', getFormDetails);


// ──────────────── EXPORTS ────────────────
export { CSEDurableObject } from './durable-objects/cse-durable-object';
export { CSEIndexDurableObject } from './durable-objects/cse-index-durable-object';

export default {
  fetch: app.fetch,
};
