import AWS from 'aws-sdk';
import axios from 'axios';
import Jimp from 'jimp';
import * as photoDropLogo from './PhotoDropLogo.png';

const S3 = new AWS.S3();

const addWatermark = async (image: any) => {
  if (!image) {
    return;
  }
  const logoImage = await Jimp.read('./d8885004a7cbbc5c2de6177b99b30489.png');
  const imageToReturn = await Jimp.read(image);
  imageToReturn.composite(
    logoImage,
    imageToReturn.bitmap.width / 2 - logoImage.bitmap.width / 2,
    imageToReturn.bitmap.height / 2 - logoImage.bitmap.height / 2,
  );
  return imageToReturn.getBufferAsync(Jimp.MIME_PNG);
};

module.exports.handler = async (event:any, context:any) => {
  if (!photoDropLogo) {
    return;
  }
  try {
    // Context given by s3-object-lambda event trigger.
    /* inputS3Url is a presigned URL that the function can use to download
    the original object from the supporting Access Point */

    console.log('Start Event', event);
    const { outputRoute, outputToken, inputS3Url } = event.getObjectContext || {};

    const { data: originalImage } = await axios.get(inputS3Url, { responseType: 'arraybuffer' });
    const imageWithWatermark = await addWatermark(originalImage);
    console.log('Return imageWithWatermark');
    await S3.writeGetObjectResponse({
      RequestRoute: outputRoute,
      RequestToken: outputToken,
      Body: imageWithWatermark,
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
