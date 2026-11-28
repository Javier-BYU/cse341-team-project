
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
        description: 'API for scenic train trips and bookings.',
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Local development server',
        },
    ],
    components: {
        securitySchemes: {
            sessionCookie: {
                type: 'apiKey',
                in: 'cookie',
                name: 'connect.sid'
            },
            csrfToken: {
                type: 'apiKey',
                in: 'header',
                name: 'X-CSRF-Token'
            }
        },
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
                    'operatingMonths',
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
                        items: { type: 'string' },
                    },
                    bestSeason: { type: 'string', example: 'Spring and autumn' },
                    operatingMonths: {
                        type: 'array',
                        items: { type: 'integer' },
                        example: [4, 5, 6, 9, 10, 11],
                    },
                    imageUrl: { type: 'string', format: 'uri' },
                },
            },

            Schedule: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    tripId: { type: 'string' },
                    departureTime: { type: 'string' },
                    arrivalTime: { type: 'string' },
                    daysOfWeek: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    months: {
                        type: 'array',
                        items: { type: 'integer', minimum: 1, maximum: 12 },
                    },
                    status: { type: 'boolean' },
                },
            },

            Passenger: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'firstName',
                    'lastName',
                    'email',
                    'phone',
                ],
                properties: {
                    firstName: {
                        type: 'string',
                        example: 'John',
                    },
                    lastName: {
                        type: 'string',
                        example: 'Smith',
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'john@example.com',
                    },
                    phone: {
                        type: 'string',
                        example: '+819012345678',
                    },
                },
            },

            TicketClass: {
                type: 'object',
                required: [
                    'class',
                    'name',
                    'pricePerKm',
                    'availableDays',
                    'amenities',
                    'description',
                ],
                properties: {
                    class: { type: 'string', example: 'standard' },
                    name: { type: 'string', example: 'Standard Class' },
                    pricePerKm: { type: 'number', example: 80 },
                    availableDays: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['monday', 'tuesday', 'sunday'],
                    },
                    amenities: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    description: { type: 'string' },
                },
            },

            CreateBooking: {
                type: 'object',
                required: [
                    'scheduleId',
                    'tripId',
                    'ticketClass',
                    'selectedDay',
                    'passengers',
                ],
                properties: {
                    scheduleId: {
                        type: 'integer',
                        example: 1,
                        description: 'ID of the selected train schedule.',
                    },
                    tripId: {
                        type: 'string',
                        example: 'alpine-panorama',
                        description: 'ID of the selected scenic trip.',
                    },
                    ticketClass: {
                        type: 'string',
                        example: 'first',
                    },
                    selectedDay: {
                        type: 'string',
                        example: 'Monday',
                    },
                    passengers: {
                        type: 'array',
                        minItems: 1,
                        maxItems: 8,
                        items: {
                            $ref: '#/components/schemas/Passenger',
                        },
                    },
                },
            },

            Booking: {
                type: 'object',
                required: [
                    'id',
                    'scheduleId',
                    'tripId',
                    'ticketClass',
                    'selectedDay',
                    'passengers',
                ],
                properties: {
                    id: {
                        type: 'string',
                        example: 'JRABC12345',
                    },
                    scheduleId: {
                        type: 'integer',
                        example: 1,
                    },
                    tripId: {
                        type: 'string',
                        example: 'alpine-panorama',
                    },
                    ticketClass: {
                        type: 'string',
                        example: 'first',
                    },
                    selectedDay: {
                        type: 'string',
                        example: 'Monday',
                    },
                    passengers: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/Passenger',
                        },
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },

            UpdateBooking: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'scheduleId',
                    'tripId',
                    'ticketClass',
                    'selectedDay',
                    'passengers',
                ],
                properties: {
                    scheduleId: {
                        type: 'integer',
                        minimum: 1,
                        example: 1,
                    },
                    tripId: {
                        type: 'string',
                        example: 'alpine-panorama',
                    },
                    ticketClass: {
                        type: 'string',
                        example: 'first',
                    },
                    selectedDay: {
                        type: 'string',
                        example: 'Monday',
                    },
                    passengers: {
                        type: 'array',
                        minItems: 1,
                        maxItems: 8,
                        items: {
                            $ref: '#/components/schemas/Passenger',
                        },
                    },
                },
            },

            Error: {
                type: 'object',
                properties: {
                    error: {
                        type: 'string',
                        example: 'Trip not found',
                    },
                },
            },
        },
    },
};

const swaggerOptions = {
    definition: swaggerDefinition,
    apis: [Path.join(__dirname, '../routes/*.js').replaceAll('\\', '/')],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
