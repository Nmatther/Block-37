const pg = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT = process.env.JWT || 'secret';

const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/block37');

const findUserByToken = async(token) => {
    let id;
    console.log(token);
    try {
      const payload = await jwt.verify(token, JWT);
      id = payload.id;
      
    }
    catch(ex){
      const error = Error('not authorized');
      error.status = 401;
      throw error;
    }
    const SQL = `
      SELECT id, username
      FROM users
      WHERE id = $1
    `;
    const response = await client.query(SQL, [id]);
    if(!response.rows.length){
      const error = Error('not authorized');
      error.status = 401;
      throw error;
    }
    return response.rows[0];
  
  }
  



async function register(username, password, email, role) {
  const sql = `
    INSERT INTO users(username, password, email, role)
    VALUES($1, $2, $3, $4)
    RETURNING *;
  `;

  const hash = await bcrypt.hash(password, 10);
  const {rows}  = await client.query(sql, [username, hash, email, role]);
  const user = rows[0];
  return user;
}

async function login(username, password) {
  const sql = `
    SELECT * FROM users
    WHERE username = $1;
  `;
  const { rows } = await client.query(sql, [username]);
  const user = rows[0];
  console.log(user);
  if (!user) {
    throw new Error('User not found');
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error('Password incorrect');
  }
  return user;
}

async function getAllUsers() {
  const sql = `
    SELECT id, username FROM users;
  `;
  return client.query(sql);
}

async function getAllProducts() {
  const query = 'SELECT * FROM products';
  const { rows } = await db.query(query);
  return rows;
}
// USER Cart Functions

async function getUserCart(userId) {
    const sql = `SELECT * FROM carts WHERE user_id =$1`;
    const { rows } = await client.query(sql, [userId]);
    return rows;
}

async function addToCart(userId, productId, quantity) {
    const sql = `INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3, $4)`;
    await client.query(sql, [userId, productId, quantity]);
} 

async function removeFromCart(userId, productId) {
    const sql = `DELETE FROM carts WHERE user_id = $1 AND product_id = $2`;
    await client.query(sql, [userId, productId]);
}

async function updateCartItem(userId, productId, newQuantity) {
    const sql = `UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3`;
    await client.query(sql, [newQuantity, userId, productId]);
}

async function createOrder(userId, products) {
  const client = await db.connect();
  try {
      await client.query('BEGIN');
      // Insert order into the database
      const { rows: [order] } = await client.query(
          'INSERT INTO orders (user_id) VALUES ($1) RETURNING id',
          [userId]
      );

      // Insert order items into the database
      const orderItemsValues = products.map(product => `(${order.id}, ${product.id}, ${product.quantity})`).join(',');
      await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity) VALUES ${orderItemsValues}`
      );

      await client.query('COMMIT');
      return order.id;
  } catch (error) {
      await client.query('ROLLBACK');
      throw error;
  } finally {
      client.release();
  }
}

async function createTables() {

  const sql = `
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS carts;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS users;

    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(256),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
      );

    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        price NUMERIC(10,2)
      );
      
    CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER
    );

    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  
    CREATE TABLE order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER,
      CONSTRAINT unique_order_product UNIQUE (order_id, product_id)
    );
    

    
    
    
    
            
  `
  return client.query(sql);
}

module.exports = {
  client,
  findUserByToken,
  createTables,
  register,
  login,
  getAllUsers,
  getUserCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  getAllProducts,
  createOrder
}