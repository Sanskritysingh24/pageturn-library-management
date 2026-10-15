import { Router } from "express";
import mongoose from "mongoose";
import Member from "../models/Member.js";
import Transaction from "../models/Transaction.js";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q ? { $or: [
      { name: { $regex:q, $options:"i" } }, { email: { $regex:q, $options:"i" } },
      { memberCode: { $regex:q, $options:"i" } }
    ] } : {};
    res.json({ success:true, data:await Member.find(filter).sort({ createdAt:-1 }) });
  } catch (e) { next(e); }
});
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success:false, message:"Invalid member ID" });
    const item = await Member.findById(req.params.id);
    if (!item) return res.status(404).json({ success:false, message:"Member not found" });
    res.json({ success:true, data:item });
  } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { name, email, phone, memberCode } = req.body;
    if (![name,email,memberCode].every(v => typeof v === "string" && v.trim())) return res.status(400).json({ success:false, message:"Name, email and member code are required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success:false, message:"Enter a valid email address" });
    const item = await Member.create({ name, email, phone, memberCode });
    res.status(201).json({ success:true, data:item, message:"Member registered successfully" });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success:false, message:"Email or member code already exists" });
    next(e);
  }
});
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success:false, message:"Invalid member ID" });
    const item = await Member.findById(req.params.id);
    if (!item) return res.status(404).json({ success:false, message:"Member not found" });
    for (const key of ["name","email","phone","memberCode"]) if (req.body[key] !== undefined) item[key] = req.body[key];
    await item.save();
    res.json({ success:true, data:item, message:"Member updated successfully" });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success:false, message:"Email or member code already exists" });
    next(e);
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success:false, message:"Invalid member ID" });
    if (await Transaction.exists({ member:req.params.id, status:"issued" })) return res.status(409).json({ success:false, message:"Cannot delete a member with an active issue" });
    const item = await Member.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success:false, message:"Member not found" });
    res.json({ success:true, message:"Member deleted successfully" });
  } catch (e) { next(e); }
});
export default router;
