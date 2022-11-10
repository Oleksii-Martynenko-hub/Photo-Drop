// import { Sequelize } from 'sequelize';
import { Request, Response } from 'express';
import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import {
  SelfieMini, Person, Photo_Person, Photo, UserAlbum, Album, AppUser,
} from '../../../models/model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-08-01',
});
// This is your test secret API key.
aws.config.update({
  region: 'eu-west-1',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  signatureVersion: 'v4', // It fixes the issue of "Missing Authentication Token" when generating presignedUrl for Object lambda Access Point
});

const generPaymment = async (
  albumId: string,
  userId: string,
  host: any,
): Promise<string | undefined> => {
  const albumItem = { id: 1, priceInCents: 500, name: 'Album' };
  if (albumId !== undefined && userId !== undefined) {
    // TODO: create separate service fot the below(Controller- Service separation)
    try {
      const customer = await stripe.customers.create({
        metadata: { userId, albumId },
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer: customer.id,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: albumItem.name,
            },
            unit_amount: albumItem.priceInCents,
          },
          quantity: 1,
        }],
        metadata: { userId: `${userId}`, albumId: `${albumId}` },
        success_url: `${host}/albums/success/${albumId}`,
        cancel_url: `${host}/albums/cancel`,
      });
      const { url } = session;
      if (url) {
        return url;
      }
    } catch (e) {
      console.log(e);
    }
  }
};

class PhotoController {
  async signSelfie(req: Request<any, any, { name: string; userId: string }>, res: Response) :Promise<void> {
    const s3 = new aws.S3();
    const { name, userId } = req.body;
    const startIndex = name.indexOf('.') + 1;
    const photoExtension = name.substr(startIndex);

    const { url, fields } = s3.createPresignedPost({
      Fields: {
        key: `${uuidv4()}.${photoExtension}`,
        'Content-Type': `image/${photoExtension}`,
        'x-amz-meta-userId': userId,
        originalSelfieKey: name,
      },
      Conditions: [['content-length-range', 0, 5000000]],
      Expires: 60 * 120, // seconds
      Bucket: process.env.S3_SELFIE_BUCKET,
    });
    res.send(JSON.stringify({ url, fields }));
  }

  async getSelfie(req: Request, res: Response) :Promise<void> {
    const appUserId = req.query.appUserId as string;

    try {
      // if (appUserId !== undefined) {
      const selfie = await SelfieMini.findOne({ where: { appUserId, active: true } });
      if (selfie) {
        res.json(selfie);
        return;
      }
      res.json({ errors: [{ msg: 'User doesn`t have active selfie' }] });
      return;
      // }
    } catch (e) {
      res.status(500).json({ message: 'Error occured' });
    }
  }

  async createPresignedGetForSelfie(req: Request, res: Response): Promise<void> {
    const s3 = new aws.S3();
    interface Body {
      selfieKey: string
    }
    const { selfieKey } : Body = req.body;
    try {
      const url = s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_SELFIE_BUCKET_RESIZED,
        Key: selfieKey,
        Expires: 60 * 120,
      });

