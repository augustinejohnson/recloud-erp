const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

const b2bStartStr = "{activeTab === 'b2b' && (\n              <div className=\"h-full bg-slate-50 p-0 overflow-hidden\">\n                <B2bOrderModule";
let b2bStartIdx = content.indexOf(b2bStartStr);
if (b2bStartIdx === -1) {
    b2bStartIdx = content.indexOf(b2bStartStr.replace(/\n/g, '\r\n'));
}

const b2bEndStr = "tenantConfig={tenantConfig}\n                />\n              </div>\n            )}";
let b2bEndIdx = content.indexOf(b2bEndStr, b2bStartIdx);
if (b2bEndIdx === -1) {
    b2bEndIdx = content.indexOf(b2bEndStr.replace(/\n/g, '\r\n'), b2bStartIdx);
}

if (b2bStartIdx !== -1 && b2bEndIdx !== -1) {
    const actualEndIdx = b2bEndIdx + (b2bEndStr.includes('\r\n') ? b2bEndStr.replace(/\n/g, '\r\n').length : b2bEndStr.length);
    content = content.substring(0, b2bStartIdx) + content.substring(actualEndIdx);
    fs.writeFileSync('src/App.jsx', content, 'utf8');
    console.log("SUCCESSFULLY REMOVED DUPLICATE B2B!");
} else {
    console.error("COULD NOT FIND B2B BLOCK!");
}
