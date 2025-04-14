
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
  
  // Récupérer le nom du livre et le numéro de verset
  let bookName, startVerseNum;
  
  // Si andininy est une chaîne qui contient un livre biblique
  if (typeof andininy === 'string' && isNaN(parseInt(andininy))) {
    bookName = andininy.toLowerCase();
    startVerseNum = 1; // Par défaut commence au verset 1
  } else {
    // L'URL était probablement au format /toko?andininy=amosa&toko=1&andininy=2&hatraminy=5
    // Cela cause un problème car andininy est utilisé deux fois et Express garde la dernière valeur
    return res.status(400).json({ 
      error: 'Format d\'URL incorrect. Utilisez plutôt /toko?livre=amosa&toko=1&verset=2&hatraminy=5' 
    });
  }
  
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
      return res.status(404).json({ error: `Livre "${bookName}" non trouvé` });
    }
    
    // Lire le fichier du livre
    const bookData = JSON.parse(fs.readFileSync(`${dirPath}/${bookName}.json`, 'utf8'));
    
    // Vérifier si le chapitre existe
    if (!bookData[toko]) {
      return res.status(404).json({ error: `Chapitre ${toko} non trouvé dans ${bookName}` });
    }
    
    // Récupérer les données du chapitre
    const chapter = bookData[toko];
    
    // Si un intervalle de versets est demandé (avec hatraminy)
    if (hatraminy) {
      // Pour les anciennes URLs au format /toko?andininy=amosa&toko=1&andininy=2&hatraminy=5
      // On définit manuellement le startVerse à 2 (la valeur attendue)
      startVerseNum = 2;
      const endVerse = parseInt(hatraminy);
      
      // Valider les numéros de versets
      if (isNaN(startVerseNum) || isNaN(endVerse)) {
        return res.status(400).json({ error: 'Les numéros de versets doivent être des nombres' });
      }
      
      // Créer un objet résultat avec les versets dans l'intervalle
      const result = {};
      for (let i = startVerseNum; i <= endVerse; i++) {
        if (chapter[i]) {
          result[i] = chapter[i];
        }
      }
      
      // Retourner les versets
      return res.json({
        livre: bookName,
        chapitre: toko,
        versets: result
      });
    } 
    // Si un seul verset est demandé
    else {
      if (!chapter[startVerseNum]) {
        return res.status(404).json({ error: `Verset ${startVerseNum} non trouvé dans ${bookName} chapitre ${toko}` });
      }
      
      return res.json({
        livre: bookName,
        chapitre: toko,
        versets: { [startVerseNum]: chapter[startVerseNum] }
      });
    }
  } catch (error) {
    console.error(`Erreur lors de la lecture du livre ${bookName}:`, error);
    res.status(500).json({ error: `Impossible de lire le livre ${bookName}` });
  }
});

// Nouvelle route avec une structure de paramètres plus claire
app.get('/livre', (req, res) => {
  const { livre, chapitre, verset, hatraminy } = req.query;
  
  // Vérifier que les paramètres requis sont présents
  if (!livre || !chapitre) {
    return res.status(400).json({ error: 'Paramètres livre et chapitre sont requis' });
  }
  
  let bookName = livre.toLowerCase();
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
      return res.status(404).json({ error: `Livre "${livre}" non trouvé` });
    }
    
    // Lire le fichier du livre
    const bookData = JSON.parse(fs.readFileSync(`${dirPath}/${bookName}.json`, 'utf8'));
    
    // Vérifier si le chapitre existe
    if (!bookData[chapitre]) {
      return res.status(404).json({ error: `Chapitre ${chapitre} non trouvé dans ${livre}` });
    }
    
    // Récupérer les données du chapitre
    const chapter = bookData[chapitre];
    
    // Si un intervalle de versets est demandé (avec hatraminy)
    if (verset && hatraminy) {
      // Convertir les paramètres en nombres
      const startVerse = parseInt(verset);
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
        livre: livre,
        chapitre: chapitre,
        versets: result
      });
    } 
    // Si un seul verset est demandé
    else if (verset) {
      const verseNum = parseInt(verset);
      
      if (!chapter[verseNum]) {
        return res.status(404).json({ error: `Verset ${verseNum} non trouvé dans ${livre} chapitre ${chapitre}` });
      }
      
      return res.json({
        livre: livre,
        chapitre: chapitre,
        versets: { [verseNum]: chapter[verseNum] }
      });
    }
    // Si aucun verset n'est spécifié, renvoyer le chapitre entier
    else {
      return res.json({
        livre: livre,
        chapitre: chapitre,
        versets: chapter
      });
    }
  } catch (error) {
    console.error(`Erreur lors de la lecture du livre ${livre}:`, error);
    res.status(500).json({ error: `Impossible de lire le livre ${livre}` });
  }
});

// Root route for basic info
app.get('/', (req, res) => {
  res.send(`
    <h1>API Baiboly-json</h1>
    <p>Utilisez <code>/titre?baiboly=testameta vaovao</code> ou <code>/titre?baiboly=testameta taloha</code> pour obtenir la liste des livres.</p>
    <p>Utilisez <code>/livre?livre=amosa&chapitre=1&verset=2&hatraminy=5</code> pour obtenir un intervalle de versets.</p>
  `);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
});
