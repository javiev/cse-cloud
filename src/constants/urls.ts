/**
 * Constantes para las URLs internas utilizadas en comunicación entre Durable Objects
 * Estas URLs deben configurarse en el archivo .env o en las variables de entorno
 */

// Función para obtener una variable de entorno con valor por defecto
function getEnv(key: string, defaultValue: string): string {
  // En Cloudflare Workers, las variables de entorno se pasan a través del objeto env
  // Este valor se establecerá desde el archivo .env o desde wrangler.jsonc
  return defaultValue;
}

// Base URLs desde variables de entorno o valores por defecto
const INDEX_BASE_URL = getEnv('INTERNAL_INDEX_BASE_URL', 'https://internal/index');
const FORM_BASE_URL = getEnv('INTERNAL_FORM_BASE_URL', 'https://internal/form');

// Exportar las URLs para uso en la aplicación
export const INTERNAL_URLS = {
  // URLs para el índice global
  INDEX: {
    BASE: INDEX_BASE_URL,
    UPDATE: `${INDEX_BASE_URL}/update-index`,
    FORMS_BY_STATUS: `${INDEX_BASE_URL}/forms/by-status`,
  },
  
  // URLs para los Durable Objects de formularios
  FORM: {
    BASE: FORM_BASE_URL,
    GET_FORM: (clientId: string) => `${FORM_BASE_URL}/${clientId}`,
  }
};
