/**
 * Prisma seed script.
 *
 * Creates:
 *  - A development user (for local testing without OAuth)
 *  - An Ethereal SMTP sender auto-generated or from env vars
 *
 * Run with: pnpm db:seed
 */

import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function getOrCreateEtherealAccount(): Promise<{
  host: string;
  port: number;
  user: string;
  pass: string;
}> {
  if (
    process.env.ETHEREAL_USER &&
    process.env.ETHEREAL_PASSWORD &&
    process.env.ETHEREAL_HOST
  ) {
    console.log("Using Ethereal credentials from environment variables.");
    return {
      host: process.env.ETHEREAL_HOST,
      port: parseInt(process.env.ETHEREAL_PORT ?? "587", 10),
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASSWORD,
    };
  }

  console.log("No Ethereal credentials found — auto-creating a test account...");
  const account = await nodemailer.createTestAccount();

  console.log("\n========================================");
  console.log("  Ethereal test account created!");
  console.log("  Add these to your .env file:");
  console.log("========================================");
  console.log(`  ETHEREAL_HOST=${account.smtp.host}`);
  console.log(`  ETHEREAL_PORT=${account.smtp.port}`);
  console.log(`  ETHEREAL_USER=${account.user}`);
  console.log(`  ETHEREAL_PASSWORD=${account.pass}`);
  console.log("========================================\n");

  return {
    host: account.smtp.host,
    port: account.smtp.port,
    user: account.user,
    pass: account.pass,
  };
}

async function main() {
  console.log("Starting database seed...");

  const ethereal = await getOrCreateEtherealAccount();

  // Create a seed/dev user (useful for testing without Google OAuth)
  const devUser = await prisma.user.upsert({
    where: { email: "dev@reachinbox.local" },
    update: {},
    create: {
      googleId: "dev-google-id-local",
      name: "Dev User",
      email: "dev@reachinbox.local",
      avatarUrl: null,
    },
  });

  console.log(`Upserted dev user: ${devUser.email} (id: ${devUser.id})`);

  // Create or update Ethereal sender linked to dev user
  const existingSender = await prisma.sender.findFirst({
    where: { userId: devUser.id, email: ethereal.user },
  });

  if (!existingSender) {
    const sender = await prisma.sender.create({
      data: {
        userId: devUser.id,
        email: ethereal.user,
        smtpHost: ethereal.host,
        smtpPort: ethereal.port,
        smtpUser: ethereal.user,
        smtpPassword: ethereal.pass,
      },
    });
    console.log(`Created Ethereal sender: ${sender.email} (id: ${sender.id})`);
  } else {
    await prisma.sender.update({
      where: { id: existingSender.id },
      data: {
        smtpHost: ethereal.host,
        smtpPort: ethereal.port,
        smtpUser: ethereal.user,
        smtpPassword: ethereal.pass,
      },
    });
    console.log(`Updated Ethereal sender: ${existingSender.email}`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
