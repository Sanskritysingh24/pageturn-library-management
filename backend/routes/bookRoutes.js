import { Router } from "express";
import mongoose from "mongoose";
import Book from "../models/Book.js";
import Transaction from "../models/Transaction.js";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q ? { $or: [
      { title: { $regex: q, $options: "i" } }, { author: { $regex: q, $options: "i" } },
      { isbn: { $regex: q, $options: "i" } }, { category: { $regex: q, $options: "i" } }
    ] } : {};
    res.json({ success: true, data: await Book.find(filter).sort({ createdAt: -1 }) });
  } catch (e) { next(e); }
});
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success:false, message:"Invalid book ID" });
    const item = await Book.findById(req.params.id);
    if (!item) return res.status(404).json({ success:false, message:"Book not found" });
    res.json({ success:true, data:item });
  } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { title, author, isbn, category, totalCopies, shelf } = req.body;
    if (![title, author, isbn, category].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ success:false, message:"Title, author, ISBN and category are required" });
    }
    const count = Number(totalCopies ?? 1);
    if (!Number.isInteger(count) || count < 1) return res.status(400).json({ success:false, message:"Total copies must be at least 1" });
    const item = await Book.create({ title, author, isbn, category, totalCopies:count, availableCopies:count, shelf });
    res.status(201).json({ success:true, data:item, message:"Book added successfully" });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success:false, message:"A book with this ISBN already exists" });
    next(e);
  }
});
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success:false, message:"Invalid book ID" });
    const item = await Book.findById(req.params.id);
    if (!item) return res.status(404).json({ success:false, message:"Book not found" });
    const { title, author, isbn, category, totalCopies, shelf } = req.body;
    for (const [key, value] of Object.entries({ title, author, isbn, category, shelf })) {
      if (value !== undefined) item[key] = value;
    }
    if (totalCopies !== undefined) {
      const n = Number(totalCopies);
      const currentlyIssued = item.totalCopies - item.availableCopies;
      if (!Number.isInteger(n) || n < currentlyIssued) return res.status(400).json({ success:false, message:"Total copies cannot be less than copies currently issued" });
      item.totalCopies = n; item.availableCopies = n - currentlyIssued;
    }
    await item.save();
    res.json({ success:true, data:item, message:"Book updated successfully" });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success:false, message:"ISBN is already in use" });
    next(e);
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success:false, message:"Invalid book ID" });
    const active = await Transaction.exists({ book:req.params.id, status:"issued" });
    if (active) return res.status(409).json({ success:false, message:"Cannot delete a book while copies are issued" });
    const item = await Book.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success:false, message:"Book not found" });
    res.json({ success:true, message:"Book deleted successfully" });
  } catch (e) { next(e); }
});
export default router;
