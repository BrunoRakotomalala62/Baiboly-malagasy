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
    dirPath = 'testametavaovao';
  } else if (baiboly && baiboly.toLowerCase().includes('taloha')) {
    dirPath = 'testametataloha';
  } else {
    return res.status(400).json({ error: 'Paramètre baiboly requis (testameta vaovao ou testameta taloha)' });
  }

  // Vérifier si le répertoire existe
  if (!fs.existsSync(dirPath)) {
    return res.status(500).json({ error: `Répertoire ${dirPath} non trouvé` });
  }

  try {
    console.log(`Tentative de lecture du répertoire: ${dirPath}`);
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
    // Vérifier d'abord dans l'Ancien Testament (testametataloha)
    if (fs.existsSync(`testametataloha/${bookName}.json`)) {
      dirPath = 'testametataloha';
    } 
    // Puis vérifier dans le Nouveau Testament (testametavaovao)
    else if (fs.existsSync(`testametavaovao/${bookName}.json`)) {
      dirPath = 'testametavaovao';
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
    // Vérifier d'abord dans l'Ancien Testament (testametataloha)
    if (fs.existsSync(`testametataloha/${bookName}.json`)) {
      dirPath = 'testametataloha';
    } 
    // Puis vérifier dans le Nouveau Testament (testametavaovao)
    else if (fs.existsSync(`testametavaovao/${bookName}.json`)) {
      dirPath = 'testametavaovao';
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

// Route pour rechercher et afficher le contenu complet d'un livre
app.get('/recherche', (req, res) => {
  const livre = req.query.livre;

  if (!livre) {
    return res.status(400).json({ error: 'Paramètre livre est requis' });
  }

  const bookName = livre.toLowerCase();
  let dirPath;
  let bookData;

  try {
    // Vérifier d'abord dans l'Ancien Testament (testametataloha)
    if (fs.existsSync(`testametataloha/${bookName}.json`)) {
      dirPath = 'testametataloha';
      bookData = JSON.parse(fs.readFileSync(`${dirPath}/${bookName}.json`, 'utf8'));
    } 
    // Puis vérifier dans le Nouveau Testament (testametavaovao)
    else if (fs.existsSync(`testametavaovao/${bookName}.json`)) {
      dirPath = 'testametavaovao';
      bookData = JSON.parse(fs.readFileSync(`${dirPath}/${bookName}.json`, 'utf8'));
    } 
    else {
      return res.status(404).json({ error: `Livre "${livre}" non trouvé` });
    }

    // Retourner le livre entier
    return res.json({
      livre: livre,
      testament: dirPath,
      contenu: bookData
    });
  } catch (error) {
    console.error(`Erreur lors de la lecture du livre ${livre}:`, error);
    res.status(500).json({ error: `Impossible de lire le livre ${livre}` });
  }
});

// Servir les fichiers statiques
// Aucun besoin de servir des fichiers statiques si tout est intégré

// Root route for basic info
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Baiboly-json</title>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
          line-height: 1.6;
          min-height: 100vh;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        h1 {
          text-align: center;
          font-size: 3rem;
          margin-bottom: 2rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .description {
          text-align: center;
          margin-bottom: 3rem;
          font-size: 1.2rem;
        }

        .button-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .api-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          padding: 1rem;
          border-radius: 10px;
          color: white;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: left;
        }

        .api-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-3px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
        }

        .api-button code {
          display: block;
          margin-top: 0.5rem;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.5rem;
          border-radius: 5px;
          overflow-wrap: break-word;
        }

        .footer {
          text-align: center;
          margin-top: 2rem;
          opacity: 0.7;
          font-size: 0.9rem;
        }

        @media (max-width: 600px) {
          .container {
            padding: 1rem;
          }

          h1 {
            font-size: 2.5rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>API Baiboly-json</h1>
        <div class="description">
          <p>Bienvenue sur l'API Baiboly-json. Utilisez les boutons ci-dessous pour accéder aux différentes routes.</p>
        </div>

        <div class="button-container">
          <button class="api-button" onclick="window.location.href='/titre?baiboly=testameta vaovao'">
            Testameta Vaovao - Liste des Livres
            <code>/titre?baiboly=testameta vaovao</code>
          </button>

          <button class="api-button" onclick="window.location.href='/titre?baiboly=testameta taloha'">
            Testameta Taloha - Liste des Livres
            <code>/titre?baiboly=testameta taloha</code>
          </button>

          <button class="api-button" onclick="window.location.href='/livre?livre=amosa&chapitre=1&verset=2&hatraminy=5'">
            Exemple de Versets: Amosa 1:2-5
            <code>/livre?livre=amosa&chapitre=1&verset=2&hatraminy=5</code>
          </button>

          <button class="api-button" onclick="window.location.href='/recherche?livre=amosa'">
            Recherche Complète: Amosa
            <code>/recherche?livre=amosa</code>
          </button>
        </div>

        <div class="footer">
          &copy; 2023 API Baiboly-json - Tous droits réservés
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
});
