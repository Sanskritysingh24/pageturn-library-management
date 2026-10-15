import mongoose from "mongoose";
const transactionSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  issuedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedAt: { type: Date, default: null },
  status: { type: String, enum: ["issued", "returned"], default: "issued" }
}, { timestamps: true });
export default mongoose.model("Transaction", transactionSchema);
