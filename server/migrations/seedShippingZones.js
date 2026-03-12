/**
 * Seed script for shipping zones.
 * Run: node migrations/seedShippingZones.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const ShippingZone = require('../models/ShippingZone');

const MONGO_URI = process.env.MONGO_URI;

const shippingZones = [
    { pincode: "560103", areas: "Devarabeesanahalli, Bellandur, Panathur", slab: "0–5 km", cost: 250 },
    { pincode: "560037", areas: "Marathahalli, Kundalahalli, AECS Layout", slab: "0–5 km", cost: 250 },
    { pincode: "560035", areas: "Sarjapur Road, Kaikondrahalli, Carmelaram", slab: "0–5 km", cost: 250 },
    { pincode: "560102", areas: "HSR Layout (Sectors 1-7)", slab: "5–10 km", cost: 350 },
    { pincode: "560034", areas: "Koramangala, Iblur, Agara", slab: "5–10 km", cost: 350 },
    { pincode: "560048", areas: "Mahadevapura, Hoodi, Graphite India", slab: "5–10 km", cost: 350 },
    { pincode: "560068", areas: "Bommanahalli, Silk Board, Madivala", slab: "5–10 km", cost: 350 },
    { pincode: "560087", areas: "Varthur, Gunjur", slab: "5–10 km", cost: 350 },
    { pincode: "560066", areas: "Whitefield, Hope Farm, ITPL", slab: "10–15 km", cost: 450 },
    { pincode: "560017", areas: "Old Airport Road, Vimanapura, HAL", slab: "10–15 km", cost: 450 },
    { pincode: "560100", areas: "Electronic City Phase 1", slab: "10–15 km", cost: 450 },
    { pincode: "560038", areas: "Indiranagar, Domlur", slab: "10–15 km", cost: 450 },
    { pincode: "560001", areas: "MG Road, Shivaji Nagar, Brigade Road", slab: "10–15 km", cost: 450 },
    { pincode: "560076", areas: "Bannerghatta Road, BTM Layout 2nd Stage", slab: "10–15 km", cost: 450 },
    { pincode: "560011", areas: "Jayanagar", slab: "10–15 km", cost: 450 },
    { pincode: "560093", areas: "CV Raman Nagar, Kaggadasapura", slab: "10–15 km", cost: 450 },
    { pincode: "560016", areas: "Ramamurthy Nagar, KR Puram", slab: "10–15 km", cost: 450 },
    { pincode: "560025", areas: "Museum Road, Richmond Town", slab: "10–15 km", cost: 450 },
    { pincode: "560024", areas: "Hebbal, RT Nagar", slab: "15–25 km", cost: 650 },
    { pincode: "560064", areas: "Yelahanka, Jakkur", slab: "15–25 km", cost: 650 },
    { pincode: "560010", areas: "Rajajinagar, Basaveshwaranagar", slab: "15–25 km", cost: 650 },
    { pincode: "560022", areas: "Yeshwanthpur, Peenya", slab: "15–25 km", cost: 650 },
    { pincode: "560060", areas: "Kengeri, Mysore Road", slab: "15–25 km", cost: 650 },
    { pincode: "560085", areas: "Banashankari 3rd Stage, Girinagar", slab: "15–25 km", cost: 650 },
    { pincode: "560043", areas: "Banaswadi, Kalyan Nagar, Horamavu", slab: "15–25 km", cost: 650 },
    { pincode: "560092", areas: "Sahakar Nagar, Amruthahalli", slab: "15–25 km", cost: 650 },
    { pincode: "560067", areas: "Kadugodi, Belathur", slab: "15–25 km", cost: 650 },
    { pincode: "560004", areas: "Basavanagudi", slab: "15–25 km", cost: 650 },
    { pincode: "560094", areas: "RMV 2nd Stage, New BEL Road", slab: "15–25 km", cost: 650 },
    { pincode: "560099", areas: "Electronic City Phase 2, Bommasandra", slab: "15–25 km", cost: 650 },
    { pincode: "560063", areas: "Yelahanka New Town", slab: "25–35 km", cost: 750 },
    { pincode: "560097", areas: "Vidyaranyapura", slab: "25–35 km", cost: 750 },
    { pincode: "560091", areas: "Viswaneedam, Magadi Road", slab: "25–35 km", cost: 750 },
    { pincode: "560058", areas: "Peenya Industrial Area", slab: "25–35 km", cost: 750 },
    { pincode: "560083", areas: "Bannerghatta Village, Gottigere", slab: "25–35 km", cost: 750 },
    { pincode: "562157", areas: "Hoskote (Start)", slab: "25–35 km", cost: 750 },
    { pincode: "560300", areas: "Devanahalli / Airport Area", slab: "25–35 km", cost: 750 },
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        let upserted = 0;
        for (const zone of shippingZones) {
            await ShippingZone.findOneAndUpdate(
                { pincode: zone.pincode },
                zone,
                { upsert: true, new: true }
            );
            upserted++;
        }

        console.log(`✅ Seeded ${upserted} shipping zones successfully.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seed();
