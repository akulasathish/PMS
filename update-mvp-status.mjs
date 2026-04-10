import fs from 'fs';

let content = fs.readFileSync('mvp.md', 'utf8');

// 1. Mark Housekeeping Master Board as complete
content = content.replace("- [ ] **Housekeeping Web Terminal (Master Board):**", "- [x] **Housekeeping Web Terminal (Master Board):**");
content = content.replace("    *   **The QC Loop:** Move", "    *   [x] **The QC Loop:** Move");
content = content.replace("    *   **Guest Context (X-Ray Vision):**", "    *   [x] **Guest Context (X-Ray Vision):**");
content = content.replace("    *   **Stayover Service:**", "    *   [x] **Stayover Service:**");
content = content.replace("    *   **Cleaner View:**", "    *   [x] **Cleaner View:**");

// 2. Mark Guest Identity Hardare (QR Handshake) as complete
content = content.replace("- [ ] **Guest Identity (Receptionist Hardware):**", "- [x] **Guest Identity (Receptionist Hardware):**");
content = content.replace("    *   **Mobile QR Handshake:**", "    *   [x] **Mobile QR Handshake:**");

// 3. Mark Police Form F as complete
content = content.replace("- [ ] **Police Register (Digital Form F):**", "- [x] **Police Register (Digital Form F):**");

fs.writeFileSync('mvp.md', content);
console.log("MVP list updated with today's completed features.");
