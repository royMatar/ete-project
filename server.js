require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists
const dir = './public/uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function(req, file, cb) {
        const filename = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        console.log("Saving file as:", filename);  // Debug: Check the generated filename
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type, only JPEG and PNG are allowed!"), false);
        }
    }
});

// MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Failed to connect to MySQL Database:', err);
        throw err;
    }
    console.log('Connected to MySQL Database');
});

app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

// GET /product/list
app.get('/product/list', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.error('Failed to retrieve products:', err);
            return res.status(500).send('Failed to retrieve products');
        }
        res.status(200).json(results);
    });
});

// POST /product/create
app.post('/product/create', upload.single('picture'), (req, res) => {
    console.log(req.file); // Debug: log file data
    const { name, email, store } = req.body;
    const picture = req.file ? 'public/uploads/' + req.file.filename : ''; // Use static path directly
    const sql = 'INSERT INTO products (name, email, store, picture) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, email, store, picture], (err, result) => {
        if (err) {
            console.error('Failed to create product:', err);
            return res.status(500).send('Failed to create product');
        }
        res.status(201).send('Product created');
    });
});



// PUT /product/update
app.put('/product/update', upload.single('picture'), (req, res) => {
    const { id, name, email, store } = req.body;
    const picture = req.file ? 'public/uploads/' + req.file.filename : req.body.picture; // Use existing or new picture
    const sql = 'UPDATE products SET name = ?, email = ?, store = ?, picture = ? WHERE id = ?';
    db.query(sql, [name, email, store, picture, id], (err, result) => {
        if (err) {
            console.error('Failed to update product:', err);
            return res.status(500).send('Failed to update product');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Product not found');
        }
        res.status(200).send('Product updated');
    });
});

// DELETE /product/delete
app.delete('/product/delete', (req, res) => {
    const { id } = req.body;
    const sql = 'DELETE FROM products WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Failed to delete product:', err);
            return res.status(500).send('Failed to delete product');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Product not found');
        }
        res.status(200).send('Product deleted');
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
