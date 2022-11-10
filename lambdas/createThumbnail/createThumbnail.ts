import AWS from 'aws-sdk';
import axios from 'axios';
import Jimp from 'jimp';
import sharp from 'sharp';
import convert from 'heic-convert';

const S3 = new AWS.S3();

const resizeImage = async (origimage :Buffer) => {
  if (!origimage) {
    return;
  }
  let imageResized = await Jimp.read(origimage);
  const originalHeight = imageResized.bitmap.height;
  const originalWidth = imageResized.bitmap.width;
  const minValue = originalWidth < originalHeight ? 'width' : 'heigth';
  const newWidth = minValue === 'width' ? 400 : Jimp.AUTO;
  const newHeight = minValue === 'heigth' ? 400 : Jimp.AUTO;

  imageResized = imageResized.resize(newWidth, newHeight);
  const img = await Jimp.read(imageResized);
  return img.getBufferAsync(Jimp.MIME_JPEG);
};

const baseHandler = async (event:any) => {
  try {
    // Context given by s3-object-lambda event trigger.
    /* inputS3Url is a presigned URL that the function can use to download
    the original object from the supporting Access Point */

    console.log('Start Event', event);
    const { outputRoute, outputToken, inputS3Url } = event.getObjectContext || {};
    let { data: originalImage } = await axios.get(inputS3Url, { responseType: 'arraybuffer' });
    if (inputS3Url.includes('.webp?')) {
      originalImage = await sharp(originalImage).jpeg().toBuffer();
    }
    if (inputS3Url.includes('.heic?')) {
      const outputBuffer = await convert({
        buffer: originalImage, // the HEIC file buffer
        format: 'JPEG', // output format
        quality: 1, // the jpeg compression quality, between 0 and 1
      });
      originalImage = Buffer.from(outputBuffer);
    }
    const imageResizedWatermarked = await resizeImage(originalImage);
    await S3.writeGetObjectResponse({
      RequestRoute: outputRoute,
      RequestToken: outputToken,
      Body: imageResizedWatermarked,
    }).promise();

    return {
      statusCode: 200,
    };
  } catch (e) {
    console.error('Error', e);
    return {
      statusCode: 500,
    };
  }
};

// @ts-ignore
const handler = baseHandler;

module.exports.handler = handler;
