import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Node.js SRV lookup failures (querySrv ECONNREFUSED) with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('[Database] Custom DNS setup skipped:', dnsErr.message);
}

const connectDB = async () => {
  try {
    let connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/huddo-erp';
    if (connStr === 'your_mongodb_connection_string') {
      connStr = 'mongodb://localhost:27017/huddo-erp';
    }
    console.log(`[Database] Connecting to: ${connStr.replace(/:([^@]+)@/, ':****@')}`);
    
    const conn = await mongoose.connect(connStr);
    
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    
    // Listen for database errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`[Database] Connection error: ${err.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting reconnect...');
    });
  } catch (error) {
    console.error(`[Database] Connection failure: ${error.message}`);
    console.warn('[Database] Running without active MongoDB connection. Database features will be unavailable.');
  }
};

export default connectDB;
