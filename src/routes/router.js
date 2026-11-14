import apiRoutes from './api-routes.js';
import ejsRoutes from './ejs-routes.js';
import { trainsApi, trainsPage } from './trains.js';
import { Router } from 'express';
import apiRoutes from './api-routes.js';
import { homePage, aboutPage, testErrorPage } from './index.js';

const router = Router();

// Home page
router.get('/', homePage);

// About page
router.get('/about', aboutPage);

// Trains page
router.get('/trains', trainsPage);

router.use('/api', apiRoutes);
router.get('/api/trains', trainsApi);
<<<<<<< HEAD

// API routes
router.use('/api', apiRoutes);

// Rail trips
router.use('/trips', railTripsRouter);
=======
router.use('/', ejsRoutes);
>>>>>>> main

// Test 500 error page
router.get('/500', testErrorPage);

export default router;