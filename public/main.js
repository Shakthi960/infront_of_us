// ================= CONFIG =================
const API_BASE = "https://your-api.azurewebsites.net"; // change after Azure deploy

// ================= MOBILE MENU =================
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger) {
        hamburger.onclick = () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        };
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = () => {
            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
        };
    });

    AuthService.updateUI();
    CartService.updateCartUI();
});

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(express.json({ limit: '50kb' })); // set small limit
// Rate limit for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many attempts, try later.' });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS - restrict to frontend
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5500'];
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not ' + 'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));


app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Basic validation
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash, purchasedCourses: [] });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});


// ================= AUTH SERVICE =================
class AuthService {

    static getToken() {
        return localStorage.getItem('userToken');
    }

    static getUser() {
        return JSON.parse(localStorage.getItem('userData') || "null");
    }

    static isLoggedIn() {
        return !!this.getToken();
    }

    static async login(email, password) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) throw new Error("Invalid email or password");

        const data = await res.json();
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("userData", JSON.stringify(data.user));
        this.updateUI();
    }

    static async register(name, email, password) {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        if (!res.ok) throw new Error("Registration failed");

        const data = await res.json();
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("userData", JSON.stringify(data.user));
        this.updateUI();
    }

    static logout() {
        localStorage.clear();
        window.location.href = "index.html";
    }

    static updateUI() {
        const userProfile = document.getElementById("userProfile");
        const loginBtn = document.getElementById("loginBtn");
        const user = this.getUser();

        if (this.isLoggedIn() && user) {
            userProfile.style.display = "flex";
            loginBtn.style.display = "none";
            document.getElementById("userName").textContent = user.name;
            document.getElementById("userAvatar").textContent = user.name[0].toUpperCase();
        } else {
            if (userProfile) userProfile.style.display = "none";
            if (loginBtn) loginBtn.style.display = "block";
        }
    }
}

// ================= CART SERVICE =================
class CartService {

    static getCart() {
        return JSON.parse(localStorage.getItem("cart")) || [];
    }

    static saveCart(cart) {
        localStorage.setItem("cart", JSON.stringify(cart));
        this.updateCartUI();
    }

    static addToCart(course) {
        const cart = this.getCart();
        if (!cart.find(c => c.id === course.id)) {
            cart.push(course);
            this.saveCart(cart);
        }
    }

    static removeFromCart(id) {
        const cart = this.getCart().filter(c => c.id !== id);
        this.saveCart(cart);
    }

    static clearCart() {
        localStorage.removeItem("cart");
        this.updateCartUI();
    }

    static getCartTotal() {
        return this.getCart().reduce((sum, c) => sum + c.price, 0);
    }

    static updateCartUI() {
        const cartCount = document.getElementById("cartCount");
        if (cartCount) cartCount.textContent = this.getCart().length;
    }
}

// ================= LOGIN MODAL HANDLER =================
document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const modal = document.getElementById("loginModal");

    if (loginForm) {
        loginForm.onsubmit = async e => {
            e.preventDefault();
            try {
                await AuthService.login(
                    document.getElementById("email").value,
                    document.getElementById("password").value
                );
                modal.style.display = "none";
            } catch (err) {
                alert(err.message);
            }
        };
    }

    if (registerForm) {
        registerForm.onsubmit = async e => {
            e.preventDefault();
            try {
                await AuthService.register(
                    document.getElementById("reg-name").value,
                    document.getElementById("reg-email").value,
                    document.getElementById("reg-password").value
                );
                modal.style.display = "none";
            } catch (err) {
                alert(err.message);
            }
        };
    }

});

app.post('/api/payment/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (signature === expected) {
    // process event (payment.captured, refund, etc.)
    res.status(200).send('ok');
  } else {
    res.status(400).send('invalid signature');
  }
});

