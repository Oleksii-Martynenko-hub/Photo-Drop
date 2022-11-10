import express from 'express';
import appUserValidator from '../validator/appUserValidator/appUserValidator';
import telegramController from '../controllers/appUserController/telegramController/telegramController';
import stripeController from '../controllers/appUserController/stripeWebhookController/stripeWebhookController';
import userAccountController from '../controllers/appUserController/userAccountController/userAccountController';
import photoController from '../controllers/appUserController/photoController/photoController';
import { checkAuth, checkValidationErrors } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/send-otp', appUserValidator.checkGetOTP(), checkValidationErrors, telegramController.generateOTP);
router.get('/check-otp', appUserValidator.checkOTP(), telegramController.checkOTP);
router.post('/create-app-user', appUserValidator.checkCreateAppUser(), checkValidationErrors, userAccountController.createAppUser);
router.get('/get-me', userAccountController.getMe);
router.post('/presigned-post', checkAuth, appUserValidator.checkGetPresignedUrl(), checkValidationErrors, photoController.signSelfie);
router.get('/get-selfie', checkAuth, appUserValidator.checkGetSelfie(), checkValidationErrors, photoController.getSelfie);
router.post('/get-signed-selfie', checkAuth, appUserValidator.checkPresignedGetSelfie(), checkValidationErrors, photoController.createPresignedGetForSelfie);
router.put('/edit-notification-settings', checkAuth, appUserValidator.checkEditNotificationSettings(), checkValidationErrors, userAccountController.editNotificationSettings);
router.put('/edit-name', checkAuth, appUserValidator.checkEditName(), checkValidationErrors, userAccountController.editName);
router.put('/edit-phone', checkAuth, appUserValidator.checkEditPhone(), checkValidationErrors, userAccountController.editPhone);
router.put('/edit-email', checkAuth, appUserValidator.checkEditEmail(), checkValidationErrors, userAccountController.editEmail);
router.get('/get-albums-with-person', checkAuth, appUserValidator.checkGetAlbumsWithPerson(), checkValidationErrors, photoController.getAlbumsWithPerson);
router.post('/get-albums-thumbnail-icons', checkAuth, appUserValidator.checkGetAlbumThumbnailIcon(), checkValidationErrors, photoController.getAlbumsThumbnailIcon);
router.get('/get-thumbnails-with-person', checkAuth, appUserValidator.checkGetThumbnailsWithPerson(), checkValidationErrors, photoController.getThumbnails);
router.get('/get-original-photo', checkAuth, appUserValidator.checkGetOriginalPhoto(), checkValidationErrors, photoController.getOriginalPhoto);
router.get('/generate-payment', checkAuth, appUserValidator.checkGeneratePayment(), checkValidationErrors, photoController.generatePayment);
router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.webhook);
export default router;
