import React from 'react';
import ReactDOMServer from 'react-dom/server';
import InventoryModule from './src/InventoryModule.jsx';

try {
  console.log(ReactDOMServer.renderToString(React.createElement(InventoryModule, {products:[], stockMovements:[], warehouses:[], suppliers:[], purchaseOrders:[], branchOrders:[], b2bOrders:[]})));
} catch (e) {
  console.error('RENDER ERROR:', e);
}
