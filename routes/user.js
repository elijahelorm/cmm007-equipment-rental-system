// routes/user.js - USER ROUTES
// Handles equipment rental and returns

const express = require("express");
const router = express.Router();
const { protect, userOnly } = require("../middleware/auth");
const { pool } = require("../config/db");

// Apply authentication to ALL user routes
router.use(protect);
router.use(userOnly);

// USER DASHBOARD - Show available equipment and rentals
router.get("/dashboard", async (req, res) => {
  try {
    // Get available equipment (quantity > 0)
    const [availableEquipment] = await pool.query(`
            SELECT e.*, 
                   CASE 
                       WHEN e.available_quantity <= 0 THEN 'Out of Stock'
                       WHEN e.available_quantity <= 2 THEN 'Low Stock'
                       ELSE 'Available'
                   END as stock_status
            FROM equipment e
            WHERE e.available_quantity > 0
            ORDER BY e.created_at DESC
        `);

    // Get user's active rentals (not returned)
    const [activeRentals] = await pool.query(
      `
            SELECT r.*, 
                   e.name as equipment_name, 
                   e.serial_number,
                   e.condition_status,
                   DATEDIFF(r.due_date, CURDATE()) as days_remaining
            FROM rentals r
            JOIN equipment e ON r.equipment_id = e.equipment_id
            WHERE r.user_id = ? AND r.status = 'active'
            ORDER BY r.due_date ASC
        `,
      [req.user.user_id],
    );

    // Get user's rental history (returned items)
    const [rentalHistory] = await pool.query(
      `
            SELECT r.*, 
                   e.name as equipment_name, 
                   e.serial_number,
                   DATEDIFF(r.return_date, r.rental_date) as days_used
            FROM rentals r
            JOIN equipment e ON r.equipment_id = e.equipment_id
            WHERE r.user_id = ? AND r.status = 'returned'
            ORDER BY r.created_at DESC
            LIMIT 10
        `,
      [req.user.user_id],
    );

    // Get user's rental limit
    const [limit] = await pool.query(
      'SELECT max_items FROM rental_limits WHERE role = "user"',
    );
    const maxItems = parseInt(limit[0]?.max_items) || 5;

    // Get current rental count
    const activeCount = activeRentals.length;
    const canRentMore = activeCount < maxItems;

    // Get unique categories for filter dropdown
    const [categories] = await pool.query(
      "SELECT DISTINCT category FROM equipment WHERE available_quantity > 0 ORDER BY category",
    );

    // Get success/error messages from query params
    const success = req.query.success;
    const error = req.query.error;

    res.render("user/dashboard", {
      title: "User Dashboard",
      user: req.user,
      availableEquipment,
      activeRentals,
      rentalHistory,
      categories,
      maxItems,
      activeCount,
      canRentMore,
      success,
      error,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Server error");
  }
});

// SEARCH EQUIPMENT - AJAX endpoint for live search
router.get("/search", async (req, res) => {
  try {
    const { query, category, condition } = req.query;

    let sql = `
            SELECT e.*, 
                   CASE 
                       WHEN e.available_quantity <= 0 THEN 'Out of Stock'
                       WHEN e.available_quantity <= 2 THEN 'Low Stock'
                       ELSE 'Available'
                   END as stock_status
            FROM equipment e
            WHERE e.available_quantity > 0
        `;
    const params = [];

    if (query && query.trim() !== "") {
      sql += ` AND (e.name LIKE ? OR e.serial_number LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`);
    }

    if (category && category !== "all") {
      sql += ` AND e.category = ?`;
      params.push(category);
    }

    if (condition && condition !== "all") {
      sql += ` AND e.condition_status = ?`;
      params.push(condition);
    }

    sql += ` ORDER BY e.name ASC`;

    const [equipment] = await pool.query(sql, params);
    res.json({ success: true, equipment });
  } catch (error) {
    console.error("Search error:", error);
    res.json({ success: false, error: "Search failed" });
  }
});

// RENT EQUIPMENT
// RENT EQUIPMENT - DEBUG VERSION (shows what's happening)
router.post("/rent/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const equipmentId = req.params.id;
    const { duration, quantity } = req.body;
    const rentalDuration = parseInt(duration) || 7;
    const rentalQuantity = parseInt(quantity) || 1;

    console.log("===== RENT DEBUG =====");
    console.log("User ID:", req.user.user_id);
    console.log("Rental Quantity:", rentalQuantity);

    await connection.beginTransaction();

    // Check if equipment exists
    const [equipment] = await connection.query(
      "SELECT * FROM equipment WHERE equipment_id = ?",
      [equipmentId],
    );

    if (equipment.length === 0) {
      await connection.rollback();
      return res.redirect("/user/dashboard?error=Equipment not found");
    }

    const item = equipment[0];
    console.log("Equipment:", item.name);
    console.log("Available quantity:", item.available_quantity);

    // Check available quantity
    if (item.available_quantity < rentalQuantity) {
      await connection.rollback();
      return res.redirect(
        `/user/dashboard?error=Only ${item.available_quantity} item(s) available`,
      );
    }

    // Get current total rented items
    const [activeRentals] = await connection.query(
      'SELECT SUM(quantity_rented) as total FROM rentals WHERE user_id = ? AND status = "active"',
      [req.user.user_id],
    );

    console.log("Active rentals query result:", activeRentals);

    const [limit] = await connection.query(
      'SELECT max_items FROM rental_limits WHERE role = "user"',
    );
    const maxItems = parseInt(limit[0]?.max_items) || 5; 
    const currentTotalItems = parseInt(activeRentals[0]?.total) || 0; 

    console.log("Current total items rented:", currentTotalItems);
    console.log("Max items allowed:", maxItems);
    console.log("New total if rented:", currentTotalItems + rentalQuantity);
    console.log(
      "Will this exceed limit?",
      currentTotalItems + rentalQuantity > maxItems,
    );

    // ONLY BLOCK if EXCEEDING the limit
    if (currentTotalItems + rentalQuantity > maxItems) {
      await connection.rollback();
      const canRent = maxItems - currentTotalItems;
      console.log("BLOCKING - cannot rent!");
      return res.redirect(
        `/user/dashboard?error=Limit reached! You have ${currentTotalItems} of ${maxItems} items. You can only rent ${canRent} more.`,
      );
    }

    console.log("ALLOWING - proceeding with rental...");

    // IF WE GET HERE - RENTAL IS ALLOWED
    const rentalDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + rentalDuration);

    const formattedRentalDate = rentalDate.toISOString().split("T")[0];
    const formattedDueDate = dueDate.toISOString().split("T")[0];

    await connection.query(
      `INSERT INTO rentals 
       (user_id, equipment_id, quantity_rented, rental_date, due_date, status) 
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [
        req.user.user_id,
        equipmentId,
        rentalQuantity,
        formattedRentalDate,
        formattedDueDate,
      ],
    );

    await connection.query(
      "UPDATE equipment SET available_quantity = available_quantity - ? WHERE equipment_id = ?",
      [rentalQuantity, equipmentId],
    );

    await connection.commit();

    console.log("RENTAL SUCCESSFUL!");
    res.redirect(
      "/user/dashboard?success=Rented successfully! Due: " + formattedDueDate,
    );
  } catch (error) {
    await connection.rollback();
    console.error("Rent error:", error);
    res.redirect("/user/dashboard?error=Failed to rent equipment");
  } finally {
    connection.release();
  }
});

// RETURN EQUIPMENT
router.post("/return/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const rentalId = req.params.id;

    await connection.beginTransaction();

    // Get rental details
    const [rental] = await connection.query(
      "SELECT * FROM rentals WHERE rental_id = ? AND user_id = ?",
      [rentalId, req.user.user_id],
    );

    if (rental.length === 0) {
      await connection.rollback();
      return res.redirect("/user/dashboard?error=Rental not found");
    }

    const rentalRecord = rental[0];

    if (rentalRecord.status === "returned") {
      await connection.rollback();
      return res.redirect("/user/dashboard?error=Equipment already returned");
    }

    // Check if overdue
    const today = new Date();
    const dueDate = new Date(rentalRecord.due_date);
    const isOverdue = today > dueDate;

    // Update rental record
    const returnDate = today.toISOString().split("T")[0];
    await connection.query(
      'UPDATE rentals SET return_date = ?, status = "returned" WHERE rental_id = ?',
      [returnDate, rentalId],
    );

    // Update equipment available quantity
    await connection.query(
      "UPDATE equipment SET available_quantity = available_quantity + ? WHERE equipment_id = ?",
      [rentalRecord.quantity_rented, rentalRecord.equipment_id],
    );

    // Log to rental history
    const overdueNote = isOverdue ? " (Returned late)" : "";
    await connection.query(
      `INSERT INTO rental_history (rental_id, user_id, equipment_id, action, notes)
             VALUES (?, ?, ?, 'returned', ?)`,
      [
        rentalId,
        req.user.user_id,
        rentalRecord.equipment_id,
        `Returned ${rentalRecord.quantity_rented} item(s)${overdueNote}`,
      ],
    );

    await connection.commit();

    const message = isOverdue
      ? "Equipment returned (overdue)!"
      : "Equipment returned successfully!";
    res.redirect("/user/dashboard?success=" + message);
  } catch (error) {
    await connection.rollback();
    console.error("Return error:", error);
    res.redirect("/user/dashboard?error=Failed to return equipment");
  } finally {
    connection.release();
  }
});

// MY RENTALS PAGE - View all rentals

router.get("/my-rentals", async (req, res) => {
  try {
    // Get all user rentals (active and history)
    const [allRentals] = await pool.query(
      `
            SELECT r.*, 
                   e.name as equipment_name, 
                   e.serial_number,
                   e.category,
                   CASE 
                       WHEN r.status = 'active' AND r.due_date < CURDATE() THEN 'overdue'
                       ELSE r.status
                   END as current_status,
                   DATEDIFF(r.due_date, CURDATE()) as days_remaining
            FROM rentals r
            JOIN equipment e ON r.equipment_id = e.equipment_id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `,
      [req.user.user_id],
    );

    res.render("user/my-rentals", {
      title: "My Rentals",
      user: req.user,
      rentals: allRentals,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error("My rentals error:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
