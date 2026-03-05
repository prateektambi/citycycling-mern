const { createClient } = require('@sanity/client');
const fs = require('fs');
const https = require('https');
const path = require('path');

// This requires a token with Editor or Admin permissions
const token = process.env.SANITY_AUTH_TOKEN;

if (!token) {
    console.error("❌ ERROR: SANITY_AUTH_TOKEN environment variable is missing.");
    console.error("Please run this script like this: SANITY_AUTH_TOKEN=your_token node seed.js");
    process.exit(1);
}

const client = createClient({
    projectId: 'bdo5kfci',
    dataset: 'production',
    useCdn: false,
    apiVersion: '2023-05-03',
    token: token,
});

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        });
    });
};

const uploadImageToSanity = async (imageUrl, filename) => {
    console.log(`Downloading dummy image: ${filename}...`);
    const tempPath = path.join(__dirname, filename);
    await downloadImage(imageUrl, tempPath);

    console.log(`Uploading ${filename} to Sanity...`);
    const asset = await client.assets.upload('image', fs.createReadStream(tempPath), {
        filename: filename
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);
    return asset._id;
};

const categories = []; // already created
const articles = [
    {
        title: "From Couch to 50km: Sarah's Journey",
        slug: "from-couch-to-50km-sarahs-journey",
        catId: "cat-community",
        image: "https://fastly.picsum.photos/id/15/1200/800.jpg?hmac=X8i920R106vO-Gq950005wQ-8r40rO3F30C_x4pA",
        excerpt: "Read about how local rider Sarah went from not owning a bike to completing her first 50km charity ride in just 3 months.",
        bodyText: "When Sarah first walked into the store, she hadn't ridden a bike in 15 years...\n\nWith consistency and the right saddle, she conquered the hills and raised $5,000 for charity!"
    },
    {
        title: "Winter Operating Hours",
        slug: "winter-operating-hours",
        catId: "cat-news",
        image: "https://fastly.picsum.photos/id/16/1200/800.jpg?hmac=9e11500wX14c81k45X80rO-r4pG0r3F106vA3qC",
        excerpt: "Please note our updated shop operating and rental hours for the upcoming winter season.",
        bodyText: "As the days get shorter, so do our hours. We will now be closing at 6:00 PM on weekdays...\n\nHowever, our weekend group rides will continue as scheduled, rain or shine!"
    }
];

const seedData = async () => {
    try {
        console.log("🚀 Starting Sanity Seeding Process...");

        // 1. Create Categories
        console.log("\n📦 Creating Categories...");
        for (const cat of categories) {
            await client.createIfNotExists(cat);
            console.log(`✅ Created category: ${cat.title}`);
        }

        // 2. Create Posts
        console.log("\n📝 Creating Articles (This will take a minute as it downloads images)...");
        for (const [index, article] of articles.entries()) {
            const filename = `image-${index}.jpg`;
            const imageAssetId = await uploadImageToSanity(article.image, filename);

            const doc = {
                _type: 'post',
                title: article.title,
                slug: { _type: 'slug', current: article.slug },
                excerpt: article.excerpt,
                publishedAt: new Date().toISOString(),
                categories: [{ _type: 'reference', _ref: article.catId, _key: `ref-${index}` }],
                mainImage: {
                    _type: 'image',
                    asset: { _type: "reference", _ref: imageAssetId }
                },
                body: [
                    {
                        _type: 'block',
                        style: 'normal',
                        markDefs: [],
                        children: [{ _type: 'span', marks: [], text: article.bodyText }]
                    }
                ]
            };

            await client.create(doc);
            console.log(`✅ Created article: ${article.title}`);
        }

        console.log("\n🎉 ALL DONE! Your blog is now populated with beautiful sample articles!");
    } catch (err) {
        console.error("❌ Seeding Failed:", err.message);
    }
};

seedData();
