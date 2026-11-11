import Path from 'path';
import { fileURLToPath } from 'url';
import swaggerJSDoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Kizuna Rail API',
        version: '1.0.0',
        description: 'API for scenic train trips.'
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Local development server'
        }
    ],
    components: {
        schemas: {
            Trip: {
                type: 'object',
                required: [
                    'id',
                    'name',
                    'description',
                    'region',
                    'startStation',
                    'endStation',
                    'duration',
                    'distance',
                    'highlights',
                    'bestSeason',
                    'operatingMonths'
                ],
                properties: {
                    id: { type: 'string', example: 'alpine-panorama' },
                    name: { type: 'string', example: 'Alpine Panorama Express' },
                    description: { type: 'string' },
                    region: { type: 'string', example: 'Nagano' },
                    startStation: { type: 'string', example: 'Matsumoto' },
                    endStation: { type: 'string', example: 'Hakuba' },
                    duration: { type: 'string', example: '2 hours 30 minutes' },
                    distance: { type: 'number', format: 'float', example: 85.5 },
                    highlights: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    bestSeason: { type: 'string', example: 'Spring and autumn' },
                    operatingMonths: {
                        type: 'array',
                        items: { type: 'integer' },
                        example: [4, 5, 6, 9, 10, 11]
                    },
                    imageUrl: { type: 'string', format: 'uri' }
                }
            },
            Error: {
                type: 'object',
                properties: {
                    error: { type: 'string', example: 'Trip not found' }
                }
            }
        }
    }
};

const swaggerOptions = {
    definition: swaggerDefinition,
    apis: [Path.join(__dirname, '../routes/*.js').replaceAll('\\', '/')]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
