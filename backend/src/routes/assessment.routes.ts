// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const assessmentService = require('../services/AssessmentService');

const router = express.Router();

// All assessment routes are protected by authentication
// Some routes require specific roles

// Get all assessments (student, instructor, admin)
router.get('/', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get All Assessments Request ===');
        console.log('User:', req.user);
        
        const filters = {
            department: req.query.department,
            status: req.query.status
        };
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey as string) : null;
        
        const result = await assessmentService.getAllAssessments(filters, limit, lastKey);
        res.status(200).json({
            success: true,
            data: result.items,
            lastKey: result.lastKey,
        });
    } catch (error: any) {
        console.error('Error fetching assessments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessments'
        });
    }
});

// Get assessment by ID (student, instructor, admin)
router.get('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get Assessment By ID Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);
        
        const { id } = req.params;
        const result = await assessmentService.getAssessmentById(id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error fetching assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessment'
        });
    }
});

// Create a new assessment (no role restrictions)
router.post('/', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Create Assessment Request ===');
        console.log('User:', req.user);
        console.log('Body:', req.body);
        
        const assessmentData = req.body;
        const createdBy = req.user.username || req.user.sub;
        
        const result = await assessmentService.createAssessment(assessmentData, createdBy);
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error creating assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create assessment'
        });
    }
});

// Update an assessment (no role restrictions)
router.put('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Update Assessment Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);
        console.log('Body:', req.body);
        
        const { id } = req.params;
        const assessmentData = req.body;
        const updatedBy = req.user.username || req.user.sub;
        
        const result = await assessmentService.updateAssessment(id, assessmentData, updatedBy);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error updating assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update assessment'
        });
    }
});

// Delete an assessment (no role restrictions)
router.delete('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Delete Assessment Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);
        
        const { id } = req.params;
        await assessmentService.deleteAssessment(id);
        res.status(200).json({
            success: true,
            message: 'Assessment deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete assessment'
        });
    }
});

module.exports = router;