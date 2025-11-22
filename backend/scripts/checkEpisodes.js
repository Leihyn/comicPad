import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import Episode from '../src/models/Episode.js';
import Comic from '../src/models/Comic.js';

const checkEpisodes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const episodes = await Episode.find({}).populate('comic');
    const comics = await Comic.find({});

    console.log(`Found ${comics.length} comic(s):`);
    comics.forEach((comic, index) => {
      console.log(`\nComic ${index + 1}:`);
      console.log(`  ID: ${comic._id}`);
      console.log(`  Title: ${comic.title}`);
      console.log(`  Creator ID: ${comic.creator}`);
      console.log(`  Creator Account ID: ${comic.creatorAccountId}`);
    });

    console.log(`\n\nFound ${episodes.length} episode(s):\n`);

    episodes.forEach((episode, index) => {
      console.log(`Episode ${index + 1}:`);
      console.log(`  ID: ${episode._id}`);
      console.log(`  Title: ${episode.title}`);
      console.log(`  Comic: ${episode.comic?.title || episode.comic}`);
      console.log(`  Creator ID: ${episode.creator}`);
      console.log(`  Minted NFTs: ${episode.mintedNFTs.length}`);

      episode.mintedNFTs.forEach((nft, nftIndex) => {
        console.log(`    NFT ${nftIndex + 1}:`);
        console.log(`      Serial: ${nft.serialNumber}`);
        console.log(`      Owner: ${nft.owner}`);
        console.log(`      Minted At: ${nft.mintedAt}`);
      });
      console.log('');
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkEpisodes();
