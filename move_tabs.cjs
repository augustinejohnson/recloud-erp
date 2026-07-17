const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Use regex to find the blocks to avoid CRLF mismatch
const bottomBlockRegex = /\{activeTab === 'accounting' && \([\s\S]*?tenantConfig=\{tenantConfig\}\s*\/><\/ErrorBoundary>\s*<\/div>\s*\)\}\s*/;
const bottomMatch = content.match(bottomBlockRegex);

if (!bottomMatch) {
    console.error("COULD NOT FIND BOTTOM BLOCKS!");
} else {
    // Only remove the LAST occurrence (which is the one outside the main tag if it's duplicated, wait no, they are unique because one has ErrorBoundary and the other doesn't)
    const blocksToMove = bottomMatch[0];
    content = content.replace(bottomBlockRegex, '');
    
    // Remove the old first blocks that don't have ErrorBoundary
    const firstBlockRegex = /\{activeTab === 'accounting' && \([\s\S]*?tenantConfig=\{tenantConfig\}\s*\/>\s*<\/div>\s*\)\}\s*/;
    content = content.replace(firstBlockRegex, '');

    // Insert right before fallback
    const fallbackStr = "{activeTab !== 'hr' && activeTab !== 'ess' && activeTab !== 'crm' && activeTab !== 'inventory'";
    const fallbackIndex = content.indexOf(fallbackStr);
    
    if (fallbackIndex !== -1) {
        content = content.substring(0, fallbackIndex) + blocksToMove + "\n          " + content.substring(fallbackIndex);
        fs.writeFileSync('src/App.jsx', content, 'utf8');
        console.log("SUCCESSFULLY MOVED TABS!");
    } else {
        console.error("COULD NOT FIND FALLBACK BLOCK!");
    }
}
