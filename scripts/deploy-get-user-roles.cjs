const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const lambda = new AWS.Lambda({ region: 'us-east-1' });

async function zipLambda(functionDir) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(__dirname, 'lambda.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(functionDir, false);
    archive.finalize();
  });
}

async function deployFunction() {
  console.log('📦 Deploying get-user-roles Lambda function...\n');

  const functionName = 'mentalspace-get-user-roles';
  const functionDir = path.join(__dirname, '..', 'infrastructure', 'lambda', 'get-user-roles');

  // Create zip file
  console.log('📦 Creating deployment package...');
  await zipLambda(functionDir);

  const zipPath = path.join(__dirname, 'lambda.zip');
  const zipBuffer = fs.readFileSync(zipPath);

  try {
    // Update function code
    console.log('🚀 Updating Lambda function code...');
    await lambda.updateFunctionCode({
      FunctionName: functionName,
      ZipFile: zipBuffer
    }).promise();

    console.log('✅ Lambda function updated successfully!');

    // Wait for update to complete
    console.log('⏳ Waiting for function update to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n✅ Deployment complete!');
    console.log('\nNext steps:');
    console.log('1. Refresh your browser');
    console.log('2. The sidebar should now show all menu items');

  } catch (error) {
    console.error('❌ Error deploying Lambda:', error);
    throw error;
  } finally {
    // Clean up zip file
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }
}

deployFunction().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
