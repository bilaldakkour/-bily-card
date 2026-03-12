require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const mongoose = require('mongoose');

const email = (process.argv[2] || '').trim().toLowerCase();

if (!email) {
  console.error('Usage: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is missing in .env.local');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(uri);

    const users = mongoose.connection.collection('users');
    const user = await users.findOne({ email });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(2);
    }

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          role: 'admin',
          isBlocked: false,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`Admin role granted to: ${email}`);
  } catch (error) {
    console.error('Failed to make admin:', error.message || error);
    process.exit(3);
  } finally {
    await mongoose.disconnect();
  }
}

run();
