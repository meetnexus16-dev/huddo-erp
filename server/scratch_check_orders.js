import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import './models/Order.js';
import './models/RetailSale.js';
import './models/Country.js';
import './models/State.js';
import './models/City.js';
import './models/User.js';

async function checkOrders() {
  await mongoose.connect(process.env.MONGO_URI);
  const Order = mongoose.model('Order');
  const RetailSale = mongoose.model('RetailSale');
  const Country = mongoose.model('Country');
  const State = mongoose.model('State');
  const City = mongoose.model('City');
  const User = mongoose.model('User');

  const orders = await Order.find().lean();
  console.log('Total Orders in DB:', orders.length);
  let totalOrderSum = 0;
  for (const o of orders) {
    console.log(`Order: ${o.order_number}, type: ${o.order_type}, grand_total: ${o.grand_total}, retailer: ${o.retailer}, seller_user: ${o.seller_user}, city: ${o.city_name || o.city}, state: ${o.state_name || o.state}, status: ${o.status}`);
    totalOrderSum += (o.grand_total || 0);
  }
  console.log('Sum of order grand_totals in paise:', totalOrderSum, 'in rupees:', totalOrderSum / 100);

  const sales = await RetailSale.find().lean();
  console.log('Total RetailSales in DB:', sales.length);
  for (const s of sales) {
    console.log(`RetailSale: ${s.sale_number}, grand_total: ${s.grand_total}, seller_user: ${s.seller_user}, city: ${s.city_name || s.city}, state: ${s.state_name || s.state}`);
  }

  process.exit(0);
}

checkOrders().catch(e => { console.error(e); process.exit(1); });
