import dotenv from 'dotenv';
import express, { Express } from 'express';
import cors from 'cors';
import sequelize from './db';
import router from './routes/index';

dotenv.config();

const app: Express = express();
app.use(cors()); // чтобы можно было отправлять запросы с браузера
app.use(express.json()); // чтобы приложение могло парсить json формат
app.use('/api', router);

const { PORT } = process.env;
const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // будет сверят состояние базы данных со схемой данных
    // /force: true - deletes everything!!!
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (e) {
    console.log(e);
  }
};

start();
