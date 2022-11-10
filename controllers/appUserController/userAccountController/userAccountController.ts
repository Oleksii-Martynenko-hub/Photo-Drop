import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import {
  AppUser, Person, SelfieMini, Photo_Person, Photo,
} from '../../../models/model';
import { PhotoInstance } from '../../../models/interfaces';

const generateJwt = (
  id: string,
  phone: string,
  countryCode:string,
):string => jwt.sign(
  {
    id,
    phone,
    countryCode,
  },
  process.env.SECRET_KEY!,
  {
    expiresIn: '24h',
  },
);

class UserAccountController {
  async createAppUser(req: Request, res: Response): Promise<void> {
    interface Phone {
      phone: string,
      countryCode: string
    }
    const { phone, countryCode }:Phone = req.body;
    if (phone) {
      try {
        const appUserExist = await AppUser.findOne({ where: { phone } });
        if (appUserExist) {
          const {
            id,
          } = appUserExist;

          const token = generateJwt(
            id,
            phone,
            countryCode,
          );
          res.json({ token });
          return;
        }
        try {
          const appUser = await AppUser.create({
            phone,
            countryCode,
            textMessagesNotification: true,
            emailNotification: true,
            unsubscribe: false,
          });
          const personExist = await Person.findOne({ where: { phone } });
          if (appUser && personExist === null) {
            const person = await Person.create({
              phone,
            });
            if (person) {
              const { id } = appUser;
              const token = generateJwt(
                id,
                phone,
                countryCode,
              );
              res.json({ token });
              return;
            }
          } else if (personExist) {
            const { id } = appUser;

            const token = generateJwt(
              id,
              phone,
              countryCode,
            );
            res.json({ token });

            // send notification to TG about users albums
            const photo_person = await Photo_Person.findAll({
              where:
          { personId: personExist.id },
            });
            const responseLength = photo_person.length;
            const promises:Promise<PhotoInstance | null >[] = [];
            if (responseLength > 0) {
              for (let i = 0; i < responseLength; i += 1) {
                const photo = Photo.findOne({ where: { id: photo_person[i].photoId } });
                if (photo) {
                  promises.push(photo);
                }
              }
            }
            const photos = await Promise.all(promises);
            const albumIds:string[] = [];
            for (let i = 0; i < photos.length; i += 1) {
              const albumId = photos[i]?.albumId;
              if (albumId) {
                albumIds.push(albumId);
              }
            }
            const uniqueAlbumIds = [...new Set(albumIds)];
            const startString = 'https://dev-photodrop-client.vercel.app/albums/';
            let finalString = '';
            uniqueAlbumIds.forEach((albumId) => {
              finalString += `${startString}${albumId}\n\n`;
            });

            const uri = encodeURI(`https://api.telegram.org/bot5620754624:AAECaxHAR6n5ITV14KjCpP-JPGCrFKcCRjY/sendMessage?chat_id=-678774504&text=PhotoDrop:${phone} your photos have dropped🔥\n\nCheck them out here:\n ${finalString}`);
            await axios({
              method: 'get',
              url: uri,
            });
            return;
          }
        } catch (e) {
          res.json({ messsage: e });
        }
        return;
      } catch (e) {
        res.status(500).json({ message: 'Error occured' });
        console.log(e);
      }
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    console.log(req);
    try {
      const userId = req.query.userId as string | undefined;
      if (req.headers.authorization !== undefined) {
        const token = req.headers.authorization.split(' ')[1]; // Bearer ddhcjhdsjcsdcs

        if (!token) {
          res.status(401).json({ errors: [{ msg: 'Not authorized' }] });
        }

        const payload = jwt.verify(token, process.env.SECRET_KEY!);
        if (userId && payload) {
          const user = await AppUser.findOne({ where: { id: userId } });
          const selfie = await SelfieMini.findOne({ where: { appUserId: userId, active: true } });
          if (user) {
            const {
              id, name, phone, countryCode, email,
              textMessagesNotification, emailNotification, unsubscribe,
            } = user;
            interface UserObject{
              id:string,
              name:string,
              phone: string,
              countryCode:string,
              email:string,
              textMessagesNotification:boolean,
              emailNotification:boolean,
              unsubscribe:boolean,
              selfieKey?:string | null
            }
            const userObject: UserObject = {
              id,
              name,
              phone,
              countryCode,
              email,
              textMessagesNotification,
              emailNotification,
              unsubscribe,
            };

            if (selfie) {
              userObject.selfieKey = selfie.name;
            } else {
              userObject.selfieKey = null;
            }
            res.json({ userObject });
            return;
          }
          res.status(401).json({ errors: [{ msg: 'User was not found' }] });
          return;
        }
        res.status(401).json({ errors: [{ msg: 'User id is not provided' }] });
      } else {
        res.status(401).json({ errors: [{ msg: 'Missing authorization token' }] });
        return;
      }
    } catch (e) {
      res.status(401).json({ errors: [{ msg: 'Not authorized' }] });
    }
  }

  async editName(req: Request, res: Response): Promise<void> {
    interface Body {
      id: string,
      name: string
    }
    const { id, name }:Body = req.body;
    if (id && name) {
      try {
        const user = await AppUser.findOne({ where: { id } });
        if (user) {
          // const { phone } = user;
          user.name = name;
          user.save();

          // const token = generateJwt(
          //   id,
          //   phone,
          // );
          // res.json({ token });
          res.json({ user });
          return;
        }
        res.send({ message: 'User not found' });
      } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Error occured' });
      }
    }
  }

