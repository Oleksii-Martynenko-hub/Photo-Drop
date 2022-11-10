import 'dotenv/config';
import AWS from 'aws-sdk';
// import sharp from 'sharp';
import Jimp from 'jimp/es';
import {
  Selfie, SelfieMini,
} from '../../models/model';

// get reference to S3 client
const s3 = new AWS.S3();
const baseHandler = async (event: any) => {
  // Get the object from the event and show its content type
  const bucket = event.Records[0].s3.bucket.name;
  const dstBucket = `${bucket}-resized`;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  const dstKey = key;
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    const data = await s3.getObject(params).promise();
    const metadata = (!data) ? null : data.Metadata;
    if (metadata) {
      const { userid } = metadata;
      // save selfie info to db
      const urlSelfie = `https://${bucket}.s3.eu-west-1.amazonaws.com/${key}`;

      console.log('METADATA IS: ', metadata.userid);
      try {
        const oldSelfies = await Selfie.findAll({ where: { appUserId: userid } });
        for (let i = 0; i < oldSelfies.length; i += 1) {
          oldSelfies[i].active = false;
          // eslint-disable-next-line no-await-in-loop
          await oldSelfies[i].save();
        }

        const selfie = await Selfie.create({
          name: key, selfieUrl: urlSelfie, active: true, appUserId: userid,
        });

        console.log('Selfie is: ', selfie);
      } catch (e) {
        console.log(e);
        return;
      }

      // Infer the image type from the file suffix.
      const typeMatch = key.match(/\.([^.]*)$/);
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
        // eslint-disable-next-line no-shadow
        const params = {
          Bucket: bucket,
          Key: key,
        };
        // eslint-disable-next-line vars-on-top, no-var
        origimage = await s3.getObject(params).promise();
      } catch (error) {
        console.log(error);
        return;
      }

      // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
      const height = 250;

      // Use the sharp module to resize the image and save in a buffer.
      let buffer;
      try {
        // @ts-ignore
        // buffer = await sharp(origimage.Body).resize(width).toBuffer();
        buffer = await Jimp.read(origimage.Body).then((image) => {
          const resizedImage = image
            .resize(Jimp.AUTO, height)
            .quality(100) // set JPEG quality
            .getBufferAsync(Jimp.MIME_JPEG);

          return resizedImage;
        });
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
            const urlSelfieMini = `https://${dstBucket}.s3.eu-west-1.amazonaws.com/${dstKey}`;
            const oldSelfies = await SelfieMini.findAll({ where: { appUserId: userid } });
            for (let i = 0; i < oldSelfies.length; i += 1) {
              oldSelfies[i].active = false;
              // eslint-disable-next-line no-await-in-loop
              await oldSelfies[i].save();
            }

            try {
              await SelfieMini.create({
                name: dstKey, selfieUrl: urlSelfieMini, active: true, appUserId: userid,
              });
            } catch (e) {
              console.log(e);
              return;
            }
          } catch (e) {
            console.log(e);
            return;
          }
          console.log(`Successfully resized ${bucket}/${key
          } and uploaded to ${dstBucket}/${dstKey}`);
        }
      } catch (error) {
        console.log(error);
        return;
      }

      return;
    }
  } catch (err) {
    console.log(err);
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
    console.log(message);
    throw new Error(message);
  }
};

// @ts-ignore
const handler = baseHandler;

module.exports.handler = handler;
