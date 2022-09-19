import { body, query } from 'express-validator';

class PhotographerValidator {
  checkLogin() {
    return [
      body('login').notEmpty().withMessage('The "login" value should not be empty'),
      body('password').notEmpty().withMessage('The "password" value should not be empty'),
    ];
  }

  checkCreateAlbum() {
    return [
      body('name').notEmpty().withMessage('The name value should not be empty'),
      body('location').notEmpty().withMessage('The location value should not be empty'),
      body('date').notEmpty().withMessage('The date value should not be empty'),
      body('photographerId').notEmpty().withMessage('The photographerId value should not be empty'),
    ];
  }

  checkGetAlbum() {
    return [
      query('photographerId').notEmpty().withMessage('The photographerId value should not be empty'),
    ];
  }

  checkS3Upload() {
    return [
      body('photosArray').notEmpty().withMessage('The photosArray value should not be empty'),
      body('photosArray').isArray().withMessage('The photosArray should be an array'),
      body('people').notEmpty().withMessage('The people value should not be empty'),
      body('people').isArray().withMessage('The people should be an array'),
    ];
  }

  checkGetSignedPhotos() {
    return [
      body().notEmpty().withMessage('The body should not be empty'),
      body().isArray().withMessage('The body should be an array'),
    ];
  }

  checkGetPhotos() {
    return [
      query('albumId').notEmpty().withMessage('The albumId value should not be empty'),
      query('photographerId').notEmpty().withMessage('The photographerId value should not be empty'),
    ];
  }
}

export default new PhotographerValidator();
