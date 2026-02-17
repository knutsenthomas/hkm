# Hostinger Database Integration Guide

This guide explains how you can integrate Hostinger's built-in database (MySQL/MariaDB) with your website if you choose to move away from Firebase.

## Options for Database Usage

### 1. Using a PHP Backend (Recommended for Hostinger)
Hostinger supports PHP natively. You can create a `/api` folder with PHP scripts that connect to your Hostinger MySQL database.

```php
// example connect.php
$conn = new mysqli("localhost", "u123456789_user", "password", "u123456789_db");
```

### 2. Standard Static Site + External API
Keep the current Vite project as is, but instead of calling `firebaseService`, you can use `fetch()` to call your PHP scripts on Hostinger.

## How to set up on Hostinger

1. **Create Database**: Go to your Hostinger Panel -> Databases -> MySQL Databases.
2. **Create User**: Add a user and assign them to the database.
3. **Note Credentials**: You will need the Database Name, Username, and Password.
4. **Environment Variables**: For security, never hardcode these in your frontend. Use a backend script (like PHP) to handle the connection.

## Why stay with Firebase for now?
*   **Real-time updates**: Firebase handles real-time data sync automatically.
*   **No Backend Needed**: You don't need to write PHP or Node.js backend code.
*   **Complexity**: Migrating existing content from Firestore to MySQL requires a data migration script.

> [!TIP]
> If you want to use the Hostinger database for something specific (like a contact form log or a simple member list), I can help you set up specific PHP endpoints for that while keeping the rest on Firebase.
