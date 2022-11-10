import {
  DataTypes,
} from 'sequelize'; // с помощью DataTypes описываются типы поля(String, Int,  Array ect.)
import sequelize from '../db';
import {
  PhotographerInstance, AlbumInstance, PhotoInstance, PhotoMiniInstance, PhotoMiniWaterMarkInstance,
  PersonInstance, AppUserInstance, UserOTPInstance, SelfieInstance,
  SelfieMiniInstance, UserAlbumInstance,
  Photo_PesronInstance,
} from './interfaces';

// Photographer
const Photographer = sequelize.define<PhotographerInstance>('photographer', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  index: { type: DataTypes.INTEGER, autoIncrement: true },
  login: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  fullName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE, allowNull: true },
  updatedAt: { type: DataTypes.DATE, allowNull: true },
});

// Album
const Album = sequelize.define<AlbumInstance>('album', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false },
  photographerId: { type: DataTypes.UUID, allowNull: false },
});

// Photo
const Photo = sequelize.define<PhotoInstance>('photo', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING },
  photoUrl: { type: DataTypes.STRING },
  photographerId: { type: DataTypes.UUID, allowNull: false },
  albumId: { type: DataTypes.UUID, allowNull: false },

});

// PhotoMini
const PhotoMini = sequelize.define<PhotoMiniInstance>('photoMini', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING },
  photoMiniUrl: { type: DataTypes.STRING },
  photographerId: { type: DataTypes.UUID, allowNull: false },
  albumId: { type: DataTypes.UUID, allowNull: false },
});

// PhotoMiniWaterMark
const PhotoMiniWaterMark = sequelize.define<PhotoMiniWaterMarkInstance>('photoMiniWaterMark', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING },
  photoMiniWaterMarkUrl: { type: DataTypes.STRING },
  photographerId: { type: DataTypes.UUID, allowNull: false },
  albumId: { type: DataTypes.UUID, allowNull: false },
});

// Person
const Person = sequelize.define<PersonInstance>('person', {
  id: {
    type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4,
  },
  phone: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING },
});

// Appuser
const AppUser = sequelize.define<AppUserInstance>('appUser', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING, unique: true },
  countryCode: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, unique: true },
  textMessagesNotification: { type: DataTypes.BOOLEAN },
  emailNotification: { type: DataTypes.BOOLEAN },
  unsubscribe: { type: DataTypes.BOOLEAN },
});

// UserOTP
const UserOTP = sequelize.define<UserOTPInstance>('userOTP', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  phone: { type: DataTypes.STRING, unique: true },
  otp: { type: DataTypes.STRING },
  otpCreated: { type: DataTypes.BIGINT },
});

// Selfie
const Selfie = sequelize.define<SelfieInstance>('selfie', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING },
  selfieUrl: { type: DataTypes.STRING },
  active: { type: DataTypes.BOOLEAN },
  appUserId: { type: DataTypes.UUID, allowNull: false },
});

// SelfieMini
const SelfieMini = sequelize.define<SelfieMiniInstance>('selfieMini', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING },
  selfieUrl: { type: DataTypes.STRING },
  active: { type: DataTypes.BOOLEAN },
  appUserId: { type: DataTypes.UUID, allowNull: false },
});

// UserAlbum
const UserAlbum = sequelize.define<UserAlbumInstance>('userAlbum', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID },
  userName: { type: DataTypes.STRING },
  albumId: { type: DataTypes.UUID },
  isPaid: { type: DataTypes.BOOLEAN },
});

// Photo_Person
const Photo_Person = sequelize.define<Photo_PesronInstance>('Photo_Person', {
  photoId: { type: DataTypes.UUID },
  personId: { type: DataTypes.UUID },
});

// Photographer & Album
Photographer.hasMany(
  Album,
  {
    sourceKey: 'id',
    foreignKey: 'photographerId',
    as: 'albums',
  },
);
Album.belongsTo(
  Photographer,
  {
    foreignKey: 'photographerId',
    as: 'photographer',
  },
);

// Photographer & Photo
Photographer.hasMany(Photo, {
  sourceKey: 'id',
  foreignKey: 'photographerId',
  as: 'photos',
});
Photo.belongsTo(Photographer, {
  foreignKey: 'photographerId',
  as: 'photographer',
});

Photographer.hasMany(PhotoMini);
PhotoMini.belongsTo(Photographer);

Photographer.hasMany(PhotoMiniWaterMark);
PhotoMiniWaterMark.belongsTo(Photographer);

Album.hasMany(Photo);
Photo.belongsTo(Album);

Album.hasMany(PhotoMini);
PhotoMini.belongsTo(Album);

Album.hasMany(PhotoMiniWaterMark);
PhotoMiniWaterMark.belongsTo(Album);

Photo.belongsToMany(Person, { through: 'Photo_Person' });
Person.belongsToMany(Photo, { through: 'Photo_Person' });

AppUser.hasMany(Selfie);
Selfie.belongsTo(AppUser);

AppUser.hasMany(SelfieMini);
SelfieMini.belongsTo(AppUser);

export {
  Photographer,
  Album,
  Photo,
  PhotoMini,
  PhotoMiniWaterMark,
  Person,
  AppUser,
  UserOTP,
  Selfie,
  SelfieMini,
  Photo_Person,
  UserAlbum,
};
