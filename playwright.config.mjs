import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:45_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  retries:0,
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
    command:'python3 -m http.server 4173 -d out',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:20_000
  }
});
