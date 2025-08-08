import express from "express";
import {createNewUser, deleteUserById, editNewUser, getAllUsers, getRecentUsers } from "../controllers/user.controller.js";
import { createPlan, deletePlan, getAllPlans, getPlanById, updatePlan } from "../controllers/subscriptionController.js";
import verifyAdminToken from "../middleware/adminAuth.js";
import { getAdminProfile, getUserGrowthData, loginAdmin, registerAdmin, updateAdminPassword } from "../controllers/adminController.js";
import { createSettings, getSettings, updateNotificationSettings, updateSettings } from "../controllers/settingController.js";
import { getAllTransactions } from "../controllers/transactionController.js";

const router = express.Router();

//admin
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.put("/update-password", verifyAdminToken, updateAdminPassword);
router.get("/get/me", verifyAdminToken, getAdminProfile);



// user 
router.post("/create/user", createNewUser);
router.get("/get-user", getAllUsers);
router.get("/get/user/growth-data", getUserGrowthData);
router.get("/get/recent/user", getRecentUsers);
router.put("/update/user/:id", editNewUser);
router.delete("/delete/by/:id", deleteUserById);

// // plan 
router.post('/create/plan', createPlan);
router.get('/get/all/plan', getAllPlans);
router.get('/get/plan/:id', getPlanById);
router.put('/update/plan/:id', updatePlan);
router.delete('/delete/plan/:id', deletePlan);

//setting
router.post('/create/setting', createSettings);
router.get('/get/setting', getSettings);
router.put('/update/setting', updateSettings);
router.put('/update/notification-setting', updateNotificationSettings);


router.get("/get/all/transaction", getAllTransactions);



export default router;