  async editPhone(req: Request, res: Response): Promise<void> {
      interface Body {
      id: string,
      phone: string,
      countryCode: string
    }
      const { id, phone, countryCode }:Body = req.body;
      if (id && phone) {
        try {
          const user = await AppUser.findOne({ where: { id } });
          let oldPhone;
          if (user) {
            oldPhone = user.phone;
            user.phone = phone;
            user.countryCode = countryCode;
            await user.save();
            try {
              const person = await Person.findOne({ where: { phone: oldPhone } });
              if (person) {
                person.phone = phone;
                person.save();
              }
            } catch (e) {
              console.log(e);
            }
            const token = generateJwt(
              id,
              phone,
              countryCode,
            );
            res.json({ user, token });
            return;
          }
          res.send({ message: 'User not found' });
        } catch (e) {
          console.log(e);
          res.status(500).json({ message: 'Error occured' });
        }
      }
  }

  async editEmail(req: Request, res: Response): Promise<void> {
    interface Body {
      id: string,
      email: string
    }
    const { id, email }:Body = req.body;
    if (id && email) {
      try {
        const user = await AppUser.findOne({ where: { id } });
        if (user) {
          // const {
          //   phone,
          // } = user;
          user.email = email;
          user.save();

          // const token = generateJwt(
          //   id,
          //   phone,
          // );
          res.json({ user });
          return;
        }
        res.send({ message: 'User not found' });
      } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Error occured' });
      }
    }
  }

  async editNotificationSettings(req: Request, res: Response): Promise<void> {
    interface Body {
      id: string,
      textMessagesNotification: boolean,
      emailNotification: boolean,
      unsubscribe: boolean
    }
    const {
      id, textMessagesNotification, emailNotification, unsubscribe,
    }:Body = req.body;
    try {
      const user = await AppUser.findOne({ where: { id } });
      if (user) {
        // const { phone } = user;
        user.textMessagesNotification = textMessagesNotification;
        user.emailNotification = emailNotification;
        user.unsubscribe = unsubscribe;
        user.save();

        // const token = generateJwt(
        //   id,
        //   phone,
        // );
        res.json({ user });
        return;
      }
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'Error occured' });
    }
  }
}

export default new UserAccountController();
