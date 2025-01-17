import { Request, Response } from 'express';

import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(`${process.env.TELEGRAM_BOT_KEY!}`, { polling: true });

class TelegramController {
  generateOTP(req: Request, res: Response): void {
    interface Phone {
      phone: string
    }
    const { phone }: Phone = req.body;

    const OTP = `${Math.floor(Math.random() * (999999 - 100000) + 100000)}`;

    try {
      bot.sendMessage(
        Number(process.env.TB_BOT_GROUP_CHAT_ID),
        `Your phone is: ${phone}\nYour OTP is: ${OTP}`,
      );
      res.json({ OTP });
    } catch (e) {
      console.log(e);
    }
  }

  sendPhotoNotification(req: Request, res: Response) {
    try {
      bot.sendMessage(Number(process.env.TB_BOT_GROUP_CHAT_ID), 'PhotoDrop: your photos have dropped🔥\n\nCheck the out here:\n https://userAppUrlWillBeSoonHere.com');

      res.send();
    } catch (e) {
      console.log(e);
    }
  }
}

export default new TelegramController();
