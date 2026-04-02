import fs from 'fs';

const files = [
  'src/app/(tier2)/dashboard/inventory/page.tsx',
  'src/app/(tier2)/dashboard/front-office/page.tsx',
  'src/app/(tier2)/dashboard/housekeeping/page.tsx',
  'src/app/(tier2)/dashboard/staff/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // First, undo my bad sed commands
  content = content.replace(/\} catch \(err\) \{ console\.error\("Error", err\); \} finally \{ setIsLoading\(false\); \}/g, '');
  content = content.replace(/setIsLoading\(true\);\n      try \{/g, 'setIsLoading(true);');
  
  // Now wrap the entire fetchData logic cleanly
  content = content.replace(
    /setIsLoading\(true\);/, 
    'setIsLoading(true);\n      try {'
  );
  
  content = content.replace(
    /      setIsLoading\(false\);\n    }\n    fetchData\(\);/g,
    '      } catch(err) { console.error(err); } finally { setIsLoading(false); }\n    }\n    fetchData();'
  );
  
  content = content.replace(
    /      setIsLoading\(false\);\n    }\n    \n    fetchData\(\);/g,
    '      } catch(err) { console.error(err); } finally { setIsLoading(false); }\n    }\n    \n    fetchData();'
  );

  fs.writeFileSync(file, content);
}
console.log("Dashboards cleaned up and fixed.");
