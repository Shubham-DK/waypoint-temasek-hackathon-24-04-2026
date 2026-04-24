import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.join(__dirname, 'public');

// Port 3000 — External systems (StaySG Hotels)
const external = express();
external.use(express.static(DEMO_DIR));
external.listen(3000, () => {
  console.log('StaySG Hotels Portal:      http://localhost:3000/hotel-portal.html');
});

// Port 3001 — Internal systems (SilverOS)
const internal = express();
internal.use(express.static(DEMO_DIR));
internal.listen(3001, () => {
  console.log('SilverOS Flight Schedule:  http://localhost:3001/flight-schedule.html');
  console.log('SilverOS Passenger List:   http://localhost:3001/passenger-manifest.html');
  console.log('SilverOS CRM Email:        http://localhost:3001/crm-email.html');
});
