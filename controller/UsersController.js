import users from "../models/UsersModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { BUILDER_FLOOR_ADMIN, CHANNEL_PARTNER, SALES_USER } from "../const.js";

const filePath = "./data.json";
const JWT_SECERET = "techHelps";
const salt = await bcrypt.genSalt();

export const USER_ROLE = {
  [BUILDER_FLOOR_ADMIN]: "BuilderFloorAdmin",
  [CHANNEL_PARTNER]: "ChannelPartner",
  [SALES_USER]: "PropertyDealer",
};

const Edit_update = async (req, res) => {
  const { _id, password, ...data } = req.body;

  try {
    if (_id) {
      // If _id is present, update the existing user
      const existingUser = await users.findById(_id);

      if (!existingUser) {
        return res.status(404).json({ error: "User not found." });
      }

      // Check if the password is provided for update
      if (password) {
        // Hash the provided password before saving it to the database
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.password = hashedPassword;
      }

      // Update other user data
      existingUser.set(data);

      // Save the updated user to the database
      await existingUser.save();
      return res.json(existingUser);
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new users({ ...data, password: hashedPassword });

      await newUser.save();

      return res.json(newUser);
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to save the user." });
  }
};

const getusersList = async (req, res, next) => {
  try {
    let page = Number(req.query.page) || 1;
    console.log("it is here");
    const limit = Number(req.query.limit) || 10;

    let skip = (page - 1) * limit;

    let data = await users.find().skip(skip).limit(limit);

    const totalDocuments = await users.countDocuments();
    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(200).json({
      data,
      nbHits: data.length,
      pageNumber: page,
      totalPages: totalPages,
      totalItems: totalDocuments,
    });
  } catch (error) {
    res.status(400).json({ messgae: error.message });
  }
};

const getAdminUsersList = async (req, res, next) => {
  try {
    const id = req.query.id || "";
    console.log(id);
    let page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    let skip = (page - 1) * limit;
    const query = { parentId: id };
    let data = await users.find(query).skip(skip).limit(limit);

    const totalDocuments = await users.countDocuments();
    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(200).json({
      data,
      nbHits: data.length,
      pageNumber: page,
      totalPages: totalPages,
      totalItems: totalDocuments,
    });
  } catch (error) {
    res.status(400).json({ messgae: error.message });
  }
};

const filterUsers = async (req, res, next) => {
  try {
    const filter = req.query.filter;

    const filteredUsers = await users.find();

    if (filter.email && filter.email.length > 0) {
      filteredUsers = filteredUsers.filter((users) =>
        filter.email.includes(users.email)
      );
    }

    if (filter.phoneNumber && filter.phoneNumber.length > 0) {
      filteredUsers = filteredUsers.filter((users) =>
        filter.phoneNumber.includes(users.phoneNumber)
      );
    }

    if (filter.name && filter.name.length > 0) {
      filteredUsers = filteredUsers.filter((users) =>
        filter.name.includes(users.name)
      );
    }
    res.status(200).json({ filteredUsers });
  } catch (error) {
    res.status(400).json({ messgae: "An error Occoured" });
  }
};

const updateEditUsers = async (req, res, next) => {
  try {
    let id = req.body._id;
    const hashedPassword = await bcrypt.hash(req.body.password || "123", 10);
    const dataToSave = {
      name: req.body.name,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      address: req.body.address,
      companyName: req.body.companyName,
      companyAddress: req.body.companyAddress,
      state: req.body.state,
      city: req.body.city,
      role: req.body.role,
      parentId:
        req.body.role === USER_ROLE[BUILDER_FLOOR_ADMINs]
          ? "Approved"
          : req.body.parentId, // password: hashedPassword,
      password: req.body.password,
    };
    let data = await users.findOne({ _id: req.body._id });

    if (data) {
      const updatedData = await users.findByIdAndUpdate(id, {
        $set: dataToSave,
      });
      return res.status(200).json({ messgae: "users updated" });
    }
    const newUser = new users(dataToSave);
    await newUser.save();
    res.send({ message: "New Users Stored." });
  } catch (error) {
    console.log(error);
    res.status(400).json({ messgae: "An error Occoured", error });
  }
};

const getusersById = async (req, res, next) => {
  try {
    let id = req.query.id;
    let data = await users.findById(id);
    res.status(200).json({ data });
  } catch (err) {
    res.status(400).json({ messgae: err.message });
  }
};

const login = async (req, res) => {
  try {
    let success = false;
    const { email, password } = req.body;
    let user = await users.findOne({ email, password });
    if (!user) {
      return res.status(400).json({
        error: "Please try to login with correct credentials",
      });
    }

    const data = {
      user: {
        id: user.id,
      },
    };
    const authToken = jwt.sign(data, JWT_SECERET);
    // res.json(user);
    const profile = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      parentId: user.parentId,
    };
    res.json({ authToken, profile });
  } catch (err) {
    res.status(400).json({ messgae: err.message });
  }
};

const deleteusersById = async (req, res, next) => {
  try {
    const id = req.query.id;
    const deletedUser = await users.findByIdAndRemove(id);
    if (!deletedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ message: "User deleted", deletedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const handleSignup = async (req, res) => {
  try {
    // Find the user in the database by email
    const user = await users.findOne({ email: req.body.email });

    // If the user already exists, return an error
    if (user && user.isVerified) {
      return res.status(409).send({ message: "User already exists." });
    }

    // Generate a new OTP if the user exists but is not verified
    let otp;
    if (user && !user.isVerified) {
      await user.save();
    } else {
      // Create a new user in the database
      const hashedPassword = await bcrypt.hash(req.body.password || "123", 10);
      const newUser = new users({
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        role: req.body.role,
        parentId: req.body.parentId,
        password: hashedPassword,
      });
      await newUser.save();
    }
    // Create a new user in the databas
    res.send({ message: "Sign Up succesfully." });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "error occured" });
  }
};

const handleVerifyOTP = async (req, res) => {
  try {
    const user = await users.findOne({ email: req.session.email });

    if (!user) {
      return res.status(401).send({ message: "User not found." });
    }

    if (req.body.otp === req.session.otp) {
      delete req.session.otp;
      delete req.session.email;

      user.isVerified = true;
      await user.save();

      const token = jwt.sign({ userId: user._id }, JWT_SECERET);

      res.send({ token });
    } else {
      res.status(401).send({ message: "Invalid OTP." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error verifying OTP." });
  }
};

const getusersChildren = async (req, res, next) => {
  try {
    const userId = req.query.id;
    const users = await Users.find({ Parentid: userId });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getChannelPartnersList = async (req, res, next) => {
  try {
    console.log(req.query);
    let page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    let skip = (page - 1) * limit;

    let data = await users
      .find({ role: "ChannelPartner" })
      .skip(skip)
      .limit(limit);

    const totalDocuments = await users.countDocuments({
      role: "ChannelPartner",
    });
    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(200).json({
      data,
      nbHits: data.length,
      pageNumber: page,
      totalPages: totalPages,
      totalItems: totalDocuments,
    });
  } catch (error) {
    res.status(400).json({ messgae: error.message });
  }
};

export default {
  getusersList,
  getAdminUsersList,
  handleSignup,
  handleVerifyOTP,
  getusersById,
  deleteusersById,
  updateEditUsers,
  getusersChildren,
  login,
  filterUsers,
  Edit_update,
  getChannelPartnersList,
};
