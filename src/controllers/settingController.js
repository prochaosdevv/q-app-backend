import Setting from "../models/setting.js";

// Create
export const createSettings = async (req, res) => {
  try {
    const existing = await Setting.findOne();
    if (existing) {
      return res.status(400).json({ message: 'Settings already exist' });
    }

    const {
      appName,
      appURL,
      desc,
      isMaintenanceMode = false,
      isUserAllowRegistration = true,
      address,
    } = req.body;

    const newSettings = new Setting({
      appName,
      appURL,
      desc,
      isMaintenanceMode,
      isUserAllowRegistration,
      address
    });

    await newSettings.save();

    res.status(201).json({ message: 'Settings created successfully', data: newSettings });
  } catch (error) {
    console.error('Create Settings Error:', error);
    res.status(500).json({ message: 'Server error while creating settings' });
  }
};

// Get
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings", error });
  }
};

// Update
export const updateSettings = async (req, res) => {
  try {
    const {
      appName,
      appURL,
      desc,
      isMaintenanceMode,
      isUserAllowRegistration,
      address
    } = req.body;

    const updatedSettings = await Setting.findOneAndUpdate(
      {},
      {
        $set: {
          appName,
          appURL,
          desc,
          isMaintenanceMode,
          isUserAllowRegistration,
          address
        },
      },
      {
        new: true,    
        upsert: true, 
      }
    );

    return res.status(200).json({
      message: "Settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


// Update Notification Settings (Separate API)
export const updateNotificationSettings = async (req, res) => {
  try {
    const { isNotifyNewUser, isNotifySubscriptionChange } = req.body;

    const updatedSetting = await Setting.findOneAndUpdate(
      {},
      {
        ...(typeof isNotifyNewUser === 'boolean' && { isNotifyNewUser }),
        ...(typeof isNotifySubscriptionChange === 'boolean' && { isNotifySubscriptionChange }),
      },
      { new: true,upsert: true, }
    );

    if (!updatedSetting) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.status(200).json({ message: "Notification settings updated", data: updatedSetting });
  } catch (error) {
    console.error("Notification Settings Update Error:", error);
    res.status(500).json({ message: "Failed to update notification settings", error });
  }
};

