require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');

(async()=>{
  await mongoose.connect(process.env.MONGODB_URI,{bufferCommands:false});
  const products=mongoose.connection.collection('products');

  const clearIds=['gplay-20','ml-diamonds-200','steam-15','tiktok-coins-100'];
  const clearRes=await products.updateMany({providerProductId:{$in:clearIds}},{$set:{providerProductId:''}});

  const verify=await products.find({$or:[{providerProductId:{$in:['101','119','47']}},{providerProductId:''}]},{projection:{providerProductId:1,category:1}}).toArray();

  await mongoose.disconnect();

  const syncRes=await axios.post('http://localhost:3000/api/sync/dailycard-prices',{}, {timeout:60000});

  console.log(JSON.stringify({
    clearedLegacyProviderIds:{matched:clearRes.matchedCount,modified:clearRes.modifiedCount},
    syncResult:syncRes.data,
    verifyCount:verify.length
  },null,2));
})().catch(async e=>{console.error(e?.response?.data||e.message||e);try{await mongoose.disconnect();}catch{}process.exit(1);});
