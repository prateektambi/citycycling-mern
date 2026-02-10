require('dotenv').config();
const https = require('https');

const deployUrl = process.env.RENDER_DEPLOY_HOOK;

if (!deployUrl) {
    console.error('Error: RENDER_DEPLOY_HOOK environment variable is not set.');
    process.exit(1);
}

console.log('Triggering Render deployment...');

https.get(deployUrl, (res) => {
  if (res.statusCode === 200) {
    console.log('Deployment triggered successfully! Render will now pull the latest commit from your repository.');
  } else {
    console.error(`Failed to trigger deployment. Status Code: ${res.statusCode}`);
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  }
}).on('error', (e) => {
  console.error(`Error: ${e.message}`);
});
