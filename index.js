
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Route to get book titles from Testameta
app.get('/titre', (req, res) => {
  const baiboly = req.query.baiboly;
  
  // Normalize directory name (case insensitive)
  let dirPath;
  if (baiboly && baiboly.toLowerCase().includes('vaovao')) {
    dirPath = 'Testameta vaovao';
  } else if (baiboly && baiboly.toLowerCase().includes('taloha')) {
    dirPath = 'Testameta taloha';
  } else {
    return res.status(400).json({ error: 'Paramètre baiboly requis (testameta vaovao ou testameta taloha)' });
  }
  
  try {
    // Read the directory
    const files = fs.readdirSync(dirPath);
    
    // Filter only JSON files and remove the .json extension
    const bookTitles = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    // Return the list
    res.json(bookTitles);
  } catch (error) {
    console.error(`Erreur lors de la lecture du répertoire ${dirPath}:`, error);
    res.status(500).json({ error: `Impossible de lire le répertoire ${dirPath}` });
  }
});

// Root route for basic info
app.get('/', (req, res) => {
  res.send(`
    <h1>API Baiboly-json</h1>
    <p>Utilisez <code>/titre?baiboly=testameta vaovao</code> ou <code>/titre?baiboly=testameta taloha</code> pour obtenir la liste des livres.</p>
  `);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
});
