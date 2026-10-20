import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:45_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  // CI runners are occasionally slow to come up; one retry absorbs that noise
  // without hiding a real, repeatable failure (retries stay off locally).
  retries:process.env.CI?1:0,
  reporter:[['list']],
  use:{
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    reducedMotion:'reduce'
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'mobile-chromium',use:{...devices['iPhone 13'],browserName:'chromium'}},
    {name:'mobile-webkit',use:{...devices['iPhone 13'],browserName:'webkit'},testMatch:'**/ios-touch.spec.mjs'}
  ],
  webServer:{
    // Bind explicitly to the same IPv4 address Playwright polls. Without
    // --bind, http.server's default listen address depends on the runner's
    // Python version and can end up not answering on 127.0.0.1.
    command:'python3 -m http.server 4173 --bind 127.0.0.1 -d out',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:60_000
  }
});
