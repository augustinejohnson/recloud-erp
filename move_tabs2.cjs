const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. We know the second block starts with `{activeTab === 'accounting' && (` and has ErrorBoundary.
const startMarker = "{activeTab === 'accounting' && (\n            <div className=\"h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] w-full bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200\">\n              <ErrorBoundary><AccountingModule";
let startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    // try with \r\n
    startIndex = content.indexOf(startMarker.replace(/\n/g, '\r\n'));
}

const endMarker = "tenantConfig={tenantConfig}\n              /></ErrorBoundary>\n            </div>\n          )}";
let endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) {
    endIndex = content.indexOf(endMarker.replace(/\n/g, '\r\n'), startIndex);
}

if (startIndex === -1 || endIndex === -1) {
    console.error("COULD NOT FIND BOTTOM BLOCKS!");
    process.exit(1);
}

const actualEndIndex = endIndex + (endMarker.includes('\r\n') ? endMarker.replace(/\n/g, '\r\n').length : endMarker.length);
const bottomBlock = content.substring(startIndex, actualEndIndex);

// Remove bottom block
content = content.substring(0, startIndex) + content.substring(actualEndIndex);

// 2. Remove the duplicate accounting, analytics, b2b (first block)
const firstBlockStartStr = "{activeTab === 'accounting' && (\n              <div className=\"h-full bg-slate-50 p-0 overflow-hidden\">\n                <AccountingModule";
let firstBlockStartIndex = content.indexOf(firstBlockStartStr);
if (firstBlockStartIndex === -1) {
    firstBlockStartIndex = content.indexOf(firstBlockStartStr.replace(/\n/g, '\r\n'));
}

const firstBlockEndStr = "tenantConfig={tenantConfig}\n                />\n              </div>\n            )}";
let firstBlockEndIndex = content.indexOf(firstBlockEndStr, firstBlockStartIndex);
if (firstBlockEndIndex === -1) {
    firstBlockEndIndex = content.indexOf(firstBlockEndStr.replace(/\n/g, '\r\n'), firstBlockStartIndex);
}

if (firstBlockStartIndex !== -1 && firstBlockEndIndex !== -1) {
    const actualFirstEndIndex = firstBlockEndIndex + (firstBlockEndStr.includes('\r\n') ? firstBlockEndStr.replace(/\n/g, '\r\n').length : firstBlockEndStr.length);
    content = content.substring(0, firstBlockStartIndex) + content.substring(actualFirstEndIndex);
}

// 3. Find the fallback block to insert bottomBlock
const fallbackMarker = "{activeTab !== 'hr' && activeTab !== 'ess' && activeTab !== 'crm'";
const fallbackIndex = content.indexOf(fallbackMarker);

if (fallbackIndex === -1) {
    console.error("COULD NOT FIND FALLBACK BLOCK!");
    process.exit(1);
}

content = content.substring(0, fallbackIndex) + bottomBlock + "\n\n          " + content.substring(fallbackIndex);

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log("SUCCESSFULLY FIXED TABS!");
