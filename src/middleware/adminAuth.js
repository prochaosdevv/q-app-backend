import jwt from "jsonwebtoken";

const verifyAdminToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(403).send({
        status: false,
        error: "You are not authenticated as admin.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).send({
      status: false,
      message: "Invalid admin token",
    });
  }
};

export default verifyAdminToken;
