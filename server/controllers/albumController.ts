import { Request, Response } from 'express';
import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import {
  Album, Photo, Person, Photo_Person,
} from '../models/model';

aws.config.update({
  region: 'eu-west-1',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

class AlbumController {
  async createAlbum(req:Request, res:Response) {
    try {
      const {
        name, location, date, photographerId,
      } = req.body;
      const album = await Album.create({
        name, location, date, photographerId,
      });
      res.json(album);
      return;
    } catch (e) {
      console.log(e);
    }
  }

  async uploadPhotosToDB(req:Request, res:Response) {
    try {
      const {
        name, clientsArray, photoUrl, albumName,
      } = req.body;
      const photo = await Photo.create({ name, photoUrl, albumName });
      // @ts-ignore
      const photoId = photo.dataValues.id;
      for (let i = 0; i < clientsArray.length; i += 1) {
        try {
          /* eslint-disable no-await-in-loop */
          const personExist = await Person.findOne({ where: { name: clientsArray[i] } });
          if (personExist === null) {
            /* eslint-disable no-await-in-loop */
            const person = await Person.create({
              name: clientsArray[i],
              photoId,
            });
            // @ts-ignore
            person.addPhoto(photo);
          } else {
            // @ts-ignore
            personExist.addPhoto(photo);
          }
        } catch (e) {
          console.log(e);
        }
      }
      res.send('Successfully uploaded');
    } catch (e) {
      console.log(e);
    }
  }

  async addPersonToPhoto(req: Request, res: Response) {
    const { photoId, clientsArray } = req.body;
    try {
      const photo = await Photo.findOne({ where: { id: photoId } });

      for (let i = 0; i < clientsArray.length; i += 1) {
        try {
          const personExist = await Person.findOne({ where: { name: clientsArray[i] } });
          if (personExist === null) {
            /* eslint-disable no-await-in-loop */
            const person = await Person.create({
              name: clientsArray[i],
              photoId,
            });
            // @ts-ignore
            person.addPhoto(photo);
          } else {
            // @ts-ignore
            personExist.addPhoto(photo);
          }
        } catch (e) {
          console.log(e);
        }
      }
      res.send('Successfully uploaded');
    } catch (e) {
      console.log(e);
    }
  }

  async signOne(req: Request, res: Response) {
    const s3 = new aws.S3();
    const photosArray = req.body;
    console.log(req.body);
    const presignedPostsArray = [];
    for (let i = 0; i < photosArray.length; i += 1) {
      const { url, fields } = s3.createPresignedPost({
        Fields: {
          key: `${uuidv4()}_${photosArray[i].name}`,
        },
        Conditions: [['content-length-range', 0, 1000000]],
        Expires: 60 * 60, // seconds
        Bucket: process.env.S3_BUCKET,
      });
      presignedPostsArray.push({ url, fields });
    }
    res.send(JSON.stringify(presignedPostsArray));
  }

  async getAlbums(req: Request, res: Response) {
    const { photographerId } = req.query;
    console.log('photographerId is: ', photographerId);
    const albums = await Album.findAll({ where: { photographerId } });
    res.send(JSON.stringify(albums));
  }

  async getPhotos(req: Request, res: Response) {
    /* LIMIT will retrieve only the number of records specified after the LIMIT keyword,
     unless the query itself returns fewer records than the number specified by LIMIT.
    OFFSET is used to skip the number of records from the results. */
    let {
      albumName, photographerId, limit, page,
    } = req.query;
    // @ts-ignore
    page = page || 1;
    // @ts-ignore
    limit = limit || 10;
    // @ts-ignore
    const offset = page * limit - limit;
    // @ts-ignore
    const album = await Photo.findAndCountAll({
      where: { albumName, photographerId },
      // @ts-ignore
      limit,
      offset,
    });

    res.json(album);
  }

  async getPhotoWithPerson(req:Request, res:Response) {
    const { personName } = req.query;
    const person = await Person.findOne({ where: { name: personName } });
    if (person) {
      const photo_person = await Photo_Person.findAll({
        where:
        // @ts-ignore
          { personId: person.id },
      });
      // @elsint-ignore
      // @ts-ignore
      const photos = [];
      // @ts-ignore
      if (photo_person.length > 0) {
        for (let i = 0; i < photo_person.length; i++) {
          // @ts-ignore
          const photo = await Photo.findOne({ where: { id: photo_person[i].photoId } });
          photos.push(photo);
        }
      }
      // @ts-ignore
      res.json(photos);
    }
  }
}

export default new AlbumController();
