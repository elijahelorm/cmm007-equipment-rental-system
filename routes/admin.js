// routes/admin.js - ADMIN ROUTES
// Handles equipment and user management (CRUD)

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/db');

// Apply authentication to ALL admin routes
router.use(protect);
router.use(adminOnly);

// ============================================
// ADMIN DASHBOARD - Show statistics
// URL: /admin/dashboard
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        // Get equipment statistics
        const [equipmentStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_equipment,
                SUM(CASE WHEN available_quantity > 0 THEN 1 ELSE 0 END) as available_items,
                SUM(CASE WHEN available_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(total_quantity) as total_units,
                SUM(available_quantity) as available_units
            FROM equipment
        `);
        
        // Get user statistics
        const [userStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users
            FROM users
        `);
        
        // Get rental statistics
        const [rentalStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_rentals,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_rentals,
                SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_rentals,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as completed_rentals
            FROM rentals
        `);
        
        // Get recent rentals
        const [recentRentals] = await pool.query(`
            SELECT r.*, 
                   u.full_name as user_name,
                   e.name as equipment_name
            FROM rentals r
            JOIN users u ON r.user_id = u.user_id
            JOIN equipment e ON r.equipment_id = e.equipment_id
            ORDER BY r.created_at DESC
            LIMIT 5
        `);
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.user,
            stats: {
                equipment: equipmentStats[0],
                users: userStats[0],
                rentals: rentalStats[0]
            },
            recentRentals: recentRentals
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Server error');
    }
});


// EQUIPMENT MANAGEMENT (CRUD)

// READ - View all equipment
router.get('/equipment', async (req, res) => {
    try {
        const [equipment] = await pool.query(`
            SELECT e.*, u.full_name as added_by_name
            FROM equipment e
            LEFT JOIN users u ON e.added_by = u.user_id
            ORDER BY e.created_at DESC
        `);
        
        // Get unique categories for filter dropdown
        const [categories] = await pool.query(
            'SELECT DISTINCT category FROM equipment ORDER BY category'
        );
        
        res.render('admin/equipment', {
            title: 'Manage Equipment',
            user: req.user,
            equipment: equipment,
            categories: categories,
            success: req.query.success,
            error: req.query.error
        });
        
    } catch (error) {
        console.error('Equipment view error:', error);
        res.status(500).send('Server error');
    }
});

// CREATE - Add new equipment
router.post('/equipment/add', async (req, res) => {
    try {
        const { name, category, serial_number, condition_status, total_quantity } = req.body;
        
        // Validate input
        if (!name || !category || !serial_number) {
            return res.redirect('/admin/equipment?error=All fields are required');
        }
        
        // Check if serial number already exists
        const [existing] = await pool.query(
            'SELECT equipment_id FROM equipment WHERE serial_number = ?',
            [serial_number]
        );
        
        if (existing.length > 0) {
            return res.redirect('/admin/equipment?error=Serial number already exists');
        }
        
        // Insert new equipment
        await pool.query(
            `INSERT INTO equipment 
             (name, category, serial_number, condition_status, total_quantity, available_quantity, added_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, category, serial_number, condition_status, total_quantity, total_quantity, req.user.user_id]
        );
        
        res.redirect('/admin/equipment?success=Equipment added successfully');
        
    } catch (error) {
        console.error('Add equipment error:', error);
        res.redirect('/admin/equipment?error=Failed to add equipment');
    }
});

// UPDATE - Edit equipment form
router.get('/equipment/edit/:id', async (req, res) => {
    try {
        const [equipment] = await pool.query(
            'SELECT * FROM equipment WHERE equipment_id = ?',
            [req.params.id]
        );
        
        if (equipment.length === 0) {
            return res.redirect('/admin/equipment?error=Equipment not found');
        }
        
        const [categories] = await pool.query(
            'SELECT DISTINCT category FROM equipment ORDER BY category'
        );
        
        res.render('admin/equipment-edit', {
            title: 'Edit Equipment',
            user: req.user,
            equipment: equipment[0],
            categories: categories
        });
        
    } catch (error) {
        console.error('Edit equipment error:', error);
        res.redirect('/admin/equipment?error=Failed to load equipment');
    }
});

