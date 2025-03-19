const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function getFiles(dir, files = []) {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, files);
        } else {
            files.push(filePath);
        }
    });
    return files;
}

function encryptFile(filePath, publicKey) {
    const data = fs.readFileSync(filePath);
    const encryptedData = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha1"
    }, data);
    const encryptedFilePath = `${filePath}.encrypted`;
    fs.writeFileSync(encryptedFilePath, encryptedData);
    console.log(`Encrypted ${filePath} to ${encryptedFilePath}`);
}

// Main function
function main() {
    const publicKeyPath = path.join(process.env.HOME, '.ssh', 'id_rsa.pub');
    if (!fs.existsSync(publicKeyPath)) {
        console.error('Public key not found at ~/.ssh/id_rsa.pub');
        return;
    }

    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    const currentDir = process.cwd();
    const files = getFiles(currentDir);
    const privateFiles = files.filter(file => file.match(/\.private\./));
    console.log('%c Files to be encrypted:', 'color: green');
    console.log(privateFiles);
    privateFiles.forEach(file => encryptFile(file, publicKey));
}

main();