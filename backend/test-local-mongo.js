import mongoose from 'mongoose';

console.log('Testing local MongoDB connection...\n');

mongoose.connect('mongodb://localhost:27017/hederaPadDB', {
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ SUCCESS! Local MongoDB is running!');
  console.log('✅ Your demo is ready!');
  process.exit(0);
})
.catch((error) => {
  console.log('❌ MongoDB not running yet');
  console.log('Error:', error.message);
  console.log('\n💡 Make sure MongoDB service is started');
  console.log('   Run: net start MongoDB');
  process.exit(1);
});
