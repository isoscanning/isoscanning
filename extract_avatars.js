const fs = require('fs');
const path = require('path');

const inputPath = 'C:/Users/ander/.gemini/antigravity/brain/3ff207e9-a524-49d0-9a9c-05971e803c2c/.system_generated/steps/32/output.txt';
const outputDir = path.join(__dirname, 'public', 'testimonials');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

let content = fs.readFileSync(inputPath, 'utf-8');
content = JSON.parse(content).result;
const match = content.match(/<untrusted-data-[^>]+>\n([\s\S]*?)\n<\/untrusted-data-[^>]+>/);

if (match && match[1]) {
    const users = JSON.parse(match[1]);
    const results = [];

    users.forEach(user => {
        let avatarPath = user.avatar_url;
        if (avatarPath && avatarPath.startsWith('data:image')) {
            const base64Data = avatarPath.replace(/^data:image\/\w+;base64,/, "");
            const ext = avatarPath.substring(avatarPath.indexOf('/') + 1, avatarPath.indexOf(';'));
            const filename = `${user.display_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext === 'jpeg' ? 'jpg' : ext}`;
            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, base64Data, 'base64');
            avatarPath = `/testimonials/${filename}`;
        }

        results.push({
            id: user.id,
            name: user.display_name,
            specialty: user.specialty,
            avatar: avatarPath
        });
    });

    console.log(JSON.stringify(results, null, 2));
} else {
    console.log("No data found");
}
