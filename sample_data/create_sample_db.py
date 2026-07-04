"""
Creates sample_store.db — a small e-commerce SQLite database for testing Klean Data.
Run: python sample_data/create_sample_db.py
"""
import sqlite3, os, random
from datetime import date, timedelta

OUT = os.path.join(os.path.dirname(__file__), "sample_store.db")

conn = sqlite3.connect(OUT)
c = conn.cursor()

c.executescript("""
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  price       REAL    NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  city       TEXT,
  created_at TEXT
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  status      TEXT NOT NULL,
  total       REAL NOT NULL,
  created_at  TEXT
);

CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  qty        INTEGER NOT NULL,
  unit_price REAL    NOT NULL
);
""")

# Categories
cats = ["Electronics", "Clothing", "Books", "Home & Garden", "Sports"]
c.executemany("INSERT INTO categories(name) VALUES(?)", [(n,) for n in cats])

# Products
products = [
  ("iPhone 15 Case",      1, 19.99, 120),
  ("USB-C Hub 7-port",    1, 49.99,  55),
  ("Wireless Earbuds",    1, 89.99,  80),
  ("4K HDMI Cable",       1, 14.99, 200),
  ("Running T-Shirt",     2, 24.99, 150),
  ("Yoga Pants",          2, 39.99,  90),
  ("Winter Jacket",       2, 129.99, 40),
  ("Python Crash Course", 3, 29.99,  60),
  ("Clean Code",          3, 34.99,  45),
  ("The Pragmatic Prog",  3, 39.99,  30),
  ("Coffee Maker",        4, 59.99,  35),
  ("Desk Lamp LED",       4, 29.99,  75),
  ("Yoga Mat",            5, 34.99,  65),
  ("Water Bottle 1L",     5, 19.99, 180),
  ("Jump Rope",           5,  9.99,  95),
]
c.executemany("INSERT INTO products(name,category_id,price,stock) VALUES(?,?,?,?)", products)

# Customers
customers = [
  ("Alice Johnson", "alice@example.com", "New York"),
  ("Bob Smith",     "bob@example.com",   "Los Angeles"),
  ("Carol White",   "carol@example.com", "Chicago"),
  ("David Lee",     "david@example.com", "Houston"),
  ("Emma Davis",    "emma@example.com",  "Phoenix"),
  ("Frank Wilson",  "frank@example.com", "Philadelphia"),
  ("Grace Miller",  "grace@example.com", "San Antonio"),
  ("Henry Taylor",  "henry@example.com", "San Diego"),
  ("Iris Anderson", "iris@example.com",  "Dallas"),
  ("Jack Thomas",   "jack@example.com",  "San Jose"),
]
base_date = date(2024, 1, 1)
for i, (name, email, city) in enumerate(customers):
  joined = (base_date + timedelta(days=random.randint(0, 180))).isoformat()
  c.execute("INSERT INTO customers(name,email,city,created_at) VALUES(?,?,?,?)", (name, email, city, joined))

# Orders + items
statuses = ["completed", "completed", "completed", "pending", "shipped", "cancelled"]
random.seed(42)
order_id = 1
for cust_id in range(1, 11):
  num_orders = random.randint(2, 6)
  for _ in range(num_orders):
    order_date = (base_date + timedelta(days=random.randint(0, 360))).isoformat()
    status = random.choice(statuses)
    total = 0.0
    items = []
    for _ in range(random.randint(1, 4)):
      prod_id = random.randint(1, 15)
      qty = random.randint(1, 3)
      price = products[prod_id - 1][2]
      total += qty * price
      items.append((order_id, prod_id, qty, price))
    c.execute("INSERT INTO orders(id,customer_id,status,total,created_at) VALUES(?,?,?,?,?)",
              (order_id, cust_id, status, round(total, 2), order_date))
    c.executemany("INSERT INTO order_items(order_id,product_id,qty,unit_price) VALUES(?,?,?,?)", items)
    order_id += 1

conn.commit()
conn.close()
print(f"✓ Created {OUT}")
print("  Tables: categories, products, customers, orders, order_items")
print(f"  Rows:   {order_id-1} orders, {len(customers)} customers, {len(products)} products")
