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
      };

      if (!phoneExist) {
        const otpCreated = Date.now();
        const newUser = await UserOTP.create({ phone, otp: OTP, otpCreated });
        newUser.save();
        sendOTPToTelegram();
        res.send();
        return;
      }

      if (phoneExist) {
        phoneExist.otp = OTP;
        phoneExist.otpCreated = Date.now();
        phoneExist.save();
        sendOTPToTelegram();
        res.send();
        return;
      }
    } catch (e) {
      console.log(e);
    }
  }

  async checkOTP(req: Request, res: Response) {
    const { phone, otp } = req.query as { [key: string]: string };
    const userOTP = await UserOTP.findOne({ where: { phone, otp } });
    const otpLifeTime = 30 * 1000;
    let timevalidity;
    if (userOTP && userOTP.otpCreated) {
      timevalidity = Date.now() - userOTP.otpCreated < otpLifeTime;
    }

    if (userOTP && userOTP.otpCreated) {
      console.log(Date.now() - userOTP.otpCreated);
    }
    if (userOTP && userOTP.otpCreated && timevalidity) {
      res.send();
    } else {
      res.status(401).json({ errors: [{ msg: 'Incorrect verification code, please check again.' }] });
    }
  }
}

export default new TelegramController();
