import 'dotenv/config';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import Jimp from 'jimp';
// @ts-ignore
import PhotoDropLogo from './PhotoDropLogo.png';
import {
  Photo, PhotoMini, PhotoMiniWaterMark, Person,
} from '../../models/model';

// get reference to S3 client
const s3 = new AWS.S3();

const baseHandler = async (event:any) => {
  // Read options from the event parameter
  // console.log('Reading options from event:\n', util.inspect(event, { depth: 5 }));

  const srcBucket = event.Records[0].s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  // for obtainig the meta data for the bucket and key
  const paramsS3 = {
    Bucket: srcBucket,
    Key: srcKey,
  };
  const data = await s3.headObject(paramsS3).promise();
  const metadata = (!data) ? null : data.Metadata;
  let peopleArray;
  if (metadata) {
    const peopleString = metadata.people;
    peopleArray = peopleString.split(',');
  }
  const dstBucket = `${srcBucket}-resized`;
  const dstBucketWM = `${srcBucket}-resized-watermark`;
  const dstKey = `resized-${srcKey}`;
  const dstKeyWM = `resized-watermark${dstKey}`;

  // save original photo info to db
  const idEnd = srcKey.indexOf('/');
  const photographerId = Number(srcKey.substring(0, idEnd));
  const albumIdStart = srcKey.substring(idEnd + 1);
  const albumIdEnd = albumIdStart.indexOf('/');
  const albumId = Number(`${albumIdStart.substring(0, albumIdEnd)}`);
  const urlPhoto = `https://${srcBucket}.s3.eu-west-1.amazonaws.com/${srcKey}`;
  try {
    const photo = await Photo.create({
      name: srcKey, photoUrl: urlPhoto, photographerId, albumId,
    });
    if (photo && peopleArray) {
      // @ts-ignore
      const photoId = photo.dataValues.id;
      // @ts-ignore
      for (let i = 0; i < peopleArray.length; i += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const personExist = await Person.findOne({ where: { phone: peopleArray[i] } });
          if (personExist === null) {
            /* eslint-disable no-await-in-loop */
            const person = await Person.create({
              phone: peopleArray[i],
              photoId,
            });
            // @ts-ignore
            await person.addPhoto(photo);
          } else {
            // @ts-ignore
            await personExist.addPhoto(photo);
          }
        } catch (e) {
          console.log(e);
        }
      }
      console.log('Successfully uploaded');
    } else {
      console.log({ message: 'Photo was not found' });
    }
  } catch (e) {
    console.log(e);
    return;
  }

  // Infer the image type from the file suffix.
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log('Could not determine the image type.');
    return;
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType !== 'jpg' && imageType !== 'png' && imageType !== 'jpeg') {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  // Download the image from the S3 source bucket.
  let origimage;

  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    origimage = await s3.getObject(params).promise();
  } catch (error) {
    console.log(error);
    return;
  }

  // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
  const width = 400;

  // Use the sharp module to resize the image and save in a buffer.
  let buffer;
  try {
    // @ts-ignore
    buffer = await sharp(origimage.Body).resize(width).toBuffer();
  } catch (error) {
    console.log(error);
    return;
  }

  // Upload the thumbnail image to the destination bucket
  try {
    const destparams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: buffer,
      ContentType: 'image',
    };

    const putResult = await s3.putObject(destparams).promise();
    if (putResult) {
      try {
        // save resized photo info to db
        const urlPhotoMini = `https://${dstBucket}.s3.eu-west-1.amazonaws.com/${srcKey}`;
        try {
          await PhotoMini.create({
            name: srcKey, photoMiniUrl: urlPhotoMini, photographerId, albumId,
          });
        } catch (e) {
          console.log(e);
          return;
        }
      } catch (e) {
        console.log(e);
        return;
      }
      console.log(`Successfully resized ${srcBucket}/${srcKey
      } and uploaded to ${dstBucket}/${dstKey}`);

      console.log('METADATA IS:   ', metadata);
    }
  } catch (error) {
    console.log(error);
    return;
  }

  try {
    // add watermark add upload to photodropbucket-resized-watermark
    const addWaterMark = async (image:any) => {
      const logoImage = await Jimp.read(PhotoDropLogo);
      const resizeWidth = 400;
      if (!image) {
        return;
      }
      const imageResized = await sharp(image).resize(resizeWidth).toBuffer();
      const img = await Jimp.read(imageResized);
      img.composite(
        logoImage,
        img.bitmap.width / 2 - logoImage.bitmap.width / 2,
        img.bitmap.height / 2 - logoImage.bitmap.height / 2,
      );
      // eslint-disable-next-line consistent-return
      return img.getBufferAsync(Jimp.MIME_JPEG);
    };

    const imageWM = await addWaterMark(origimage.Body);

    const destparamsWM = {
      Bucket: dstBucketWM,
      Key: dstKeyWM,
      Body: imageWM,
      ContentType: 'image',
    };

    const putResultWM = await s3.putObject(destparamsWM).promise();

    if (putResultWM) {
      try {
        // save resized photo info to db
        const urlPhotoMiniWaterMark = `https://${dstBucketWM}.s3.eu-west-1.amazonaws.com/${srcKey}`;
        try {
          await PhotoMiniWaterMark.create({
            name: srcKey, photoMiniWaterMarkUrl: urlPhotoMiniWaterMark, photographerId, albumId,
          });
        } catch (e) {
          console.log(e);
          return;
        }
      } catch (e) {
        console.log(e);
        return;
      }
      console.log(`Successfully resized with matermark${srcBucket}/${srcKey
      } and uploaded to ${dstBucketWM}/${dstKeyWM}`);
    }
  } catch (error) {
    console.log(error);
  }
};
// @ts-ignore
const handler = baseHandler;

module.exports.handler = handler;
