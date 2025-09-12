// This file contains controllers for user-related operations.

const User = require('../models/User');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving users', error: error.message });
    }
};

// Get a single user by ID
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving user', error: error.message });
    }
};

// Create a new user
exports.createUser = async (req, res) => {
    try {
        const savedUser = await User.create(req.body);
        res.status(201).json(savedUser);
    } catch (error) {
        res.status(400).json({ message: 'Error creating user', error: error.message });
    }
};

// Update a user by ID
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    try {
        const [updated] = await User.update(req.body, {
            where: { id },
            returning: true
        });
        if (!updated) {
            return res.status(404).json({ message: 'User not found' });
        }
        const updatedUser = await User.findByPk(id);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user', error: error.message });
    }
};

// Delete a user by ID
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await User.destroy({
            where: { id }
        });
        if (!deleted) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};