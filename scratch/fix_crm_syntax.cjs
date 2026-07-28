const fs = require('fs');
let content = fs.readFileSync('src/CrmModule.jsx', 'utf8');

// The closing div of the main component is currently before the Drawer
const badPattern = `    </div>\r\n\r\n      {/* Customer Details Drawer */}`;
const goodPattern = `      {/* Customer Details Drawer */}`;

if (content.includes(badPattern)) {
    content = content.replace(badPattern, goodPattern);
} else {
    // Try LF
    const badPatternLF = `    </div>\n\n      {/* Customer Details Drawer */}`;
    const goodPatternLF = `      {/* Customer Details Drawer */}`;
    if (content.includes(badPatternLF)) {
        content = content.replace(badPatternLF, goodPatternLF);
    } else {
        // Try single newline
        const badPatternSingle = `    </div>\n      {/* Customer Details Drawer */}`;
        if (content.includes(badPatternSingle)) {
            content = content.replace(badPatternSingle, `      {/* Customer Details Drawer */}`);
        } else {
             const badPatternSingleCRLF = `    </div>\r\n      {/* Customer Details Drawer */}`;
             if (content.includes(badPatternSingleCRLF)) {
                 content = content.replace(badPatternSingleCRLF, `      {/* Customer Details Drawer */}`);
             }
        }
    }
}

// Add the closing div back at the very end before the return closure
const endPattern = `        </div>\r\n      )}\r\n  );\r\n}`;
const newEndPattern = `        </div>\r\n      )}\r\n    </div>\r\n  );\r\n}`;

if (content.includes(endPattern)) {
    content = content.replace(endPattern, newEndPattern);
} else {
    const endPatternLF = `        </div>\n      )}\n  );\n}`;
    const newEndPatternLF = `        </div>\n      )}\n    </div>\n  );\n}`;
    if (content.includes(endPatternLF)) {
        content = content.replace(endPatternLF, newEndPatternLF);
    }
}

fs.writeFileSync('src/CrmModule.jsx', content);
console.log("Fixed CrmModule Drawer DOM nesting!");
