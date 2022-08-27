import express from 'express';
import albumController from '../controllers/albumController';
import checkAuth from '../middleware/authMiddleware';

const router = express.Router();

router.post('/create-album', checkAuth, albumController.createAlbum);
router.post('/save-photo-to-database', checkAuth, albumController.savePhotoToDB);
router.post('/save-mini-photo-to-database', checkAuth, albumController.savePhotoMiniToDB);
router.post('/add-person-to-photo', checkAuth, albumController.addPersonToPhoto);
router.post('/s3-upload', checkAuth, albumController.signOne);
router.get('/get-albums', checkAuth, albumController.getAlbums);
router.get('/get-photos', checkAuth, albumController.getPhotos);
router.get('/get-photo-with-person', checkAuth, albumController.getPhotoWithPerson);

export default router;
