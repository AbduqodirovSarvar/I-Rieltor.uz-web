import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:900,height:700}});
await p.goto('http://localhost:8081/',{waitUntil:'networkidle'});
await p.waitForTimeout(1000);
console.log(p.url());
await p.screenshot({path:'../shot-admin.png'});
await b.close();