// UPDATE - Process equipment update
router.post('/equipment/update/:id', async (req, res) => {
    try {
        const { name, category, serial_number, condition_status, total_quantity } = req.body;
        const equipmentId = req.params.id;
        
        // Get current equipment to calculate quantity difference
        const [current] = await pool.query(
            'SELECT total_quantity, available_quantity FROM equipment WHERE equipment_id = ?',
            [equipmentId]
        );
        
        if (current.length === 0) {
            return res.redirect('/admin/equipment?error=Equipment not found');
        }
        
        const quantityDiff = parseInt(total_quantity) - current[0].total_quantity;
        const newAvailableQuantity = current[0].available_quantity + quantityDiff;
        
        // Update equipment
        await pool.query(
            `UPDATE equipment 
             SET name = ?, category = ?, serial_number = ?, 
                 condition_status = ?, total_quantity = ?, available_quantity = ?
             WHERE equipment_id = ?`,
            [name, category, serial_number, condition_status, total_quantity, newAvailableQuantity, equipmentId]
        );
        
        res.redirect('/admin/equipment?success=Equipment updated successfully');
        
    } catch (error) {
        console.error('Update equipment error:', error);
        res.redirect('/admin/equipment?error=Failed to update equipment');
    }
});

// DELETE - Remove equipment
router.get('/equipment/delete/:id', async (req, res) => {
    try {
        // Check if equipment has active rentals
        const [activeRentals] = await pool.query(
            'SELECT * FROM rentals WHERE equipment_id = ? AND status = "active"',
            [req.params.id]
        );
        
        if (activeRentals.length > 0) {
            return res.redirect('/admin/equipment?error=Cannot delete - equipment is currently rented');
        }
        
        // Delete equipment
        await pool.query('DELETE FROM equipment WHERE equipment_id = ?', [req.params.id]);
        
        res.redirect('/admin/equipment?success=Equipment deleted successfully');
        
    } catch (error) {
        console.error('Delete equipment error:', error);
        res.redirect('/admin/equipment?error=Failed to delete equipment');
    }
});


// USER MANAGEMENT (CRUD)
// READ - View all users

router.get('/users', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.*, 
                   COUNT(r.rental_id) as total_rentals
            FROM users u
            LEFT JOIN rentals r ON u.user_id = r.user_id
            GROUP BY u.user_id
            ORDER BY u.created_at DESC
        `);
        
        res.render('admin/users', {
            title: 'Manage Users',
            user: req.user,
            users: users,
            success: req.query.success,
            error: req.query.error
        });
        
    } catch (error) {
        console.error('Users view error:', error);
        res.status(500).send('Server error');
    }
});

// CREATE - Add new user (by admin)
router.post('/users/add', async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;
        const bcrypt = require('bcryptjs');
        
        // Check if email exists
        const [existing] = await pool.query(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.redirect('/admin/users?error=Email already exists');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        await pool.query(
            'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
            [full_name, email, hashedPassword, role]
        );
        
        res.redirect('/admin/users?success=User added successfully');
        
    } catch (error) {
        console.error('Add user error:', error);
        res.redirect('/admin/users?error=Failed to add user');
    }
});

// UPDATE - Change user role
// URL: POST /admin/users/role/:id
router.post('/users/role/:id', async (req, res) => {
    try {
        const { role } = req.body;
        const userId = req.params.id;
        
        // Don't allow changing your own role
        if (userId == req.user.user_id) {
            return res.redirect('/admin/users?error=Cannot change your own role');
        }
        
        await pool.query(
            'UPDATE users SET role = ? WHERE user_id = ?',
            [role, userId]
        );
        
        res.redirect('/admin/users?success=User role updated');
        
    } catch (error) {
        console.error('Update role error:', error);
        res.redirect('/admin/users?error=Failed to update role');
    }
});

// DELETE - Remove user
router.get('/users/delete/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Don't allow deleting yourself
        if (userId == req.user.user_id) {
            return res.redirect('/admin/users?error=Cannot delete your own account');
        }
        
        // Check if user has active rentals
        const [activeRentals] = await pool.query(
            'SELECT * FROM rentals WHERE user_id = ? AND status = "active"',
            [userId]
        );
        
        if (activeRentals.length > 0) {
            return res.redirect('/admin/users?error=Cannot delete - user has active rentals');
        }
        
        // Delete user (rentals will be deleted by CASCADE)
        await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
        
        res.redirect('/admin/users?success=User deleted successfully');
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.redirect('/admin/users?error=Failed to delete user');
    }
});

module.exports = router;