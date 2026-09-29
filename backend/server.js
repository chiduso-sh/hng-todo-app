// Starts the server. Everything it serves is defined in src/app.js.

import app from './src/app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
