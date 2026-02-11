const express = require('express');
const { program } = require('commander');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

program
  .requiredOption('-h, --host <host>', 'Server host address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <cacheDir>', 'Cache directory path');

program.parse(process.argv);

const { host, port, cache } = program.opts();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

 
const ensureCacheDir = async () => {
  try {
    await fs.mkdir(cache, { recursive: true });
  } catch (err) {
    console.error('Error creating cache directory:', err);
  }
};
ensureCacheDir();


app.get('/notes/:name', async (req, res) => {
  const { name } = req.params;
  const filePath = path.join(cache, `${name}.txt`);

  try {
    const note = await fs.readFile(filePath, 'utf8');
    res.send(note);
  } catch (err) {
    res.status(404).send('Not Found');
  }
});


const upload = multer();
app.post('/write', upload.none(), async (req, res) => {
  const { note_name, note } = req.body;
  const filePath = path.join(cache, `${note_name}.txt`);

  try {
    await fs.access(filePath);
    return res.status(400).send('Note already exists');
  } catch (err) {
    await fs.writeFile(filePath, note, 'utf8');
    res.status(201).send('Created');
  }
});


app.put('/notes/:name', express.text(), async (req, res) => {
    const { name } = req.params;
    const filePath = path.join(cache, `${name}.txt`);

    try {
      await fs.access(filePath);
      await fs.writeFile(filePath, req.body, 'utf8');
      res.send('Note updated');
    } catch (err) { 
      res.status(404).send('Not Found');
    }
  });
  
 
app.delete('/notes/:name', async (req, res) => {
  const { name } = req.params;
  const filePath = path.join(cache, `${name}.txt`);

  try {
    await fs.unlink(filePath);
    res.send('Note deleted');
  } catch (err) {
    res.status(404).send('Not Found');
  }
});
 
app.get('/notes', async (req, res) => {
  try {
    const files = await fs.readdir(cache);
    const noteList = await Promise.all(files.map(async (file) => {
      const name = path.basename(file, '.txt');
      const text = await fs.readFile(path.join(cache, file), 'utf8');
      return { name, text };
    }));
    res.status(200).json(noteList);
  } catch (err) {
    res.status(500).send('Error reading notes');
  }
});

app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'UploadForm.html'));
});
app.get('/', (req, res) => {
    res.send('Welcome to the Notes Service');
  });

app.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port}`);
  console.log(`Cache directory is set to ${path.resolve(cache)}`);
});
