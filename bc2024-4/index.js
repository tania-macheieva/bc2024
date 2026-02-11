const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const superagent = require('superagent');
const program = new Command();

program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <path>', 'cache directory path')
  .parse(process.argv);

const { host, port, cache } = program.opts();

const server = http.createServer(async (req, res) => {
  const filePath = path.join(cache, req.url.substring(1) + '.jpg');

  // Обробка GET запиту
  if (req.method === 'GET') {
    try {
      const data = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data);
    } catch {
      // Якщо зображення не знайдено, перевірте http.cat
      const statusCode = req.url.substring(1);
      try {
        const response = await superagent.get(`https://http.cat/${statusCode}`);
        await fs.writeFile(filePath, response.body);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(response.body);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    }
  }

  // Обробка PUT запиту
  else if (req.method === 'PUT') {
    const buffers = [];
    req.on('data', chunk => buffers.push(chunk));
    req.on('end', async () => {
      const data = Buffer.concat(buffers);
      await fs.writeFile(filePath, data);
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end('Created');
    });
  }

  // Обробка DELETE запиту
  else if (req.method === 'DELETE') {
    try {
      await fs.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  // Інші методи
  else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
