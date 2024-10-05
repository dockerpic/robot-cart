To create a simple Node.js shopping cart that uses Redis to store item data with fields like `id`, `sku`, and `quantity`, we can follow these steps:

### 1. **Set Up the Project**

1. Initialize a new Node.js project:
   ```bash
   mkdir nodejs-shopping-cart-redis
   cd nodejs-shopping-cart-redis
   npm init -y
   ```

2. Install the necessary dependencies:
   ```bash
   npm install express express-session redis connect-redis
   ```

3. Ensure you have Redis installed and running on your system. You can start Redis by running:
   ```bash
   redis-server
   ```

### 2. **Create the Application**

Create a file called `app.js` in your project directory:

```javascript
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

// Create Redis client
const redisClient = redis.createClient();

const app = express();
const PORT = 3000;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session to use Redis store
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'shopping-cart-secret',
    resave: false,
    saveUninitialized: true,
}));

// Products in Redis (id, sku, quantity)
const items = [
    { id: 1, sku: 'APL123', quantity: 10 },
    { id: 2, sku: 'BNN456', quantity: 20 },
    { id: 3, sku: 'ORG789', quantity: 30 }
];

// Store items in Redis
items.forEach(item => {
    redisClient.hset(`item:${item.id}`, 'sku', item.sku, 'quantity', item.quantity);
});

// Home route to display available products
app.get('/', (req, res) => {
    redisClient.keys('item:*', (err, keys) => {
        if (err) return res.status(500).send('Redis error');
        
        redisClient.mget(keys, (err, values) => {
            if (err) return res.status(500).send('Redis error');

            res.send(`
                <h1>Products</h1>
                <ul>
                    ${items.map(item => `
                        <li>
                            SKU: ${item.sku}, Quantity: ${item.quantity}
                            <a href="/add-to-cart/${item.id}">Add to cart</a>
                        </li>
                    `).join('')}
                </ul>
                <a href="/cart">View Cart</a>
            `);
        });
    });
});

// Add product to cart
app.get('/add-to-cart/:id', (req, res) => {
    const itemId = parseInt(req.params.id);

    redisClient.hgetall(`item:${itemId}`, (err, item) => {
        if (!item || err) {
            return res.status(404).send('Item not found');
        }

        // Initialize cart if it doesn't exist
        if (!req.session.cart) {
            req.session.cart = [];
        }

        // Add the item to the cart
        req.session.cart.push({
            id: itemId,
            sku: item.sku,
            quantity: 1 // You can add logic to handle multiple quantities
        });

        res.redirect('/');
    });
});

// View cart
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];

    res.send(`
        <h1>Your Cart</h1>
        <ul>
            ${cart.map(item => `
                <li>SKU: ${item.sku}, Quantity: ${item.quantity}</li>
            `).join('')}
        </ul>
        <a href="/">Back to Products</a>
    `);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
```

### 3. **Run the Application**

1. Start Redis on your machine (if not already running):
   ```bash
   redis-server
   ```

2. Start your Node.js server:
   ```bash
   node app.js
   ```

### 4. **Usage**

1. Open your browser and navigate to `http://localhost:3000`.
2. You’ll see a list of products with SKUs and their available quantities.
3. Click on "Add to cart" to add an item to your shopping cart.
4. Click "View Cart" to see the contents of your cart, showing the SKU and quantity.

### How It Works

- **Redis** stores the products (`id`, `sku`, `quantity`) as hash sets.
- When you visit the homepage, Redis retrieves the items to display.
- When you add an item to the cart, it's stored in the session managed by Redis. The item’s `id`, `sku`, and quantity are added to the session cart.

This simple example shows how to use Redis for storing product data and managing session-based carts. You can extend it further by adding features like updating quantities, removing items, or persisting the cart.