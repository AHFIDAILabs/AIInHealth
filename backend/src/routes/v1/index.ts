import { Router } from 'express';
import authRoutes from './auth.routes.js';
import registrationRoutes from './registration.routes.js';
import adminRoutes from './admin.routes.js';
import speakerRoutes from './speaker.routes.js';
import sessionRoutes from './session.routes.js';
import partnerRoutes from './partner.routes.js';
import inquiryRoutes from './inquiry.routes.js';
import contactRoutes from './contact.routes.js';
import innovationRoutes from './innovation.routes.js';
import paymentRoutes from './payment.routes.js';
import delegateRoutes from './delegate.routes.js';
import abstractRoutes from './abstract.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/registrations', registrationRoutes);
router.use('/admin', adminRoutes);
router.use('/speakers', speakerRoutes);
router.use('/sessions', sessionRoutes);
router.use('/partners', partnerRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/contact', contactRoutes);
router.use('/innovations', innovationRoutes);
router.use('/payments', paymentRoutes);
router.use('/delegate', delegateRoutes);
router.use('/abstracts', abstractRoutes);

export default router;
