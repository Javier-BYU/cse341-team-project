import Path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kizuna Rail API',
      version: '1.0.0',
    },
  },
  apis: [Path.join(__dirname, '..', 'routes', 'api-routes.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