      res.json(url);
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'Error occured' });
    }
  }

  async getAlbumsWithPerson(req: Request<any, any, any, {phone:string}>, res: Response): Promise<void> {
    const { phone } = req.query;
    try {
      const person = await Person.findOne({ where: { phone } });
      if (person) {
        const photo_person = await Photo_Person.findAll({ where: { personId: person.id } });
        const photoIds = photo_person.map(({ photoId }) => photoId);
        const photos = await Photo.findAll({ where: { id: photoIds } });
        const albumIds = photos.map(({ albumId }) => albumId);
        const uniqueAlbumIds = [...new Set(albumIds)];
        const albumsInfo = await Album.findAll({ where: { id: uniqueAlbumIds } });

        res.json({ albumsInfo });
      } else {
        res.json({ message: 'No albums found' });
      }
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'Error occured' });
    }
  }

  async getAlbumsThumbnailIcon(req: Request<any, any, {albumIds:string[], userId: string}>, res: Response): Promise<void> {
    const s3 = new aws.S3();
    interface ThumbnailsObject{
      [key: string] : string | null
    }
    const { albumIds, userId } = req.body;
    const albumThumbnails:ThumbnailsObject = {};
    try {
      const user = await AppUser.findOne({ where: { id: userId } });
      const person = await Person.findOne({ where: { phone: user?.phone } });
      const photoPeople = await Photo_Person.findAll({ where: { personId: person?.id } });
      const photoIds = photoPeople.map((el) => el.photoId);
      const photos = await Photo.findAll({ where: { id: photoIds } });

      albumIds.forEach((albumId) => {
        photos.forEach((photo) => {
          if (albumId === photo.albumId) {
            const url = s3.getSignedUrl('getObject', {
              Bucket: process.env.S3_LAMBDA_ACCESS_POINT_IMAGE_RESIZE,
              Key: photo.name,
              Expires: 60 * 120,
            });
            albumThumbnails[photo!.albumId] = url;
          }
        });
      });

      // const urls = albumIds.map((id) => photos.map((photo) => (id === photo.albumId ? s3.getSignedUrl('getObject', {
      //   Bucket: process.env.S3_LAMBDA_ACCESS_POINT_IMAGE_RESIZE,
      //   Key: photo.name,
      //   Expires: 60 * 120,
      // }) : '')));

      res.json(albumThumbnails);
      // }
    } catch (e) {
      console.log(e);
      res.status(403).json({ message: 'Error occured' });
    }
  }

  async getThumbnails(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string | undefined;
    const albumId = req.query.albumId as string | undefined;

    const findUserPhoto = async (uId :string) => {
      const user = await AppUser.findOne({ where: { id: uId } });
      const person = await Person.findOne({ where: { phone: user?.phone } });
      const photoPeople = await Photo_Person.findAll({ where: { personId: person?.id } });
      const photoIds = photoPeople.map((el) => el.photoId);
      const photos = await Photo.findAll({ where: { id: photoIds } });
      const albumIds = photos.map((photo) => photo.albumId);
      const uniqueAlbumIds = [...new Set(albumIds)];
      const albums = await UserAlbum.findAll({ where: { userId: uId, albumId: uniqueAlbumIds } });
      type InterfaceAlbumPaidStatus = {
            [key: string]: boolean;
            };
      const albumPaidStatus:InterfaceAlbumPaidStatus = {};
      albums.forEach((album) => {
        albumPaidStatus[album.albumId] = album.isPaid;
      });
      return { photos, albumPaidStatus };
    };

    if (userId && albumId) {
      try {
        const { photos, albumPaidStatus } = await findUserPhoto(userId);

        if (photos.length > 0) {
          const signedThumbnails = photos.map((photo) => {
            const s3 = new aws.S3();
            const url = s3.getSignedUrl('getObject', {
              Bucket: albumPaidStatus[photo.albumId] === true ? process.env.S3_LAMBDA_ACCESS_POINT_IMAGE_RESIZE
                : process.env.S3_LAMBDA_ACCESS_POINT_IMAGE_RESIZE_WATERMARK,
              Key: photo.name,
              Expires: 60 * 120,
            });
            const thumbnail = {
              isPaid: albumPaidStatus[photo.albumId],
              url,
              originalKey: photo.name,
              albumId: photo.albumId,
            };
            return thumbnail;
          });
          res.json({ totalPhotos: photos.length, thumbnails: signedThumbnails });
          return;
        }
      } catch (e) {
        console.log(e);
      }
    } else {
      res.json({ message: 'query parameters missing' });
    }
  }

  async getOriginalPhoto(req: Request, res: Response): Promise <void> {
    const s3 = new aws.S3();
    const { originalKey, albumId, userId } = req.query as { [key: string]: string };
    if (userId && albumId) {
      try {
        const info = await UserAlbum.findOne({ where: { userId, albumId } });
        if (info && info.isPaid === true) {
          // send original photo
          const url = s3.getSignedUrl('getObject', {
            Bucket: process.env.S3_BUCKET,
            Key: originalKey,
            Expires: 60 * 120,
            // ResponseContentDisposition: 'attachment',
          });
          res.send(`${url}`);
          return;
        }
        // send original watermarked photo
        const url = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_LAMBDA_ACCESS_POINT_IMAGE_WATERMARK,
          Key: originalKey,
          Expires: 60 * 120,
        });
        res.send(`${url}`);
        return;
      } catch (e) {
        console.log(e);
      }
    }
  }

  async generatePayment(req: Request, res: Response): Promise <void> {
    const host = req.headers.origin as string;
    console.log({ host });

    const { albumId, userId } = req.query as { [key: string]: string };
    // redirect to the payment page
    const paymentLink = await generPaymment(albumId, userId, host);
    if (paymentLink) {
      res.send(`${paymentLink}`);
    }
  }
}

export default new PhotoController();
