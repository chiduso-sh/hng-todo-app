// The Express app: middleware, routes, and the two catch-alls at the end.
// Kept separate from server.js so the app can be imported and tested without
// actually opening a port.

import express from 'express';
import cors from 'cors';
import todosRouter from './routes/todos.js';

const app = express();

app.use(cors());
app.use(express.json());

// A cheap endpoint to confirm the server is actually up.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/todos', todosRouter);

// Nothing above matched the URL.
app.use((req, res) => {
  res.status(404).json({ error: `no route for ${req.method} ${req.path}` });
});

// Something above threw. Express recognises this as the error handler because
// it takes four arguments — the extra `err` in front.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'something went wrong on the server' });
});

export default app;
