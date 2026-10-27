import "./load-env";

import mongoose from "mongoose";

async function check() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("FAIL: MONGODB_URI is not set in environment");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { bufferCommands: false });
    console.log("SUCCESS: Connected to MongoDB");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err: unknown) {
    console.error("FAIL: Could not connect to MongoDB");
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

check();
