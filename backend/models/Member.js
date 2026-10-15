import mongoose from "mongoose";
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  memberCode: { type: String, required: true, unique: true, trim: true },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });
export default mongoose.model("Member", memberSchema);
