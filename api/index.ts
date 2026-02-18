import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app';
import { connectDatabase } from '../src/config/database';

// Cache DB connection across warm invocations
let isConnected = false;

const handler = async (req: any, res: any) => {
  if (!isConnected) {
    await connectDatabase();
    isConnected = true;
  }
  return app(req, res);
};

export default handler;
