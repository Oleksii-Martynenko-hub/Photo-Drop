import { body, query } from 'express-validator';

class AppUserValidator {
  checkGetOTP() {
    return [
      body('phone').notEmpty().withMessage('The chatId value should not be empty'),
    ];
  }

  checkOTP() {
    return [
      query('phone').notEmpty().withMessage('The phone value should not be empty'),
      query('otp').notEmpty().withMessage('The otp value should not be empty'),

    ];
  }

  checkCreateAppUser() {
    return [
      body('phone').notEmpty().withMessage('The phone value should not be empty'),
      body('countryCode').notEmpty().withMessage('The countryCode value should not be empty'),
      body('phone').custom((value) => {
        if (value.includes('+')) {
          throw new Error('Phone number should not include +');
        }
        return true;
      }),
    ];
  }

  checkGetPresignedUrl() {
    return [
      body('name').notEmpty().withMessage('The name value should not be empty'),
      body('userId').notEmpty().withMessage('The userId value should not be empty'),
    ];
  }

  checkGetSelfie() {
    return [
      query('appUserId').notEmpty().withMessage('The appUserId value should not be empty'),
    ];
  }

  checkPresignedGetSelfie() {
    return [
      body('selfieKey').notEmpty().withMessage('The selfieKey value should not be empty'),
    ];
  }

  checkEditName() {
    return [
      body('id').notEmpty().withMessage('The id value should not be empty'),
      body('name').notEmpty().withMessage('The name value should not be empty'),
    ];
  }

  checkEditPhone() {
    return [
      body('id').notEmpty().withMessage('The id value should not be empty'),
      body('phone').notEmpty().withMessage('The phone value should not be empty'),
      body('countryCode').notEmpty().withMessage('The countryCode value should not be empty'),

    ];
  }

  checkEditEmail() {
    return [
      body('id').notEmpty().withMessage('The id value should not be empty'),
      body('email').notEmpty().withMessage('The email value should not be empty'),
    ];
  }

  checkEditNotificationSettings() {
    return [
      body('id').notEmpty().withMessage('The id value should not be empty'),
      body('textMessagesNotification').notEmpty().withMessage('The textMessagesNotification value should not be empty'),
      body('emailNotification').notEmpty().withMessage('The emailNotification value should not be empty'),
      body('unsubscribe').notEmpty().withMessage('The unsubscribe value should not be empty'),
    ];
  }

  checkGetAlbumsWithPerson() {
    return [
      query('phone').notEmpty().withMessage('The phone value should not be empty'),
    ];
  }

  checkGetAlbumThumbnailIcon() {
    return [
      body('albumIds').notEmpty().withMessage('The albumIds value should not be empty'),
      body('albumIds').isArray().withMessage('The albumIds should be an array')];
  }

  checkGetThumbnailsWithPerson() {
    return [
      query('userId').notEmpty().withMessage('The userId value should not be empty'),
      query('albumId').notEmpty().withMessage('The albumId value should not be empty'),
    ];
  }

  checkGetOriginalPhoto() {
    return [
      query('albumId').notEmpty().withMessage('The albumId value should not be empty'),
      query('userId').notEmpty().withMessage('The userId value should not be empty'),
      query('originalKey').notEmpty().withMessage('The originalKey value should not be empty'),
    ];
  }

  checkGeneratePayment() {
    return [
      query('albumId').notEmpty().withMessage('The albumId value should not be empty'),
      query('userId').notEmpty().withMessage('The userId value should not be empty'),
    ];
  }
}

export default new AppUserValidator();
