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

let count = 0;

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Strict replacement of 'Gitroom' and "Gitroom" exactly, 
    // and 'Postiz', "Postiz", so we don't accidentally break URLs
    // We also want to replace the word Postiz and Gitroom if it's inside text.
    
    // Careful global replacements using boundaries so we don't break imports
    content = content.replace(/'Gitroom'/g, "'AppSwifts'");
    content = content.replace(/"Gitroom"/g, '"AppSwifts"');
    content = content.replace(/>Gitroom</g, '>AppSwifts<');
    content = content.replace(/ Gitroom /g, ' AppSwifts ');
    content = content.replace(/Gitroom\?/g, 'AppSwifts?');
    content = content.replace(/Gitroom/g, 'AppSwifts'); // Replacing all capitalized Gitroom

    // Postiz replacements
    content = content.replace(/'Postiz'/g, "'SwiftsAI'");
    content = content.replace(/"Postiz"/g, '"SwiftsAI"');
    content = content.replace(/>Postiz</g, '>SwiftsAI<');
    content = content.replace(/ Postiz /g, ' SwiftsAI ');
    content = content.replace(/Postiz\?/g, 'SwiftsAI?');
    content = content.replace(/Postiz/g, 'SwiftsAI');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Updated: " + filePath);
        count++;
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

console.log("Total files updated: " + count);
