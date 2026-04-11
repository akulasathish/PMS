import fs from 'fs';

let foPath = 'src/app/(tier2)/dashboard/front-office/page.tsx';
let content = fs.readFileSync(foPath, 'utf8');

// I need to find the "window.location.reload()" call inside the zombie fix.
// If the database legitimately returns 0 rooms (e.g., a brand new hotel that hasn't added rooms yet!), 
// the Zombie Fix thinks it's a corrupted ID and goes into an infinite loop of refreshing the page!

const oldZombie = `            if (realPropId) {
                console.log("🩹 Auto-Repair: Zombie ID detected. Erasing cache and rebooting app to:", realPropId);
                localStorage.setItem('pms_active_property', realPropId);
                window.location.reload(); // Force a hard reboot so React drops all corrupted state
                return; // Stop rendering
            } else {`;

const newZombie = `            if (realPropId && realPropId !== activeId) { // ONLY reload if the ID actually changed!
                console.log("🩹 Auto-Repair: Zombie ID detected. Erasing cache and rebooting app to:", realPropId);
                localStorage.setItem('pms_active_property', realPropId);
                window.location.reload(); // Force a hard reboot so React drops all corrupted state
                return; // Stop rendering
            } else {
               // They literally own zero properties OR the property just doesn't have any rooms yet!
               console.log("Hotel legitimately has 0 rooms, or user has no properties.");
            }`;

content = content.replace(oldZombie, newZombie);
fs.writeFileSync(foPath, content);
console.log("Front Office Infinite Refresh Bug Patched!");
