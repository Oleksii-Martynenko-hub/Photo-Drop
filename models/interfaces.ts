// https://dev.to/jctaveras/sequelize-typescript-what-you-need-to-know-41mj

import { Optional, Model } from 'sequelize';
// Photographer
interface PhotographerAttributes {
  id: string;
  index: number;
  login: string;
  password: string;
  email: string;
  fullName: string,
  createdAt: string,
  updatedAt: string
}

interface PhotographerCreationAttributes extends Optional<PhotographerAttributes, 'id' | 'fullName' | 'email' |'index' > { }
interface PhotographerInstance extends Model<PhotographerAttributes,
  PhotographerCreationAttributes>, PhotographerAttributes { }

// Album
interface AlbumAttributes {
  id: string;
  name: string,
  location: string,
  date: string,
  photographerId:string
}

interface AlbumCreationAttributes extends Optional<AlbumAttributes, 'id' > { }
interface AlbumInstance extends Model<AlbumAttributes, AlbumCreationAttributes>,
  AlbumAttributes {}

// Photo

interface PhotoAttributes {
  id: string;
  name: string,
  photoUrl: string,
  photographerId: string
  albumId:string
}

interface PhotoCreationAttributes extends Optional<PhotoAttributes, 'id'> { }
interface PhotoInstance extends Model<PhotoAttributes, PhotoCreationAttributes>,
  PhotoAttributes {}

// PhotoMini

interface PhotoMiniAttributes {
  id: string;
  name: string,
  photoMiniUrl: string
  albumId: string,
  photographerId:string
}
interface PhotoMiniCreationAttributes extends Optional<PhotoMiniAttributes, 'id'> { }
interface PhotoMiniInstance extends Model<PhotoMiniAttributes, PhotoMiniCreationAttributes>,
  PhotoAttributes {}

// PhotoMiniWaterMark

interface PhotoMiniWaterMarkAttributes {
  id: string;
  name: string,
  albumId: string,
  photographerId: string,
  photoMiniWaterMarkUrl:string
}

interface PhotoMiniWaterMarkCreationAttributes extends Optional<PhotoMiniWaterMarkAttributes, 'id'> { }
interface PhotoMiniWaterMarkInstance extends
  Model<PhotoMiniWaterMarkAttributes, PhotoMiniWaterMarkCreationAttributes>,
  PhotoMiniWaterMarkAttributes {}

// Person
interface PersonAttributes {
  id: string;
  phone: string,
  name: string,
  // addPhoto: any
}

interface PersonCreationAttributes extends Optional<PersonAttributes, 'id' | 'name' > { }
interface PersonInstance extends
  Model<PersonAttributes, PersonCreationAttributes>,
  PersonAttributes { }

// AppUser

interface AppUserAttributes {
  id: string,
  name: string,
  phone: string,
  countryCode:string,
  email: string,
  textMessagesNotification: boolean,
  emailNotification: boolean,
  unsubscribe: boolean
}

interface AppUserCreationAttributes extends Optional<AppUserAttributes, 'id' | 'name' | 'email'> { }
interface AppUserInstance extends
  Model<AppUserAttributes, AppUserCreationAttributes>,
  AppUserAttributes { }

// UserOTP

interface UserOTPAttributes {
  id: string,
  phone: string,
  otp: string,
  otpCreated: number
}

interface UserOTPCreationAttributes extends Optional<UserOTPAttributes, 'id' | 'otpCreated'> { }
interface UserOTPInstance extends
  Model<UserOTPAttributes, UserOTPCreationAttributes>,
  UserOTPAttributes { }

// Selfie

interface SelfieAttributes {
  id: string,
  name: string,
  selfieUrl: string,
  active: boolean,
  appUserId:string
}

interface SelfieCreationAttributes extends Optional<SelfieAttributes, 'id'> { }
interface SelfieInstance extends
  Model<SelfieAttributes, SelfieCreationAttributes>,
  SelfieAttributes { }

// SelfirMini
interface SelfieMiniAttributes {
  id: string,
  name: string,
  selfieUrl: string,
  active: boolean
  appUserId:string
}
interface SelfieMiniCreationAttributes extends Optional<SelfieMiniAttributes, 'id'> { }
interface SelfieMiniInstance extends
  Model<SelfieMiniAttributes, SelfieMiniCreationAttributes>,
  SelfieMiniAttributes { }

// UserAlbum
interface UserAlbumAttributes {
 id: string,
  userId: string,
  userName: string,
  albumId: string,
  isPaid: boolean,
}

interface UserAlbumCreationAttributes extends Optional<UserAlbumAttributes, 'id' | 'userName'> { }
interface UserAlbumInstance extends
  Model<UserAlbumAttributes, UserAlbumCreationAttributes>,
  UserAlbumAttributes { }

// Photo_Pesron
interface Photo_PesronAttributes {
 photoId: string,
  personId: string,
}

interface Photo_PesronInstance extends
  Model<Photo_PesronAttributes>,
  Photo_PesronAttributes { }

export {
  PhotographerInstance,
  AlbumInstance,
  PhotoInstance,
  PhotoMiniInstance,
  PhotoMiniWaterMarkInstance,
  PersonInstance,
  AppUserInstance,
  UserOTPInstance,
  SelfieInstance,
  SelfieMiniInstance,
  UserAlbumInstance,
  Photo_PesronInstance,
};
