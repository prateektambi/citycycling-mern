/**
 * Migration Script: Update Existing Users to New Schema
 * 
 * This script updates existing users in the database to match the new User model schema.
 * Run this once after deploying the new User model.
 * 
 * Usage: node server/migrations/updateUserSchema.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const migrateUsers = async () => {
  try {
    console.log('🔄 Starting user migration...');
    console.log('📡 Connecting to database...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Find all existing users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);

    if (users.length === 0) {
      console.log('ℹ️  No users found. Migration complete.');
      await mongoose.connection.close();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        let needsUpdate = false;

        // 1. Set role to 'admin' for existing users (they were created before user registration)
        if (!user.role || user.role === 'admin') {
          user.role = 'admin';
          needsUpdate = true;
        }

        // 2. Initialize profile if it doesn't exist
        if (!user.profile) {
          user.profile = {
            name: user.email.split('@')[0], // Use email prefix as placeholder name
            address: {}
          };
          needsUpdate = true;
          console.log(`   📝 Initialized profile for ${user.email}`);
        }

        // 3. Mark existing admin emails as verified
        if (user.emailVerified === undefined || user.emailVerified === null) {
          user.emailVerified = true;
          needsUpdate = true;
        }

        // 4. Set account status to active if not set
        if (!user.accountStatus) {
          user.accountStatus = 'active';
          needsUpdate = true;
        }

        // 5. Initialize preferences if not set
        if (!user.preferences) {
          user.preferences = {
            notifications: {
              email: true,
              sms: false,
              whatsapp: true
            },
            language: 'en'
          };
          needsUpdate = true;
        }

        // 6. Set terms accepted for existing users
        if (!user.termsAccepted) {
          user.termsAccepted = true;
          user.termsAcceptedAt = user.createdAt || new Date();
          needsUpdate = true;
        }

        if (!user.privacyAccepted) {
          user.privacyAccepted = true;
          user.privacyAcceptedAt = user.createdAt || new Date();
          needsUpdate = true;
        }

        // 7. Initialize login attempts if not set
        if (user.loginAttempts === undefined) {
          user.loginAttempts = 0;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await user.save();
          migratedCount++;
          console.log(`✅ Migrated: ${user.email} (${user.role})`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped: ${user.email} (already up to date)`);
        }

      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
};

// Run migration
migrateUsers();
