/*
1.Configuration basics
https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html

2.Tutorial: Using an Amazon S3 trigger to invoke a Lambda function
https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html

3.Tutorial: Using an Amazon S3 trigger to create thumbnail images
https://docs.aws.amazon.com/lambda/latest/dg/with-s3-tutorial.html#with-s3-tutorial-create-function-createfunction

4.Working with object metadata
https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html#object-metadata

5.How can I get my CloudFormation stack to update if it's stuck in the UPDATE_ROLLBACK_FAILED state
https://aws.amazon.com/premiumsupport/knowledge-center/cloudformation-update-rollback-failed/
*/
import 'dotenv/config';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import convert from 'heic-convert';

import axios from 'axios';
import {
  Photo, Person, AppUser, Photo_Person,
} from '../../models/model';
import * as photoDropLogo from './PhotoDropLogo.png';
import * as photoDropLogoBig from './PhotoDropLogoBig.png';
import { PhotoInstance } from '../../models/interfaces';
/*
1.To import photoDropLogo index.d.ts has to be created and "*.png" has to be initiated and exported
*/
// get reference to S3 client
// delete this line after
const s3 = new AWS.S3();

// 1. Get metadata from the photo
const getMetaData = async (srcBucket:string, srcKey:string) => {
  const paramsS3 = {
    Bucket: srcBucket,
    Key: srcKey,
  };

  const data = await s3.headObject(paramsS3).promise();
  const metadata = (!data) ? null : data.Metadata;
  if (!metadata) {
    return;
  }
  const peopleString = metadata.people;
  const peopleArray = peopleString.split(',');
  const { photographerid } = metadata;
  const { albumid } = metadata;

  return { peopleArray, photographerid, albumid };
};

// 2.Add people to photo
const addPeopleToPhoto = async (phoneNumbersArray: string[], image: PhotoInstance): Promise<void> => {
  for (let i = 0; i < phoneNumbersArray.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const personExist = await Person.findOne({ where: { phone: phoneNumbersArray[i] } });
    if (personExist === null) {
      /* eslint-disable no-await-in-loop */
      const numericPhone = phoneNumbersArray[i].replace(/[^0-9]/g, '');
      const person = await Person.create({ phone: numericPhone });
      await Photo_Person.create({ photoId: image.id, personId: person!.id });
    } else {
      await Photo_Person.create({ photoId: image.id, personId: personExist!.id });
    }
  }
};

// 3. Handle image type
const handleImageType = (srcKey: string): boolean | string => {
  // Infer the image type from the file suffix.
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log('Could not determine the image type.');
    return false;
  }
  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType !== 'jpg' && imageType !== 'png' && imageType !== 'jpeg') {
    console.log(`Unsupported image type: ${imageType}`);
    return imageType;
  }
  return true;
};

const handleNotification = async (peopleArray: string[], albumid: string) => {
  try {
    // // notify(in telegram) app user that photo has been uploaded
    const phoneNumbers = peopleArray;
    if (phoneNumbers) {
      for (let i = 0; i < phoneNumbers.length; i += 1) {
        const numericPhone = phoneNumbers[i].replace(/[^0-9]/g, '');
        // check if user with such phone number exist
        /* eslint-disable no-await-in-loop */
        const user = await AppUser.findOne({ where: { phone: numericPhone } });
        if (user) {
          /* eslint-disable no-await-in-loop */
          const person = await Person.findOne({ where: { phone: user.phone } });
          if (person) {
            // get all photos from specific album
            /* eslint-disable no-await-in-loop */
            const photos = await Photo.findAll({ where: { albumId: albumid } });
            // console.log({ photos });
            if (photos) {
              const photoIds = photos.map((image) => image.id);
              // check if there are already photos from this album with current user
              const promisesArray = photoIds.map((el) => Photo_Person.findOne({
                where: {
                  photoId: el,
                  personId: person.id,
                },
              }));
              const photosWithPerson = await Promise.all(promisesArray);
              const notNullResponse = photosWithPerson.filter((element) => element !== null);
              /* if there only 1(one) photo(which just got uploaded)
              with current person in specific album -send one time notification to the telegram */
              if (notNullResponse.length === 1) {
                const uri = encodeURI(`https://api.telegram.org/bot5620754624:AAECaxHAR6n5ITV14KjCpP-JPGCrFKcCRjY/sendMessage?chat_id=-678774504&text=PhotoDrop:${phoneNumbers[i]} your photos have dropped🔥\n\nCheck them out here:\n  https://dev-photodrop-client.vercel.app/albums/${albumid}`);
                await axios({
                  method: 'get',
                  url: uri,
                });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
};

const baseHandler = async (event :any) => {
  try {
    if (!photoDropLogo || !photoDropLogoBig) {
      return;
    }
    const srcBucket:string = event.Records[0].s3.bucket.name;
    const srcKey: string = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    const response = await getMetaData(srcBucket, srcKey);
    if (response) {
      const { peopleArray, photographerid, albumid } = response;

      // 1.Save photo to DB
      const urlPhoto = `https://${srcBucket}.s3.eu-west-1.amazonaws.com/${srcKey}`;
      const photo = await Photo.create({
        name: srcKey, photoUrl: urlPhoto, photographerId: photographerid, albumId: albumid,
      });
      // 2.Add people that are marked on the photo
      if (photo) {
        await addPeopleToPhoto(peopleArray, photo);
        console.log('Successfully uploaded');
      } else {
        console.log({ message: 'Photo was not found' });
      }
      // Get original image
      const origimage = await s3.getObject({ Bucket: srcBucket, Key: srcKey }).promise();
      let originalImage = origimage.Body as Buffer;

      // 3. Check image type
      const imageTypeCheck = handleImageType(srcKey);
      if (imageTypeCheck === false) { return; }
      if (imageTypeCheck === 'webp') {
        originalImage = await sharp(originalImage).jpeg().toBuffer();
      }
      if (imageTypeCheck === 'heic' || imageTypeCheck === 'heif') {
        const outputBuffer = await convert({
          buffer: originalImage, // the HEIC file buffer
          format: 'JPEG', // output format
          quality: 1, // the jpeg compression quality, between 0 and 1
        });
        originalImage = Buffer.from(outputBuffer);
      }

      // 7. Handle Telegram notification
      await handleNotification(peopleArray, albumid);
    }
  } catch (e) {
    console.log(e);
  }
};
// @ts-ignore
const handler = baseHandler;

module.exports.handler = handler;
