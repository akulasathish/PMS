import fs from 'fs';

let hkPath = 'src/app/(tier2)/dashboard/housekeeping/page.tsx';
let content = fs.readFileSync(hkPath, 'utf8');

const oldZombie = `              if (realPropId) {
                  console.log("🩹 Auto-Repair: Zombie ID detected. Erasing cache and rebooting app to:", realPropId);
                  localStorage.setItem('pms_active_property', realPropId);
                  window.location.reload(); // Force a hard reboot so React drops all corrupted state
                  return; // Stop rendering
              }`;

const newZombie = `              if (realPropId && realPropId !== activeId) {
                  console.log("🩹 Auto-Repair: Zombie ID detected. Erasing cache and rebooting app to:", realPropId);
                  localStorage.setItem('pms_active_property', realPropId);
                  window.location.reload(); // Force a hard reboot so React drops all corrupted state
                  return; // Stop rendering
              }`;

content = content.replace(oldZombie, newZombie);
fs.writeFileSync(hkPath, content);
console.log("Housekeeping Infinite Refresh Bug Patched!");
