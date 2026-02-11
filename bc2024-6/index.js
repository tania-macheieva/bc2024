const express = require('express');
const { program } = require('commander');
const path = require('path');
const multer = require('multer');
const fs = require('fs');   
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const cors = require('cors');

// Load OpenAPI specification
const file = fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8');
const swaggerDocument = YAML.parse(file);

// Command-line arguments for host, port, and cache directory
program
  .requiredOption('-h, --host <host>', 'Server host address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <cacheDir>', 'Cache directory path');

program.parse(process.argv);

const { host, port, cache } = program.opts();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all origins (for testing purposes, customize as needed)
app.use(cors());

// Ensure the cache directory exists
const ensureCacheDir = async () => {
  try {
    await fs.promises.mkdir(cache, { recursive: true });
  } catch (err) {
    console.error('Error creating cache directory:', err);
  }
};

ensureCacheDir();

// Swagger UI endpoint
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// GET /notes/:name - Fetch a specific note by name
app.get('/notes/:name', async (req, res) => {
  const { name } = req.params;
  const filePath = path.join(cache, `${name}.txt`);
  console.log(`GET /notes/${name} received, looking for file: ${filePath}`);

  try {
    // Check if the file exists before reading it
    await fs.promises.access(filePath, fs.constants.F_OK);
    const note = await fs.promises.readFile(filePath, 'utf8'); // Corrected to use promises
    console.log(`File content: ${note}`);
    res.send(note);
  } catch (err) {
    console.error(`Error fetching file ${filePath}:`, err);
    res.status(404).send('Not Found');
  }
});

  

// POST /write - Create a new note
const upload = multer();
app.post('/write', upload.none(), async (req, res) => {
  const { note_name, note } = req.body;
  const filePath = path.join(cache, `${note_name}.txt`);
  console.log(`POST /write received, creating note: ${note_name}`);

  try {
    // Check if the file already exists
    await fs.promises.access(filePath);
    // If file exists, respond with error
    return res.status(400).send('Note already exists');
  } catch (err) {
    // If file does not exist, create it
    try {
      await fs.promises.writeFile(filePath, note, 'utf8');
      return res.status(201).send('Created');
    } catch (err) {
      // Handle unexpected errors
      console.error('Error creating file:', err);
      return res.status(500).send('Internal Server Error');
    }
  }
});

// PUT /notes/:name - Update an existing note
app.put('/notes/:name', express.text(), async (req, res) => {
  const { name } = req.params;  // Ensure 'name' is passed in the URL
  const filePath = path.join(cache, `${name}.txt`);
  console.log(`PUT /notes/${name} received, updating file: ${filePath}`);

  try {
    // Check if the file exists before writing
    await fs.promises.access(filePath);
    await fs.promises.writeFile(filePath, req.body, 'utf8');
    res.send('Note updated');
  } catch (err) {
    console.error('Error accessing or updating file:', err);
    res.status(404).send('Not Found');
  }
});

// DELETE /notes/:name - Delete a specific note
app.delete('/notes/:name', async (req, res) => {
  const { name } = req.params;
  const filePath = path.join(cache, `${name}.txt`);
  console.log(`DELETE /notes/${name} received, deleting file: ${filePath}`);

  try {
    await fs.promises.unlink(filePath);
    console.log(`File ${filePath} deleted successfully.`);
    res.send('Note deleted');
  } catch (err) {
    console.error(`Error deleting file ${filePath}:`, err);
    res.status(404).send('Not Found');
  }
});


// GET /notes - Fetch a list of all notes
app.get('/notes', async (req, res) => {
  console.log('GET /notes received, reading files from cache directory...');
  try {
    const files = await fs.promises.readdir(cache);
    console.log('Files found:', files);

    const noteList = await Promise.all(files.map(async (file) => {
      const name = path.basename(file, '.txt');
      const text = await fs.promises.readFile(path.join(cache, file), 'utf8');
      return { name, text };
    }));

    res.status(200).json(noteList);
  } catch (err) {
    console.error('Error reading notes:', err);
    res.status(500).send('Error reading notes');
  }
});

// Serve the upload form HTML
app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the Notes Service');
});

// Start server
app.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port}`);
  console.log(`Cache directory is set to ${path.resolve(cache)}`);
});
