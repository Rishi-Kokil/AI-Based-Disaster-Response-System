import mongoose from "mongoose";

const CrewSchema = new mongoose.Schema({
  crewId: String,
  latitude: Number,
  longitude: Number,
  status: String,
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("CrewLocation", CrewSchema);
