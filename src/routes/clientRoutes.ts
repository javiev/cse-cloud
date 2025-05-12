import { Hono } from 'hono';
import { ClientService } from '../services/clientService';
import { CloudflareBindings } from '../types';
import { authMiddleware, clientIdMatchMiddleware } from '../middleware/auth';

// Crear instancia de Hono para las rutas de clientes
const clientRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// Aplicar middleware de autenticación a todas las rutas
clientRoutes.use('*', authMiddleware);

// Ruta para obtener datos del cliente
clientRoutes.get('/:clientId/data/:type/:id?', clientIdMatchMiddleware, async (c) => {
  try {
    // Extraer los parámetros
    const clientId = c.req.param('clientId');
    const type = c.req.param('type');
    const id = c.req.param('id');
    
    // Obtener el client_id y rol del JWT que ya extrajimos en el middleware
    const { client_id, rol } = c.get('user');
    
    // Crear instancia del servicio
    const clientService = new ClientService(c.env);
    
    // Obtener los datos
    const data = await clientService.getData(client_id, type, id);
    
    // Devolver los datos
    return c.json({ data });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    return c.json({ error: 'Error al obtener datos' }, 500);
  }
});

// Ruta para almacenar datos del cliente
clientRoutes.post('/:clientId/data/:type/:id?', clientIdMatchMiddleware, async (c) => {
  try {
    // Extraer los parámetros
    const clientId = c.req.param('clientId');
    const type = c.req.param('type');
    const id = c.req.param('id');
    
    // Obtener el client_id y rol del JWT
    const { client_id, rol } = c.get('user');
    
    // Obtener los datos del cuerpo de la solicitud
    const data = await c.req.json();
    
    // Crear instancia del servicio
    const clientService = new ClientService(c.env);
    
    // Almacenar los datos
    const result = await clientService.storeData(client_id, type, data, id);
    
    // Devolver el resultado
    return c.json({ result });
  } catch (error) {
    console.error('Error al almacenar datos:', error);
    return c.json({ error: 'Error al almacenar datos' }, 500);
  }
});

// Ruta para procesar una acción específica basada en el rol
clientRoutes.post('/:clientId/action/:action', clientIdMatchMiddleware, async (c) => {
  try {
    // Extraer los parámetros
    const clientId = c.req.param('clientId');
    const action = c.req.param('action');
    
    // Obtener el client_id y rol del JWT
    const { client_id, rol } = c.get('user');
    
    // Obtener los datos del cuerpo de la solicitud
    const data = await c.req.json();
    
    // Crear instancia del servicio
    const clientService = new ClientService(c.env);
    
    // Procesar la acción basada en el rol
    const result = await clientService.processAction(client_id, rol, action, data);
    
    // Devolver el resultado
    return c.json({ result });
  } catch (error) {
    console.error('Error al procesar acción:', error);
    return c.json({ error: 'Error al procesar acción' }, 500);
  }
});

export default clientRoutes;
