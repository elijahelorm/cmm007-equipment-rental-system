# Equipment Rental Management System

A full-stack web application for managing equipment rentals with role-based access control (Admin/User), complete CRUD operations, and real-time inventory management.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.x-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Overview

This system allows businesses to manage their equipment inventory efficiently. Administrators can manage equipment and users, while regular users can search, rent, and return equipment with real-time availability updates.

---

## Features

### Authentication
- Secure login with JWT tokens
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- Session management

### Admin Panel
- **Dashboard** - Real-time statistics and charts
- **Equipment Management** - Add, edit, delete equipment
- **User Management** - Manage user accounts and roles
- **Rental Limits** - Configure max items per user

### User Panel
- **Search & Filter** - Find equipment by name, category, or condition
- **Rent Equipment** - Choose quantity and duration (3/7/14/30 days)
- **Return Equipment** - One-click return with inventory update
- **Rental History** - View past and active rentals
- **Due Date Tracking** - See days remaining for rentals

### Database
- Relational database with foreign key constraints
- Transaction management for data integrity
- Audit trail via rental_history table

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Backend | Node.js, Express.js |
| Database | MySQL |
| Frontend | HTML5, CSS3, JavaScript, EJS |
| Authentication | JWT, bcryptjs |
| Styling | Custom CSS with responsive design |
| Fonts | Google Fonts (Poppins & Lato) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [XAMPP](https://www.apachefriends.org/) (for MySQL)
- [Git](https://git-scm.com/)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/equipment-rental-system.git
cd equipment-rental-system
```

2. Install dependencies
```
npm install
```
4. Set up the database
```
. Start XAMPP and enable MySQL
. Open phpMyAdmin at http://localhost/phpmyadmin
. Create database: equipment_rental
. Import the schema from database
```
6. Create a .env file
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=equipment_rental
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
```
7. Run the app
```
npm run dev
```
8. Open your browser
```
Go to http://localhost:3000
```

## Default Login
| Role | Email | Passowrd |
|----------|------------|-------------|
| Admin | admin@example.com | Admin@123 |
| User | Register a new account | - |


## Project Structure
```
equipment-rental-system/
├── config/
│   └── db.js              # Database connection
├── middleware/
│   └── auth.js            # Authentication middleware
├── models/
│   ├── User.js            # User model
│   ├── Equipment.js       # Equipment model
│   ├── Rental.js          # Rental model
│   └── RentalLimit.js     # Limits model
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── admin.js           # Admin routes
│   └── user.js            # User routes
├── views/
│   ├── login.ejs          # Login page
│   ├── admin/
│   │   ├── dashboard.ejs
│   │   ├── equipment.ejs
│   │   └── users.ejs
│   └── user/
│       ├── dashboard.ejs
│       └── my-rentals.ejs
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
├── database/
│   └── schema.sql         # Database schema
├── server.js              # Entry point
├── .env                   # Environment variables
├── .gitignore             # Git ignore file
├── package.json           # Dependencies
└── README.md              # Documentation
```

## AI Declaration
This project was developed as part of the CMM007 - Intranet Systems Development module at Robert Gordon University.

### Generative AI Usage:

- Ideation: System architecture and database design planning
- Editing: Code error resolution and debugging assistance
- Reference: Syntax checking and best practices
Tools used: ChatGPT / Claude


## Author
### Elijah Elorm Adzigblie 
CMM007 - Intranet Systems Development
Robert Gordon University
Academic Year: 2025-2026

## Acknowledgments
-Module Coordinator: Janaka Senanayake
- RGU Study Skills Support
-Express.js & MySQL documentation
