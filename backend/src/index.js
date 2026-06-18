import app from './app';
const jwt = require('jsonwebtoken');
const { methods } = require('./controllers/producto.controller');

const port = parseInt(process.env.PORT || app.get('port'), 10) || 4000;

const startServer = (listenPort) => {
  const server = app.listen(listenPort, () => {
    console.log(`Server on port ${listenPort}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const fallbackPort = listenPort + 1;
      if (listenPort === port) {
        console.warn(`Port ${listenPort} is already in use. Trying port ${fallbackPort}...`);
        startServer(fallbackPort);
        return;
      }
      console.error(`Port ${listenPort} is already in use. Please free the port or set PORT env var.`);
      process.exit(1);
    }
    throw error;
  });
};

startServer(port);

methods
  .fetchProductos()
  .then((products) => {
    console.log('Products:', products);
    //process.exit(0);
  })
  .catch((error) => {
    console.error('Error fetching products:', error);
    process.exit(1);
  });
