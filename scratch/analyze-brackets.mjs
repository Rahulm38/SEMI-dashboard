import fs from 'fs';
import { processCsvData } from '../src/utils/dataProcessor.js';

const data = JSON.parse(fs.readFileSync('latest_csv.json', 'utf8'));
const processed = await processCsvData(data);

console.log(Object.keys(processed));
console.log('--- Ticket Keys ---', processed.metrics.ticketKeys);
console.log('--- EMI Keys ---', processed.metrics.emiKeys);
