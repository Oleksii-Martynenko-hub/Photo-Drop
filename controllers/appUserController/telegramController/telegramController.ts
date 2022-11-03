import { Request, Response } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { UserOTP } from '../../../models/model';

const bot = new TelegramBot(`${process.env.TELEGRAM_BOT_KEY!}`, { polling: true });

class TelegramController {
  async generateOTP(req: Request, res: Response): Promise<void> {
    interface Phone {
      phone: string
    }
    const { phone }: Phone = req.body;

    const OTP = `${Math.floor(Math.random() * (999999 - 100000) + 100000)}`;
    try {
      const phoneExist = await UserOTP.findOne({ where: { phone } });

      const sendOTPToTelegram = () => {
        bot.sendMessage(
          Number(process.env.TB_BOT_GROUP_CHAT_ID),
          `Your phone is: ${phone}\nYour OTP is: ${OTP}`,
        );
        res.send();
      };

      if (!phoneExist) {
        const otpCreated = Date.now();
        const newUser = await UserOTP.create({ phone, otp: OTP, otpCreated });
        newUser.save();
        res.send();
        sendOTPToTelegram();
        return;
      }

      if (phoneExist) {
        phoneExist.otp = OTP;
        phoneExist.otpCreated = Date.now();
        phoneExist.save();
        sendOTPToTelegram();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async checkOTP(req: Request, res: Response) {
    const { phone, otp } = req.query as { [key: string]: string };
    const userOTP = await UserOTP.findOne({ where: { phone, otp } });
    if (userOTP && userOTP.otpCreated && (Date.now() - userOTP.otpCreated > 30 * 1000)) {
      res.send();
    } else {
      res.status(401).json({ errors: [{ msg: 'Incorrect verification code, please check again.' }] });
    }
  }

  // sendPhotoNotification(req: Request, res: Response) {
  //   try {
  //     bot.sendMessage(Number(process.env.TB_BOT_GROUP_CHAT_ID), 'PhotoDrop: your photos have dropped🔥\n\nCheck the out here:\n https://userAppUrlWillBeSoonHere.com');
  //     // const uri = encodeURI(`https://api.telegram.org/bot5620754624:AAECaxHAR6n5ITV14KjCpP-JPGCrFKcCRjY/sendMessage?chat_id=-678774504&text=PhotoDrop:${phoneNumbers[i]} your photos have dropped🔥\n\nCheck them out here:\n https://dev-photodrop-client.vercel.app/dashboard/album-id-${albumid}`);
  //     res.send();
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }
}

export default new TelegramController();

// import { Request, Response } from 'express';

// import TelegramBot from 'node-telegram-bot-api';

// const bot = new TelegramBot(`${process.env.TELEGRAM_BOT_KEY!}`, { polling: true });

// class TelegramController {
//   generateOTP(req: Request, res: Response): void {
//     interface Phone {
//       phone: string
//     }
//     const { phone }: Phone = req.body;

//     const OTP = `${Math.floor(Math.random() * (999999 - 100000) + 100000)}`;

//     try {
//       bot.sendMessage(
//         Number(process.env.TB_BOT_GROUP_CHAT_ID),
//         `Your phone is: ${phone}\nYour OTP is: ${OTP}`,
//       );
//       res.json({ OTP });
//     } catch (e) {
//       console.log(e);
//     }
//   }

//   sendPhotoNotification(req: Request, res: Response) {
//     try {
//       bot.sendMessage(Number(process.env.TB_BOT_GROUP_CHAT_ID), 'PhotoDrop: your photos have dropped🔥\n\nCheck the out here:\n https://userAppUrlWillBeSoonHere.com');

//       res.send();
//     } catch (e) {
//       console.log(e);
//     }
//   }
// }

// export default new TelegramController();
