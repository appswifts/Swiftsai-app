const fs = require('fs');
const path = require('path');

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.json')) {
                callback(filePath);
            }
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Revert AppSwifts back to Gitroom as requested
    content = content.replace(/'AppSwifts'/g, "'Gitroom'");
    content = content.replace(/"AppSwifts"/g, '"Gitroom"');
    content = content.replace(/>AppSwifts</g, '>Gitroom<');
    content = content.replace(/ AppSwifts /g, ' Gitroom ');
    content = content.replace(/AppSwifts\?/g, 'Gitroom?');
    content = content.replace(/AppSwifts/g, 'Gitroom');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Reverted: " + filePath);
    }
}

let dirs = [
    path.join(__dirname, 'apps/frontend/src/app'),
    path.join(__dirname, 'apps/frontend/src/components'),
    path.join(__dirname, 'libraries/react-shared-libraries/src/translation/locales')
];

dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        walkSync(dir, replaceInFile);
    }
});
