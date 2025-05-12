import { Hono, Context } from 'hono';
import { CSEDurableObject } from './durable-objects/cse-durable-object';
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

// Crear la aplicación Hono con tipado para Cloudflare Bindings
const app = new Hono<{ Bindings: CloudflareBindings }>();

// Middleware global para manejo de errores
app.use('*', errorMiddleware);

// Ruta de salud/información
app.get('/', (c: Context<{ Bindings: CloudflareBindings }>) => {
  return c.json({
    name: 'CSE API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    status: 'ok'
  });
});

// Middleware de autenticación para rutas protegidas
app.use('/cse/*', authMiddleware);
app.use('/api/authority/*', authMiddleware);

// Rutas de la API CSE
app.get('/cse/:clientId', clientIdMatchMiddleware, getCSEForm);
app.post('/cse/:clientId/steps/:stepId', clientIdMatchMiddleware, updateCSEStep);
app.post('/cse/:clientId/submit', clientIdMatchMiddleware, submitToInternalReview);
app.post('/cse/:clientId/internal-review/approve', clientIdMatchMiddleware, approveInternalReview);
app.post('/cse/:clientId/internal-review/request-corrections', clientIdMatchMiddleware, requestInternalCorrections);
app.post('/cse/:clientId/authority-review/approve', clientIdMatchMiddleware, approveAuthorityReview);
app.post('/cse/:clientId/authority-review/request-corrections', clientIdMatchMiddleware, requestAuthorityCorrections);

// Rutas específicas para autoridad_2
app.get('/api/authority/pending-forms', listPendingAuthorityReviews);
app.get('/api/authority/forms/:clientId', getFormDetails);

// Exportar los Durable Objects directamente (requerido por Cloudflare Workers)
export { CSEDurableObject } from './durable-objects/cse-durable-object';
export { CSEIndexDurableObject } from './durable-objects/cse-index-durable-object';

// Exportar el handler principal de la aplicación
export default {
  fetch: app.fetch
};
