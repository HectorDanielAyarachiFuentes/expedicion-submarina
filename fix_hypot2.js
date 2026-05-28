const fs = require('fs'); let p='js/game/game.js'; let c=fs.readFileSync(p,'utf8'); c=c.replace(/Math\.hypot\(([^,]+),\s*([^\)]+)\)/g, 'Math.sqrt(()*() + ()*())'); fs.writeFileSync(p,c);
