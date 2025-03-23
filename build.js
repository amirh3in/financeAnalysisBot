const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Run the tsup command to build the project
execSync('tsup', { stdio: 'inherit' });

// Define the source and destination directories
const distDir = path.join(__dirname, 'dist');
const buildDir = path.join(distDir, 'app');

// Ensure the build directory exists
fs.ensureDirSync(buildDir);

// Move the built files to dist/dist
fs.readdirSync(distDir).forEach(file => {
    const srcPath = path.join(distDir, file);
    const destPath = path.join(buildDir, file);
    if (file !== 'app') {
        fs.moveSync(srcPath, destPath, { overwrite: true });
    }
});

// Copy the specified folders to the dist directory
const foldersToCopy = ['generated', 'prisma', '.env', 'package.json'];
foldersToCopy.forEach(folder => {
    const srcPath = path.join(__dirname, folder);
    const destPath = path.join(distDir, folder);
    fs.copySync(srcPath, destPath, { overwrite: true });
});

console.log('Build process completed successfully.');
