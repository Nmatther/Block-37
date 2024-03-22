const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { client, findUserByToken, createTables, register, login, getAllUsers, updateCartItem, getUserCart, addToCart, removeFromCart} = require('./db');
const app = express();
const JWT = process.env.JWT || 'secret';

app.use(express.json());
app.use(cors());

const isLoggedIn = async(req, res, next)=> {
    try {
        console.log(req.headers.authorization);
      req.user = await findUserByToken(req.headers.authorization);
      next();
    }
    catch(ex){
      next(ex);
    }
  };

// PROTECTED GET ALL USERS ROUTE
 async function requireToken(req, res, next) {
    const token = req.headers.authorization;
    try {
      const user = await jwt.verify(token, "secret");
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  }
// LOGIN ROUTE
app.post('/api/login', async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const user = await login(username, password);
    delete user.password;
    const token = await jwt.sign({id:user.id}, JWT);
    res.send({ user, token });
  } catch (error) {
    next(error);
  }
});

// REGISTER ROUTE
app.post('/api/users', async (req, res, next) => {
  console.log(req.body);
  const { username, password, email, role} = req.body;
  try {
    const user = await register(username, password, email, role);
    delete user.password;
    const token = jwt.sign({id:user.id}, JWT);
    res.send({ user, token });
  } catch (error) {
    next(error);
  }
});

// GET ALL PRODUCTS
app.get('/', async (req, res) => {
  try {
      const productList = await products.getAllProducts();
      res.status(200).json(productList);
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
  }
});

//GET ALL USERS
app.get('/api/users', requireToken, async (req, res, next) => {
  const users = await getAllUsers();
  res.send(users.rows);
});

//USER CART ROUTES use first one as template
app.get('/:userId', isLoggedIn,  async (req, res) => {
    const { userId } = req.params;
    try {
        if(parseInt(req.params.userId)!== req.user.id){
            const error = Error('not authorized');
            error.status = 401;
            throw error;
        }
        const userCart = await getUserCart(userId);
        res.json(userCart);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

app.post('/:userId/:productId', isLoggedIn, async (req, res) => {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    try {
      if(parseInt(req.params.userId)!== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
    }
      await addToCart(userId, productId, quantity);
      res.status(201).json({ message: 'Item added to cart successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

app.put('/:userId/:productId' , isLoggedIn, async (req, res) => {
    const { userId, productId } = req.params;
    const { newQuantity } = req.body;
    try {
      if(parseInt(req.params.userId)!== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
    }
      await updateCartItem(userId, productId, newQuantity);
      res.status(200).json({message: 'Cart item updated successfully'});
    } catch (err) {
        res.status(500).json({message: 'Server error'});
    }
});

app.delete('/:userId/:productId', isLoggedIn, async (req, res) => {
    const { userId, productId } = req.params;
    try {
      if(parseInt(req.params.userId)!== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
    }
      await removeFromCart(userId, productId);
      res.status(200).json({message: 'Cart item updated successfully'});
    } catch (err) {
        res.status(500).json({message: 'Server error'});
    }
});

// Check OUT ROUTE
app.post('/checkout', isLoggedIn, async (req, res) => {
  const { userId, products } = req.body;
  try {
    if(parseInt(req.params.userId)!== req.user.id){
      const error = Error('not authorized');
      error.status = 401;
      throw error;
    }
    // 1. Create order in the database
    const orderId = await orders.createOrder(userId, products);

    // 2. Update inventory (if applicable)

    // 3. Clear user's cart or remove purchased items from the cart

    // 4. Integrate with a payment gateway for payment processing

    res.status(200).json({ message: 'Checkout successful', orderId });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
  }
});

// Log Out
router.post('/logout', (req, res) => {
  
  // Clear session
  req.session.destroy(err => {
      if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
  });
});

async function init() {
  await client.connect();
  console.log('client connected')
  await createTables();
  console.log('tables created');
  const user = await register('testuser', '1234', 'admin@gmail.com', 'user')
  app.listen(3000, () => {
    console.log('The server is listening on port 3000!');
  });
}

init();