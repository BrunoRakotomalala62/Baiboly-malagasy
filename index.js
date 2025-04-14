
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

// Route to get specific verses from a chapter
app.get('/toko', (req, res) => {
  // Extraire les paramètres de la requête
  const { andininy, toko, hatraminy } = req.query;
  
  // Vérifier que les paramètres requis sont présents
  if (!andininy || !toko) {
    return res.status(400).json({ error: 'Paramètres andininy (livre) et toko (chapitre) sont requis' });
  }
  
  // Déterminer le nom du livre (livre = andininy dans les paramètres)
  let bookName = andininy.toLowerCase();
  let dirPath;
  
  try {
    // Vérifier d'abord dans l'Ancien Testament (Testameta taloha)
    if (fs.existsSync(`Testameta taloha/${bookName}.json`)) {
      dirPath = 'Testameta taloha';
    } 
    // Puis vérifier dans le Nouveau Testament (Testameta vaovao)
    else if (fs.existsSync(`Testameta vaovao/${bookName}.json`)) {
      dirPath = 'Testameta vaovao';
    } 
    else {
      return res.status(404).json({ error: `Livre "${andininy}" non trouvé` });
    }
    
    // Lire le fichier du livre
    const bookData = JSON.parse(fs.readFileSync(`${dirPath}/${bookName}.json`, 'utf8'));
    
    // Vérifier si le chapitre existe
    if (!bookData[toko]) {
      return res.status(404).json({ error: `Chapitre ${toko} non trouvé dans ${andininy}` });
    }
    
    // Récupérer les données du chapitre
    const chapter = bookData[toko];
    
    // Si un intervalle de versets est demandé (avec hatraminy)
    if (hatraminy) {
      // Convertir les paramètres en nombres
      const startVerse = parseInt(req.query.andininy);
      const endVerse = parseInt(hatraminy);
      
      // Valider les numéros de versets
      if (isNaN(startVerse) || isNaN(endVerse)) {
        return res.status(400).json({ error: 'Les numéros de versets doivent être des nombres' });
      }
      
      // Créer un objet résultat avec les versets dans l'intervalle
      const result = {};
      for (let i = startVerse; i <= endVerse; i++) {
        if (chapter[i]) {
          result[i] = chapter[i];
        }
      }
      
      // Retourner les versets
      return res.json({
        livre: andininy,
        chapitre: toko,
        versets: result
      });
    } 
    // Si un seul verset est demandé
    else {
      // Utilisez le paramètre andininy comme numéro de verset
      // (ce qui peut être confus, mais c'est ce qui est demandé)
      const verseNum = req.query.andininy;
      
      if (!chapter[verseNum]) {
        return res.status(404).json({ error: `Verset ${verseNum} non trouvé dans ${andininy} chapitre ${toko}` });
      }
      
      return res.json({
        livre: andininy,
        chapitre: toko,
        versets: { [verseNum]: chapter[verseNum] }
      });
    }
  } catch (error) {
    console.error(`Erreur lors de la lecture du livre ${andininy}:`, error);
    res.status(500).json({ error: `Impossible de lire le livre ${andininy}` });
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
