import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import './models/Country.js';
import './models/State.js';
import './models/City.js';
import './models/User.js';

async function checkManagers() {
  await mongoose.connect(process.env.MONGO_URI);
  const Country = mongoose.model('Country');
  const State = mongoose.model('State');
  const City = mongoose.model('City');
  const User = mongoose.model('User');

  const countries = await Country.find().populate('manager');
  console.log('--- COUNTRIES ---');
  for (const c of countries) {
    console.log(`Country: ${c.name} (${c._id}), Manager: ${c.manager ? `${c.manager.name} (${c.manager._id})` : 'None'}`);
  }

  const states = await State.find().populate('manager').populate('country');
  console.log('--- STATES ---');
  for (const s of states) {
    console.log(`State: ${s.name} (${s._id}), Country: ${s.country?.name}, Manager: ${s.manager ? `${s.manager.name} (${s.manager._id})` : 'None'}`);
  }

  const cities = await City.find().populate('manager').populate('state');
  console.log('--- CITIES ---');
  for (const ci of cities) {
    console.log(`City: ${ci.name} (${ci._id}), State: ${ci.state?.name}, Manager: ${ci.manager ? `${ci.manager.name} (${ci.manager._id})` : 'None'}`);
  }

  const users = await User.find({ roleName: { $in: ['CountryManager', 'StateManager', 'CityManager', 'TeamMember'] } });
  console.log('--- USERS WITH ROLES ---');
  for (const u of users) {
    console.log(`User: ${u.name} (${u._id}), Role: ${u.roleName}, Country: ${u.country}, State: ${u.state}, City: ${u.city}`);
  }

  process.exit(0);
}

checkManagers().catch(e => { console.error(e); process.exit(1); });
