import mongoose from 'mongoose';
import 'dotenv/config';
import { Registration } from '../models/Registration.model.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const docs = await Registration.find({ ticketCategory: 'accredited_media', status: 'confirmed' })
    .select('fullName email phone')
    .sort({ fullName: 1 });
  console.log('total confirmed media:', docs.length);
  console.log('Name\tEmail\tPhone');
  for (const d of docs) {
    console.log(`${d.fullName ?? ''}\t${d.email ?? ''}\t${d.phone ?? ''}`);
  }
  await mongoose.disconnect();
};
run();
