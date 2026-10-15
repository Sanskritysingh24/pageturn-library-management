import mongoose from "mongoose";
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  isbn: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, trim: true },
  totalCopies: { type: Number, required: true, min: 1, default: 1 },
  availableCopies: { type: Number, required: true, min: 0, default: 1 },
  shelf: { type: String, trim: true, default: "Unassigned" }
}, { timestamps: true });
export default mongoose.model("Book", bookSchema);
