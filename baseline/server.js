import { createRequire } from "module";
const require = createRequire(import.meta.url);

const express = require('express');
const session = require('express-session');
import RedisStore from "connect-redis";
//const RedisStore = require('connect-redis')(session);
import { createClient } from "redis";

// Create Redis client
const redisClient = createClient();
redisClient.on("error", function(error) {
    console.error(error);
});

// Initialize store.
let redisStore = new RedisStore({
    client: redisClient,
    prefix: "myapp:",
})

const app = express();
const PORT = 3000;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session to use Redis store
app.use(session({
    store: redisStore,
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