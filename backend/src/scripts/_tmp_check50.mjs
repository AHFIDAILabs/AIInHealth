import mongoose from 'mongoose';
import 'dotenv/config';
await mongoose.connect(process.env.MONGO_URI);
const Registration = mongoose.model('Registration', new mongoose.Schema({}, { strict: false }), 'registrations');

const rows = await Registration.find({ type: 'attendee', discountPercent: 50 })
  .select('fullName email paymentStatus amountKobo paymentReference paidAt paymentMethod ticketCategory')
  .sort({ paymentStatus: 1 });

console.log('Total with discountPercent:50 ->', rows.length);
const byStatus = {};
for (const r of rows) byStatus[r.paymentStatus] = (byStatus[r.paymentStatus] || 0) + 1;
console.log('By status:', byStatus);

const paid = rows.filter((r) => r.paymentStatus === 'paid');
console.log('\nPaid at 50%:');
for (const r of paid) {
  console.log({
    name: r.fullName,
    email: r.email,
    amountKobo: r.amountKobo,
    reference: r.paymentReference,
    paidAt: r.paidAt,
    method: r.paymentMethod,
    ticketCategory: r.ticketCategory,
  });
}
await mongoose.disconnect();
