import { Router } from "express";
import mongoose from "mongoose";
import Book from "../models/Book.js";
import Member from "../models/Member.js";
import Transaction from "../models/Transaction.js";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const items = await Transaction.find().populate("book", "title author isbn").populate("member", "name memberCode email").sort({ createdAt:-1 });
    res.json({ success:true, data:items });
  } catch (e) { next(e); }
});
router.post("/issue", async (req, res, next) => {
  try {
    const { bookId, memberId, dueDate } = req.body;
    if (!mongoose.isValidObjectId(bookId) || !mongoose.isValidObjectId(memberId)) return res.status(400).json({ success:false, message:"Select a valid book and member" });
    if (!dueDate || Number.isNaN(new Date(dueDate).getTime()) || new Date(dueDate) <= new Date()) return res.status(400).json({ success:false, message:"Due date must be in the future" });
    const [book, member] = await Promise.all([Book.findById(bookId), Member.findById(memberId)]);
    if (!book) return res.status(404).json({ success:false, message:"Book not found" });
    if (!member) return res.status(404).json({ success:false, message:"Member not found" });
    if (book.availableCopies < 1) return res.status(409).json({ success:false, message:"No copies are currently available" });
    book.availableCopies -= 1;
    await book.save();
    try {
      const transaction = await Transaction.create({ book:book._id, member:member._id, dueDate:new Date(dueDate) });
      await transaction.populate("book", "title author isbn");
      await transaction.populate("member", "name memberCode email");
      res.status(201).json({ success:true, data:transaction, message:"Book issued successfully" });
    } catch (error) {
      book.availableCopies += 1; await book.save(); throw error;
    }
  } catch (e) { next(e); }
});
router.patch("/:id/return", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success:false, message:"Invalid transaction ID" });
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success:false, message:"Transaction not found" });
    if (transaction.status === "returned") return res.status(409).json({ success:false, message:"This book has already been returned" });
    const book = await Book.findById(transaction.book);
    if (!book) return res.status(404).json({ success:false, message:"Book record not found" });
    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
    await book.save();
    transaction.status = "returned"; transaction.returnedAt = new Date();
    await transaction.save();
    await transaction.populate("book", "title author isbn");
    await transaction.populate("member", "name memberCode email");
    res.json({ success:true, data:transaction, message:"Book returned successfully" });
  } catch (e) { next(e); }
});
export default router;
