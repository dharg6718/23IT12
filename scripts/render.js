const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axios = require('axios');

const url = process.argv[2] || 'http://localhost:3000/raw-notifications?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkaGFyZzY3MThAZ21haWwuY29tIiwiZXhwIjoxNzgyNzk3Mzg0LCJpYXQiOjE3ODI3OTY0ODQsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiIzMzU0OTAzOS0zMGZmLTRhNjUtYTQxMC1mOTRjMTdlZjM5YWMiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJnaXJpZGhhciBrciIsInN1YiI6IjY5Yjk4N2NhLTZhZjAtNDEyZi04ZDVhLTJlNjY2OGRjNTA5MiJ9LCJlbWFpbCI6ImRoYXJnNjcxOEBnbWFpbC5jb20iLCJuYW1lIjoiZ2lyaWRoYXIga3IiLCJyb2xsTm8iOiIyM2l0MTIiLCJhY2Nlc3NDb2RlIjoiV2pOeUNUIiwiY2xpZW50SUQiOiI2OWI5ODdjYS02YWYwLTQxMmYtOGQ1YS0yZTY2NjhkYzUwOTIiLCJjbGllbnRTZWNyZXQiOiJhTlRTTURhcE1UdG14ZWRqIn0.AR-P5ClzNvW62EAGyvf1dOmVKIfbIf2kooSeyc1YO3E';

(async () => {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
    const tmpHtml = path.join(__dirname, 'tmp.html');
    const outPng = path.join(__dirname, '..', 'notification_output.png');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Notifications</title><style>body{font-family:monospace;white-space:pre;background:#fff;padding:20px}</style></head><body><pre>${escapeHtml(data)}</pre></body></html>`;
    fs.writeFileSync(tmpHtml, html);

    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle0' });
    const el = await page.$('body');
    await el.screenshot({ path: outPng, fullPage: true });
    await browser.close();
    fs.unlinkSync(tmpHtml);
    console.log('Saved image to', outPng);
  } catch (err) {
    console.error('Failed to render:', err.message || err);
    process.exit(1);
  }
})();

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
