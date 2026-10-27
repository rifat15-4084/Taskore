import "./load-env";

import mongoose from "mongoose";
import dbConnect from "../src/lib/db";
import User from "../src/models/User";
import bcrypt from "bcryptjs";

async function seed() {
  await dbConnect();

  const name = process.env.SEED_ADMIN_NAME;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "FAIL: SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD must be set in .env.local"
    );
    process.exit(1);
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await User.findOne({ email: normalizedEmail }).select(
      "+passwordHash"
    );

    let result: "Created" | "Updated";

    if (existing) {
      existing.name = name;
      existing.passwordHash = passwordHash;
      existing.role = "admin";
      existing.isActive = true;
      await existing.save();
      result = "Updated";
    } else {
      await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        isActive: true,
      });
      result = "Created";
    }

    console.log(`SUCCESS: ${result} admin user ${normalizedEmail}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err: unknown) {
    console.error("FAIL: Could not seed admin user");
    if (err instanceof Error) {
      console.error(err.stack || err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

seed().catch((err: unknown) => {
  console.error("FAIL: Unexpected error");
  if (err instanceof Error) {
    console.error(err.stack || err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});
