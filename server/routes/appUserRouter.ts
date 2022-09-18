import express from 'express';
import telegramController from '../controllers/appUserController/telegramController/telegramController';
import stripeController from '../controllers/appUserController/stripeWebhookController/stripeWebhookController';
import appUserController from '../controllers/appUserController';
import checkAuth from '../middleware/authMiddleware';

const router = express.Router();

router.post('/send-otp', telegramController.generateOTP);
router.post('/create-app-user', appUserController.createAppUser);
router.post('/presigned-post', checkAuth, appUserController.signSelfie);
router.get('/get-selfie', checkAuth, appUserController.getSelfie);
router.post('/get-signed-selfie', checkAuth, appUserController.createPresignedGetForSelfie);
router.put('/edit-notification-settings', checkAuth, appUserController.editNotificationSettings);
router.put('/edit-name', checkAuth, appUserController.editName);
router.put('/edit-phone', checkAuth, appUserController.editPhone);
router.put('/edit-email', checkAuth, appUserController.editEmail);
router.get('/get-albums-with-person', checkAuth, appUserController.getAlbumsWithPerson);
router.get('/get-thumbnails-with-person', checkAuth, appUserController.getThumbnails);
router.get('/get-original-photo', checkAuth, appUserController.getOriginalPhoto);
router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.webhook);
export default router;
