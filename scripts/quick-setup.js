// scripts/quick-setup.js - Automated setup helper
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import crypto from 'crypto';

const require = createRequire(import.meta.url);

function generateNextAuthSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function createEnvFile() {
  console.log('🔧 Creating .env.local file...');
  
  const envContent = `# NextAuth Configuration
NEXTAUTH_SECRET=${generateNextAuthSecret()}
NEXTAUTH_URL=http://localhost:3000

# Database Configuration
# Choose one option and uncomment it:

# Option 1: Local MongoDB (requires MongoDB to be running)
MONGODB_URI=mongodb://localhost:27017/landlord-app

# Option 2: MongoDB Atlas (recommended for beginners)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/landlord-app?retryWrites=true&w=majority

# Option 3: Docker MongoDB
# MONGODB_URI=mongodb://localhost:27017/landlord-app

# Development
NODE_ENV=development
`;

  if (existsSync('.env.local')) {
    console.log('⚠️  .env.local already exists. Creating .env.local.example instead');
    writeFileSync('.env.local.example', envContent);
    console.log('✅ Created .env.local.example - copy this to .env.local and customize');
  } else {
    writeFileSync('.env.local', envContent);
    console.log('✅ Created .env.local with generated NEXTAUTH_SECRET');
  }
}

function updatePackageJson() {
  console.log('📦 Updating package.json...');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    
    // Add type: module if not present
    if (!packageJson.type) {
      packageJson.type = 'module';
      console.log('✅ Added "type": "module" to package.json');
    }
    
    // Add test script if not present
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    if (!packageJson.scripts['test:setup']) {
      packageJson.scripts['test:setup'] = 'node scripts/test-setup.js';
      console.log('✅ Added test:setup script');
    }
    
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
  }
}

function checkDependencies() {
  console.log('📚 Checking required dependencies...');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const required = [
      'mongoose',
      'bcryptjs', 
      'next-auth',
      'next'
    ];
    
    const missing = required.filter(dep => !dependencies[dep]);
    
    if (missing.length > 0) {
      console.log('⚠️  Missing dependencies:', missing.join(', '));
      console.log('📥 Installing missing dependencies...');
      
      try {
        execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
        console.log('✅ Dependencies installed');
      } catch (error) {
        console.log('❌ Failed to install dependencies automatically');
        console.log(`💡 Please run: npm install ${missing.join(' ')}`);
      }
    } else {
      console.log('✅ All required dependencies are installed');
    }
    
  } catch (error) {
    console.error('❌ Error checking dependencies:', error.message);
  }
}

function setupMongoDB() {
  console.log('\n🗄️  MongoDB Setup Options:');
  console.log('Choose one of these options to set up MongoDB:\n');
  
  console.log('Option 1: 🐳 Docker (Easiest)');
  console.log('Run: docker run --name mongodb -d -p 27017:27017 mongo:latest');
  console.log('Then use: MONGODB_URI=mongodb://localhost:27017/landlord-app\n');
  
  console.log('Option 2: 🍺 Local Installation (macOS)');
  console.log('brew tap mongodb/brew');
  console.log('brew install mongodb-community');
  console.log('brew services start mongodb-community');
  console.log('Then use: MONGODB_URI=mongodb://localhost:27017/landlord-app\n');
  
  console.log('Option 3: ☁️  MongoDB Atlas (Recommended for beginners)');
  console.log('1. Visit: https://www.mongodb.com/atlas');
  console.log('2. Create a free account and cluster');
  console.log('3. Create a database user');
  console.log('4. Get your connection string');
  console.log('5. Update MONGODB_URI in .env.local\n');
}

function createBasicDirectories() {
  console.log('📁 Creating basic directory structure...');
  
  const dirs = [
    'scripts',
    'models', 
    'lib',
    'components',
    'hooks',
    'app/api/auth/[...nextauth]',
    'app/api/properties',
    'app/properties'
  ];
  
  dirs.forEach(dir => {
    try {
      execSync(`mkdir -p ${dir}`, { stdio: 'ignore' });
    } catch (error) {
      // Directory might already exist
    }
  });
  
  console.log('✅ Directory structure created');
}

function runQuickSetup() {
  console.log('🚀 Landlord App Quick Setup\n');
  
  try {
    createBasicDirectories();
    updatePackageJson();
    checkDependencies();
    createEnvFile();
    setupMongoDB();
    
    console.log('\n🎉 Quick setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. 🗄️  Set up MongoDB (see options above)');
    console.log('2. 📝 Update MONGODB_URI in .env.local if needed');
    console.log('3. 🧪 Run: npm run test:setup');
    console.log('4. 🚀 Run: npm run dev');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQuickSetup();
}

export { runQuickSetup };