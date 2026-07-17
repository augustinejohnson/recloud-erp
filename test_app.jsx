import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './src/App.jsx';

try {
  // We mock window.location and standard browser things since we use jsdom
  const html = ReactDOMServer.renderToString(React.createElement(App, {}));
  console.log("RENDER SUCCESS!");
} catch (e) {
  console.error('RENDER ERROR:', e.message);
  console.error(e.stack);
}
