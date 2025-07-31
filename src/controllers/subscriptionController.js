import SubscriptionPlan from "../models/subscriptionPlan.js";

// Create a new subscription plan
export const createPlan = async (req, res) => {
  try {
    const {
      planName,
      desc,
      status,
      monthlyPrice,
      yearlyPrice,
      feature,
    } = req.body;

    const newPlan = new SubscriptionPlan({
      planName,
      desc,
      status,
      monthlyPrice,
      yearlyPrice,
      feature,
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);
  } catch (error) {
    console.error("Create Plan Error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// Get all subscription plans
export const getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
    res.status(200).json(plans);
  } catch (error) {
    console.error("Get All Plans Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get a plan by ID
export const getPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message || "Error fetching plan." });
  }
};

// Update a plan by ID
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planName,
      desc,
      status,
      monthlyPrice,
      yearlyPrice,
      feature,
    } = req.body;

    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
      id,
      {
        planName,
        desc,
        status,
        monthlyPrice,
        yearlyPrice,
        feature,
      },
      { new: true, runValidators: true }
    );

    if (!updatedPlan) return res.status(404).json({ error: "Plan not found" });
    res.status(200).json(updatedPlan);
  } catch (error) {
    console.error("Update Plan Error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// Delete a plan by ID
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPlan = await SubscriptionPlan.findByIdAndDelete(id);
    if (!deletedPlan) return res.status(404).json({ error: "Plan not found" });
    res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Delete Plan Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
