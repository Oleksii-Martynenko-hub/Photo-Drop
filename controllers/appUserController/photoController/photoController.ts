// import { Sequelize } from 'sequelize';
import { Request, Response } from 'express';
import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import {
  SelfieMini, Person, Photo_Person, Photo, UserAlbum, PhotoMini, Album, AppUser,
} from '../../../models/model';

// hjgjhgsdfs

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-08-01',
});
// This is your test secret API key.
aws.config.update({
  region: 'eu-west-1',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

const checkIfPaid = async (userId:string, albumId:string) :Promise<boolean> => {
  try {
    const info = await UserAlbum.findOne({ where: { userId, albumId } });
    if (info === null) {
      return false;
    }
    if (info.isPaid === false) {
      return false;
    }
    if (info.isPaid === true) {
      return true;
    }
  } catch (e) {
    console.log(e);
  }
  return false;
};

const generatePaymnet = async (
  albumId: string,
  userId: string,
  host: any,
): Promise<string | undefined> => {
  console.log({ host });
  const success_base_url = host.includes('dev-photodrop') ? 'https://dev-photodrop-client.vercel.app' : 'http://localhost:3000';
  const albumItem = { id: 1, priceInCents: 500, name: 'Album' };
  if (albumId !== undefined && userId !== undefined) {
    try {
      const customer = await stripe.customers.create({
        metadata: { userId, albumId },
        // metadata: { userId: `${userId}`, albumId: `${albumId}` },
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
        success_url: `${success_base_url}/albums/success${albumId}`,
        cancel_url: `${success_base_url}/albums/cancel`,
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
  async signSelfie(req: Request, res: Response) :Promise<void> {
    interface Body {
    name: string;
    userId: string;
  }
    const s3 = new aws.S3();
    const { name, userId } :Body = req.body;
    // const metadata = `${userId}`;
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
    // const appUserId = req.query.appUserId as string|undefined;
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

  async getAlbumsWithPerson(req: Request, res: Response): Promise<void> {
    const phone = `${req.query.phone}`;
    try {
      const person = await Person.findOne({ where: { phone } });
      if (person) {
        const photo_person = await Photo_Person.findAll({ where: { personId: person.id } });
        const photoIds = photo_person.map(({ photoId }) => photoId);
        // const photos = await Photo.findAll({ where: Sequelize.or({ id: photoIds }) });
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

  async getAlbumsThumbnailIcon(req: Request, res: Response): Promise<void> {
    const s3 = new aws.S3();
    interface ThumbnailsObject{
      [key: string] : string | null
    }
    const albumIds = req.body.albumIds as string[];
    const userId = req.body.userId as string;
    const albumThumbnails:ThumbnailsObject = {};
    try {
      const user = await AppUser.findOne({ where: { id: userId } });
      const person = await Person.findOne({ where: { phone: user?.phone } });
      const photoPeople = await Photo_Person.findAll({ where: { personId: person?.id } });
      const photoIds = photoPeople.map((el) => el.photoId);
      const photos = await Photo.findAll({ where: { id: photoIds } });
      /// //////
      // const promises = albumIds.map((id) => PhotoMini.findOne({ where: { albumId: id } }));
      // const albumThumbnailObjects = await Promise.all(promises);
      // albumThumbnailObjects.forEach((obj) => {
      //   const url = s3.getSignedUrl('getObject', {
      //     Bucket: process.env.S3_BUCKET_RESIZED,
      //     Key: `resized-${obj!.name}`,
      //     Expires: 60 * 120,
      //   });
      //   albumThumbnails[obj!.albumId] = url;
      // });
      albumIds.forEach((albumId) => {
        photos.forEach((photo) => {
          if (albumId === photo.albumId) {
            const url = s3.getSignedUrl('getObject', {
              Bucket: process.env.S3_BUCKET_RESIZED,
              Key: `resized-${photo!.name}`,
              Expires: 60 * 120,
            });
            albumThumbnails[photo!.albumId] = url;
          }
        });
      });

      res.json(albumThumbnails);
      // }
    } catch (e) {
      console.log(e);
      res.status(403).json({ message: 'Error occured' });
    }
  }

  async getThumbnails(req: Request, res: Response): Promise<void> {
    interface Thumbnails {
            isPaid: boolean,
            url: string,
            originalKey: string,
            albumId: string
    }
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
        const signedThumbnails:Thumbnails[] = [];
        if (photos.length > 0) {
          photos.forEach((photo) => {
            if (photo) {
              const s3 = new aws.S3();
              const url = s3.getSignedUrl('getObject', {
                Bucket: albumPaidStatus[photo.albumId] === true ? process.env.S3_BUCKET_RESIZED
                  : process.env.S3_BUCKET_RESIZED_WATERMARK,
                Key: albumPaidStatus[photo.albumId] === true ? `resized-${photo.name}`
                  : `resized-watermarkresized-${photo.name}`,
                Expires: 60 * 120,
              });
              signedThumbnails.push({
                isPaid: albumPaidStatus[photo.albumId],
                url,
                originalKey: photo.name,
                albumId: photo.albumId,
              });
            }
          });
        }
        res.json({ totalPhotos: photos.length, thumbnails: signedThumbnails });
        return;
      } catch (e) {
        console.log(e);
      }
    } else {
      res.json({ message: 'query parameters missing' });
    }
  }

  async getOriginalPhoto(req: Request, res: Response): Promise <void> {
    const s3 = new aws.S3();
    const host = req.headers.origin as string;
    const { originalKey, albumId, userId } = req.query as { [key: string]: string };
    if (userId && albumId) {
      try {
        const isPaid = await checkIfPaid(userId, albumId);
        if (isPaid === true) {
          // send original photo
          const url = s3.getSignedUrl('getObject', {
            Bucket: process.env.S3_BUCKET,
            Key: originalKey,
            Expires: 60 * 120,
            ResponseContentDisposition: 'attachment',
          });
          res.send(`${url}`);
          return;
        }
        // redirect to the payment page
        const paymentLink = await generatePaymnet(albumId, userId, host);
        if (paymentLink) {
          res.send(`${paymentLink}`);
          return;
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
}

export default new PhotoController();
