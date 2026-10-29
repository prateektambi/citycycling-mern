import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimize() {
    console.log('--- Starting Image Optimization ---');
    
    // 1. Optimize client/public/images
    const publicImagesDir = path.join(__dirname, 'public', 'images');
    
    const heroConversions = [
        { src: 'home-hero.png', dest: 'home-hero.webp', width: 1920, quality: 80 },
        { src: 'hero.png', dest: 'hero.webp', width: 1920, quality: 80 },
        { src: 'delivery.png', dest: 'delivery.webp', width: 1200, quality: 80 }
    ];

    for (const item of heroConversions) {
        const srcPath = path.join(publicImagesDir, item.src);
        const destPath = path.join(publicImagesDir, item.dest);
        if (fs.existsSync(srcPath)) {
            const fileBuf = fs.readFileSync(srcPath);
            await sharp(fileBuf)
                .resize({ width: item.width, withoutEnlargement: true })
                .webp({ quality: item.quality, effort: 6 })
                .toFile(destPath);
            const oldSize = fileBuf.length;
            const newSize = fs.statSync(destPath).size;
            console.log(`${item.src} (${Math.round(oldSize/1024)} KB) -> ${item.dest} (${Math.round(newSize/1024)} KB)`);
        }
    }

    // 2. Optimize client/src/assets in place using buffer reads
    const assetsDir = path.join(__dirname, 'src', 'assets');
    const assetFiles = fs.readdirSync(assetsDir);

    for (const file of assetFiles) {
        if (file === 'HomePageHeroImage.png') {
            console.log('Skipping HomePageHeroImage.png (marked for removal)');
            continue;
        }

        const ext = path.extname(file).toLowerCase();
        const filePath = path.join(assetsDir, file);
        const fileBuf = fs.readFileSync(filePath);
        const oldSize = fileBuf.length;

        // Skip if already small (< 50KB)
        if (oldSize < 50 * 1024) {
            console.log(`Already small: ${file} (${Math.round(oldSize/1024)} KB)`);
            continue;
        }

        if (ext === '.jpg' || ext === '.jpeg') {
            const outBuf = await sharp(fileBuf)
                .resize({ width: 1000, withoutEnlargement: true })
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer();
            fs.writeFileSync(filePath, outBuf);
            const newSize = outBuf.length;
            console.log(`Optimized ${file}: ${Math.round(oldSize/1024)} KB -> ${Math.round(newSize/1024)} KB (-${Math.round((1 - newSize/oldSize)*100)}%)`);
        } else if (ext === '.png' && file !== 'logo.png') {
            const outBuf = await sharp(fileBuf)
                .resize({ width: 1000, withoutEnlargement: true })
                .png({ quality: 80, compressionLevel: 9 })
                .toBuffer();
            fs.writeFileSync(filePath, outBuf);
            const newSize = outBuf.length;
            console.log(`Optimized ${file}: ${Math.round(oldSize/1024)} KB -> ${Math.round(newSize/1024)} KB (-${Math.round((1 - newSize/oldSize)*100)}%)`);
        }
    }

    console.log('--- Done Optimization ---');
}

optimize().catch(console.error);
